import db from '../database.js';
import { createSavingsGoal } from './savingsGoals.js';

export interface SuggestedSavingsGoal {
  name: string;
  target_amount: number;
  target_date: string | null;
  category: string | null;
  description: string;
  reason: string;
}

/**
 * Analyze transactions and suggest savings goals based on spending patterns
 * @param dateRange Optional date range to analyze (from uploaded statement)
 */
export function suggestSavingsGoalsFromTransactions(dateRange?: { start: string; end: string }): SuggestedSavingsGoal[] {
  const suggestions: SuggestedSavingsGoal[] = [];
  
  // Determine date range for analysis
  let startDate: string;
  if (dateRange) {
    startDate = dateRange.start;
  } else {
    // Default: analyze last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().split('T')[0];
  }
  
  const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
  
  // Get total income and expenses
  const income = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ?
  `).get(startDate, endDate) as { total: number };
  
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' AND date >= ? AND date <= ?
  `).get(startDate, endDate) as { total: number };
  
  const netSavings = income.total - expenses.total;
  
  // Calculate monthly averages
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const daysDiff = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));
  const monthsDiff = daysDiff / 30;
  
  const monthlyIncome = income.total / Math.max(0.5, monthsDiff);
  const monthlyExpenses = expenses.total / Math.max(0.5, monthsDiff);
  const monthlySavings = monthlyIncome - monthlyExpenses;
  
  // 1. Emergency Fund Goal (3-6 months expenses)
  if (monthlyExpenses > 0) {
    const emergencyFundTarget = Math.ceil(monthlyExpenses * 6 / 1000) * 1000; // Round to nearest $1000
    if (emergencyFundTarget >= 1000) {
      suggestions.push({
        name: 'Emergency Fund',
        target_amount: emergencyFundTarget,
        target_date: null, // No specific date
        category: null,
        description: 'Build an emergency fund to cover 6 months of expenses',
        reason: `Based on your monthly expenses of $${monthlyExpenses.toFixed(2)}, a 6-month emergency fund would be $${emergencyFundTarget.toFixed(2)}`
      });
    }
  }
  
  // 2. Monthly Savings Goal (if positive savings rate)
  if (monthlySavings > 0) {
    const monthlySavingsGoal = Math.ceil(monthlySavings * 1.2 / 100) * 100; // 20% more than current, round to nearest $100
    if (monthlySavingsGoal >= 100) {
      suggestions.push({
        name: 'Monthly Savings Target',
        target_amount: monthlySavingsGoal,
        target_date: null,
        category: null,
        description: `Save $${monthlySavingsGoal.toFixed(2)} per month`,
        reason: `You're currently saving $${monthlySavings.toFixed(2)}/month. Aim for $${monthlySavingsGoal.toFixed(2)} to build savings faster`
      });
    }
  }
  
  // 3. Category-specific savings goals (reduce spending in high categories)
  const spendingByCategory = db.prepare(`
    SELECT
      category,
      SUM(amount) as total_spent,
      COUNT(*) as transaction_count,
      AVG(amount) as avg_amount
    FROM transactions
    WHERE type = 'expense'
      AND date >= ?
      AND date <= ?
      AND category IS NOT NULL
      AND category != ''
      AND category != 'Other'
      AND category != 'Income'
    GROUP BY category
    HAVING total_spent > 0
    ORDER BY total_spent DESC
    LIMIT 5
  `).all(startDate, endDate) as Array<{
    category: string;
    total_spent: number;
    transaction_count: number;
    avg_amount: number;
  }>;
  
  for (const spending of spendingByCategory) {
    const monthlyCategorySpending = spending.total_spent / Math.max(0.5, monthsDiff);
    
    // Suggest reducing spending by 10-20% and saving that amount
    const reductionTarget = Math.ceil(monthlyCategorySpending * 0.15 / 50) * 50; // 15% reduction, round to nearest $50
    
    if (reductionTarget >= 50 && monthlyCategorySpending > 200) {
      // Suggest saving the reduction amount for 3 months
      const savingsTarget = reductionTarget * 3;
      
      suggestions.push({
        name: `Reduce ${spending.category} Spending`,
        target_amount: savingsTarget,
        target_date: null,
        category: spending.category,
        description: `Save $${reductionTarget.toFixed(2)}/month by reducing ${spending.category} spending`,
        reason: `You spend $${monthlyCategorySpending.toFixed(2)}/month on ${spending.category}. Reducing by 15% could save $${reductionTarget.toFixed(2)}/month`
      });
    }
  }
  
  // 4. Annual savings goal (if positive monthly savings)
  if (monthlySavings > 0) {
    const annualSavingsGoal = Math.ceil(monthlySavings * 12 / 1000) * 1000; // Round to nearest $1000
    if (annualSavingsGoal >= 1000) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      
      suggestions.push({
        name: 'Annual Savings Goal',
        target_amount: annualSavingsGoal,
        target_date: nextYear.toISOString().split('T')[0],
        category: null,
        description: `Save $${annualSavingsGoal.toFixed(2)} over the next year`,
        reason: `Based on your current savings rate of $${monthlySavings.toFixed(2)}/month, you could save $${annualSavingsGoal.toFixed(2)} in a year`
      });
    }
  }
  
  // 5. Debt reduction goal (if expenses exceed income)
  if (monthlyExpenses > monthlyIncome && monthlyExpenses > 0) {
    const debtAmount = monthlyExpenses - monthlyIncome;
    const debtReductionGoal = Math.ceil(debtAmount * 6 / 100) * 100; // 6 months of debt, round to nearest $100
    
    if (debtReductionGoal >= 100) {
      suggestions.push({
        name: 'Debt Reduction Goal',
        target_amount: debtReductionGoal,
        target_date: null,
        category: null,
        description: `Reduce debt by $${debtReductionGoal.toFixed(2)}`,
        reason: `Your expenses exceed income by $${debtAmount.toFixed(2)}/month. Focus on reducing spending to eliminate debt`
      });
    }
  }
  
  return suggestions;
}

/**
 * Create suggested savings goals in the database
 * @param dateRange Optional date range from uploaded statement
 * Returns the created goals
 */
export function createSuggestedSavingsGoals(dateRange?: { start: string; end: string }): Array<any> {
  const suggestions = suggestSavingsGoalsFromTransactions(dateRange);
  const created: Array<any> = [];
  
  // Get existing goals to avoid duplicates
  const existingGoals = db.prepare('SELECT name FROM savings_goals WHERE is_completed = 0').all() as Array<{ name: string }>;
  const existingGoalNames = new Set(existingGoals.map(g => g.name.toLowerCase()));
  
  for (const suggestion of suggestions) {
    // Skip if similar goal already exists
    if (existingGoalNames.has(suggestion.name.toLowerCase())) {
      continue;
    }
    
    // Create goal
    const goal = createSavingsGoal({
      name: suggestion.name,
      target_amount: suggestion.target_amount,
      target_date: suggestion.target_date,
      category: suggestion.category,
      description: suggestion.description
    });
    
    created.push({
      ...goal,
      reason: suggestion.reason
    });
  }
  
  return created;
}

