import express from 'express';
import { getUserProgress, getUnlockedAchievements, setAvatar } from '../services/gamification.js';
import db from '../database.js';

const router = express.Router();

// Get user progress
router.get('/progress', (req, res) => {
  try {
    const progress = getUserProgress();
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get unlocked achievements
router.get('/achievements', (req, res) => {
  try {
    const achievements = getUnlockedAchievements();
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available achievements
router.get('/achievements/all', (req, res) => {
  try {
    const achievements = db.prepare('SELECT * FROM achievements ORDER BY points DESC').all();
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set avatar
router.post('/avatar', (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ error: 'Avatar is required' });
    }
    setAvatar(avatar);
    res.json({ message: 'Avatar updated', avatar });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get spending statistics
router.get('/stats', (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;
    
    // Default to current month if no dates provided
    let dateFilter = '';
    const params: any[] = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (period === 'all') {
      // Show all time - no date filter
      dateFilter = '';
    } else {
      // Default: current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      dateFilter = 'WHERE date >= ? AND date <= ?';
      params.push(startOfMonth, endOfMonth);
    }
    
    // Total income - use actual transactions only
    const incomeQuery = dateFilter 
      ? `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?`
      : `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'`;
    const income = db.prepare(incomeQuery).get(...(dateFilter ? params : [])) as { total: number };
    
    // Total expenses - use actual transactions only
    const expensesQuery = dateFilter
      ? `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?`
      : `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`;
    const expenses = db.prepare(expensesQuery).get(...(dateFilter ? params : [])) as { total: number };
    
    // Expenses by category - use actual transactions only
    const categoryQuery = dateFilter
      ? `SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ? AND category IS NOT NULL AND category != '' GROUP BY category ORDER BY total DESC`
      : `SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND category IS NOT NULL AND category != '' GROUP BY category ORDER BY total DESC`;
    const expensesByCategory = db.prepare(categoryQuery).all(...(dateFilter ? params : [])) as Array<{ category: string; total: number }>;
    
    // Transaction count - use actual transactions only
    const countQuery = dateFilter
      ? `SELECT COUNT(*) as count FROM transactions ${dateFilter}`
      : `SELECT COUNT(*) as count FROM transactions`;
    const count = db.prepare(countQuery).get(...params) as { count: number };
    
    res.json({
      income: income.total || 0,
      expenses: expenses.total || 0,
      net: (income.total || 0) - (expenses.total || 0),
      expensesByCategory: expensesByCategory || [],
      transactionCount: count.count || 0
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

