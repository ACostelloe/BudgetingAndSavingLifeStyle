import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { updateTotalSaved, addPoints } from './gamification.js';

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category: string | null;
  description: string | null;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new savings goal
 */
export function createSavingsGoal(data: {
  name: string;
  target_amount: number;
  target_date?: string | null;
  category?: string | null;
  description?: string | null;
}): SavingsGoal {
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date, category, description)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.target_amount,
    data.target_date || null,
    data.category || null,
    data.description || null
  );
  
  return db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as SavingsGoal;
}

/**
 * Update savings goal progress
 * Automatically calculates progress from transactions and budgets
 */
export function updateSavingsGoalProgress(goalId: string): SavingsGoal | null {
  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(goalId) as SavingsGoal | null;
  
  if (!goal) return null;
  
  let currentAmount = 0;
  
  // Calculate savings from income minus expenses
  // If goal has a category, only count savings from that category's budget surplus
  if (goal.category) {
    // Get budget for this category
    const budget = db.prepare('SELECT * FROM budgets WHERE category = ? ORDER BY created_at DESC LIMIT 1').get(goal.category) as any;
    
    if (budget) {
      const expenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE category = ? AND type = 'expense' AND date >= ? AND (? IS NULL OR date <= ?)
      `).get(budget.category, budget.start_date, budget.end_date, budget.end_date) as { spent: number };
      
      const surplus = Math.max(0, budget.amount - expenses.spent);
      currentAmount = surplus;
    }
  } else {
    // Overall savings goal - calculate from net income
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const income = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'income' AND date >= ? AND date <= ?
    `).get(startOfMonth, endOfMonth) as { total: number };
    
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'expense' AND date >= ? AND date <= ?
    `).get(startOfMonth, endOfMonth) as { total: number };
    
    currentAmount = Math.max(0, income.total - expenses.total);
  }
  
  const isCompleted = currentAmount >= goal.target_amount ? 1 : 0;
  
  db.prepare(`
    UPDATE savings_goals
    SET current_amount = ?,
        is_completed = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(currentAmount, isCompleted, goalId);
  
  // Award points for completing goal
  if (isCompleted === 1 && goal.is_completed === 0) {
    const points = Math.floor(goal.target_amount / 10); // 1 point per $10 saved
    addPoints(points);
    updateTotalSaved(goal.target_amount);
  }
  
  return db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(goalId) as SavingsGoal;
}

/**
 * Get all savings goals with progress
 */
export function getAllSavingsGoals(): Array<SavingsGoal & { progress: number; daysRemaining: number | null }> {
  const goals = db.prepare('SELECT * FROM savings_goals ORDER BY created_at DESC').all() as SavingsGoal[];
  
  return goals.map(goal => {
    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    
    let daysRemaining: number | null = null;
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Update progress
    updateSavingsGoalProgress(goal.id);
    
    return {
      ...goal,
      progress: Math.min(100, progress),
      daysRemaining
    };
  });
}

