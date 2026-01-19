import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export interface SuggestedBudget {
  category: string;
  amount: number;
  period: 'monthly';
  start_date: string;
  end_date: string | null;
}

/**
 * Analyze transactions and suggest budgets based on spending patterns
 * Only creates budgets for categories that don't already have budgets
 * @param dateRange Optional date range to analyze (from uploaded statement)
 */
export function suggestBudgetsFromTransactions(dateRange?: { start: string; end: string }): SuggestedBudget[] {
  // Get all existing budgets to avoid duplicates
  const existingBudgets = db.prepare('SELECT DISTINCT category FROM budgets').all() as Array<{ category: string }>;
  const existingCategories = new Set(existingBudgets.map(b => b.category.toLowerCase()));
  
  // Determine date range for analysis
  let startDate: string;
  if (dateRange) {
    // Use provided date range (from uploaded statement)
    startDate = dateRange.start;
  } else {
    // Default: analyze last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().split('T')[0];
  }
  
  const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
  
  // Get spending by category (exclude "Other" and "Income")
  const spendingByCategory = db.prepare(`
    SELECT 
      category,
      COUNT(*) as transaction_count,
      SUM(amount) as total_spent,
      AVG(amount) as avg_amount,
      MIN(date) as first_transaction,
      MAX(date) as last_transaction
    FROM transactions
    WHERE type = 'expense' 
      AND date >= ?
      AND date <= ?
      AND category IS NOT NULL
      AND category != ''
      AND category != 'Other'
      AND category != 'Income'
    GROUP BY category
    HAVING transaction_count >= 2 AND total_spent > 0
    ORDER BY total_spent DESC
  `).all(startDate, endDate) as Array<{
    category: string;
    transaction_count: number;
    total_spent: number;
    avg_amount: number;
    first_transaction: string;
    last_transaction: string;
  }>;
  
  const suggestions: SuggestedBudget[] = [];
  const now = new Date();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  
  for (const spending of spendingByCategory) {
    // Skip if budget already exists for this category
    if (existingCategories.has(spending.category.toLowerCase())) {
      continue;
    }
    
    // Calculate monthly average based on actual date range
    const firstDate = new Date(spending.first_transaction);
    const lastDate = new Date(spending.last_transaction);
    const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    const monthsDiff = daysDiff / 30;
    
    // Calculate monthly average
    let monthlyAverage: number;
    if (monthsDiff < 0.5) {
      // Less than 2 weeks - use daily average * 30
      const dailyAverage = spending.total_spent / Math.max(1, daysDiff);
      monthlyAverage = dailyAverage * 30;
    } else if (monthsDiff < 1) {
      // Less than a month - extrapolate
      monthlyAverage = spending.total_spent / monthsDiff;
    } else {
      // One month or more - use average
      monthlyAverage = spending.total_spent / monthsDiff;
    }
    
    // Set budget at 110% of average to allow some flexibility but encourage savings
    // Round to nearest $10, minimum $20
    const suggestedAmount = Math.max(20, Math.ceil(monthlyAverage * 1.1 / 10) * 10);
    
    // Only suggest budgets for categories with meaningful spending (exclude "Other")
    if (suggestedAmount >= 10 && spending.transaction_count >= 2 && spending.category !== 'Other') {
      suggestions.push({
        category: spending.category,
        amount: suggestedAmount,
        period: 'monthly',
        start_date: startOfNextMonth.toISOString().split('T')[0],
        end_date: endOfNextMonth.toISOString().split('T')[0]
      });
    }
  }
  
  return suggestions;
}

/**
 * Create suggested budgets in the database
 * @param dateRange Optional date range from uploaded statement
 * Returns the created budgets
 */
export function createSuggestedBudgets(dateRange?: { start: string; end: string }): Array<any> {
  const suggestions = suggestBudgetsFromTransactions(dateRange);
  const created: Array<any> = [];
  
  for (const suggestion of suggestions) {
    // Check if budget already exists (double-check)
    const existing = db.prepare('SELECT * FROM budgets WHERE category = ? AND period = ?').get(
      suggestion.category,
      suggestion.period
    );
    
    if (existing) {
      continue;
    }
    
    // Create budget
    const id = uuidv4();
    db.prepare(`
      INSERT INTO budgets (id, category, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      suggestion.category,
      suggestion.amount,
      suggestion.period,
      suggestion.start_date,
      suggestion.end_date
    );
    
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
    if (budget) {
      created.push(budget);
    }
  }
  
  // Also suggest overall budget if one doesn't exist
  const existingOverall = db.prepare('SELECT * FROM overall_budget ORDER BY created_at DESC LIMIT 1').get();
  if (!existingOverall && dateRange) {
    // Calculate total spending in the date range (exclude "Other" category)
    const totalSpending = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'expense' 
        AND date >= ? 
        AND date <= ?
        AND category != 'Other'
    `).get(dateRange.start, dateRange.end) as { total: number };
    
    if (totalSpending.total > 0) {
      // Calculate monthly average
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const monthsDiff = daysDiff / 30;
      
      let monthlyAverage: number;
      if (monthsDiff < 0.5) {
        const dailyAverage = totalSpending.total / daysDiff;
        monthlyAverage = dailyAverage * 30;
      } else {
        monthlyAverage = totalSpending.total / monthsDiff;
      }
      
      // Set overall budget at 110% of average
      const suggestedAmount = Math.max(100, Math.ceil(monthlyAverage * 1.1 / 10) * 10);
      
      const now = new Date();
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const id = uuidv4();
      db.prepare(`
        INSERT INTO overall_budget (id, amount, period, start_date, end_date)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        suggestedAmount,
        'monthly',
        startOfNextMonth.toISOString().split('T')[0],
        endOfNextMonth.toISOString().split('T')[0]
      );
      
      const overallBudget = db.prepare('SELECT * FROM overall_budget WHERE id = ?').get(id);
      if (overallBudget) {
        created.push({ ...overallBudget, isOverall: true });
      }
    }
  }
  
  return created;
}

