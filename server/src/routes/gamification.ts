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
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params: any[] = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }
    
    // Total income
    const incomeQuery = dateFilter 
      ? `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' ${dateFilter}`
      : `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'`;
    const income = db.prepare(incomeQuery).get(...params) as { total: number };
    
    // Total expenses
    const expensesQuery = dateFilter
      ? `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' ${dateFilter}`
      : `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`;
    const expenses = db.prepare(expensesQuery).get(...params) as { total: number };
    
    // Expenses by category
    const categoryQuery = dateFilter
      ? `SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' ${dateFilter} GROUP BY category ORDER BY total DESC`
      : `SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' GROUP BY category ORDER BY total DESC`;
    const expensesByCategory = db.prepare(categoryQuery).all(...params);
    
    // Transaction count
    const countQuery = dateFilter
      ? `SELECT COUNT(*) as count FROM transactions ${dateFilter}`
      : `SELECT COUNT(*) as count FROM transactions`;
    const count = db.prepare(countQuery).get(...params) as { count: number };
    
    res.json({
      income: income.total,
      expenses: expenses.total,
      net: income.total - expenses.total,
      expensesByCategory,
      transactionCount: count.count
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

