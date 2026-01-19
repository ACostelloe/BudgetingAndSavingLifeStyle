import db from '../database.js';

export interface CategoryInsight {
  category: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageOfTotal: number;
  recommendations: string[];
}

export interface SpendingAnalysis {
  totalExpenses: number;
  categoryInsights: CategoryInsight[];
  topCategories: Array<{ category: string; amount: number }>;
  overspendingCategories: Array<{ category: string; budget: number; spent: number; over: number }>;
  savingsOpportunities: Array<{ category: string; potentialSavings: number; reason: string }>;
}

/**
 * Analyze spending patterns and provide insights
 */
export function analyzeSpending(dateRange?: { start: string; end: string }): SpendingAnalysis {
  const startDate = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
  
  // Get total expenses
  const totalExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' AND date >= ? AND date <= ?
  `).get(startDate, endDate) as { total: number };
  
  // Get spending by category
  const categorySpending = db.prepare(`
    SELECT 
      category,
      COUNT(*) as transaction_count,
      SUM(amount) as total_spent,
      AVG(amount) as avg_amount
    FROM transactions
    WHERE type = 'expense' 
      AND date >= ? 
      AND date <= ?
      AND category IS NOT NULL
      AND category != ''
    GROUP BY category
    ORDER BY total_spent DESC
  `).all(startDate, endDate) as Array<{
    category: string;
    transaction_count: number;
    total_spent: number;
    avg_amount: number;
  }>;
  
  // Get previous period for trend analysis
  const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const prevStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prevEndDate = startDate;
  
  const prevCategorySpending = db.prepare(`
    SELECT 
      category,
      SUM(amount) as total_spent
    FROM transactions
    WHERE type = 'expense' 
      AND date >= ? 
      AND date <= ?
      AND category IS NOT NULL
      AND category != ''
    GROUP BY category
  `).all(prevStartDate, prevEndDate) as Array<{
    category: string;
    total_spent: number;
  }>;
  
  const prevSpendingMap = new Map(prevCategorySpending.map(c => [c.category, c.total_spent]));
  
  // Build insights
  const categoryInsights: CategoryInsight[] = categorySpending.map(cat => {
    const prevSpent = prevSpendingMap.get(cat.category) || 0;
    const change = prevSpent > 0 ? ((cat.total_spent - prevSpent) / prevSpent) * 100 : 0;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
    
    const recommendations: string[] = [];
    
    if (trend === 'increasing') {
      recommendations.push(`Spending increased by ${change.toFixed(0)}% - consider reviewing recent transactions`);
    }
    
    if (cat.avg_amount > 100) {
      recommendations.push(`High average transaction size ($${cat.avg_amount.toFixed(2)}) - look for bulk purchase opportunities`);
    }
    
    if (cat.transaction_count > 20) {
      recommendations.push(`Many small transactions (${cat.transaction_count}) - consider consolidating purchases`);
    }
    
    return {
      category: cat.category,
      totalSpent: cat.total_spent,
      transactionCount: cat.transaction_count,
      averageTransaction: cat.avg_amount,
      trend,
      percentageOfTotal: (cat.total_spent / totalExpenses.total) * 100,
      recommendations
    };
  });
  
  // Get top categories
  const topCategories = categorySpending.slice(0, 5).map(c => ({
    category: c.category,
    amount: c.total_spent
  }));
  
  // Check for overspending
  const budgets = db.prepare('SELECT * FROM budgets').all() as Array<{
    id: string;
    category: string;
    amount: number;
    start_date: string;
    end_date: string | null;
  }>;
  
  const overspendingCategories: Array<{ category: string; budget: number; spent: number; over: number }> = [];
  
  for (const budget of budgets) {
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as spent
      FROM transactions
      WHERE category = ? AND type = 'expense' AND date >= ? AND (? IS NULL OR date <= ?)
    `).get(budget.category, budget.start_date, budget.end_date, budget.end_date) as { spent: number };
    
    if (expenses.spent > budget.amount) {
      overspendingCategories.push({
        category: budget.category,
        budget: budget.amount,
        spent: expenses.spent,
        over: expenses.spent - budget.amount
      });
    }
  }
  
  // Identify savings opportunities
  const savingsOpportunities: Array<{ category: string; potentialSavings: number; reason: string }> = [];
  
  for (const insight of categoryInsights) {
    if (insight.trend === 'increasing' && insight.totalSpent > 200) {
      const potentialSavings = insight.totalSpent * 0.1; // 10% reduction opportunity
      savingsOpportunities.push({
        category: insight.category,
        potentialSavings,
        reason: `Recent spending increase - reducing by 10% could save $${potentialSavings.toFixed(2)}`
      });
    }
    
    if (insight.transactionCount > 15 && insight.averageTransaction < 20) {
      const potentialSavings = insight.totalSpent * 0.15; // 15% reduction for many small transactions
      savingsOpportunities.push({
        category: insight.category,
        potentialSavings,
        reason: `Many small transactions - consolidating could save $${potentialSavings.toFixed(2)}`
      });
    }
  }
  
  return {
    totalExpenses: totalExpenses.total,
    categoryInsights,
    topCategories,
    overspendingCategories,
    savingsOpportunities: savingsOpportunities.slice(0, 5) // Top 5 opportunities
  };
}

