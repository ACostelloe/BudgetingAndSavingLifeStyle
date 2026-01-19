import express from 'express';
import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all budgets with compliance (based on actual transactions)
router.get('/', (req, res) => {
  try {
    const budgets = db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all() as Array<any>;
    
    // Calculate compliance for each budget based on actual transactions
    const budgetsWithCompliance = budgets.map(budget => {
      const startDate = budget.start_date;
      const endDate = budget.end_date || new Date().toISOString().split('T')[0];
      
      const expenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE category = ? AND type = 'expense' AND date >= ? AND date <= ?
      `).get(budget.category, startDate, endDate) as { spent: number };
      
      const spent = expenses.spent || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      
      return {
        ...budget,
        compliance: {
          budget: budget.amount,
          spent,
          remaining,
          percentage: Math.min(100, percentage),
          isOverBudget: spent > budget.amount
        }
      };
    });
    
    res.json(budgetsWithCompliance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget by ID
router.get('/:id', (req, res) => {
  try {
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create budget
router.post('/', (req, res) => {
  try {
    const { category, amount, period, start_date, end_date } = req.body;
    
    if (!category || amount === undefined || !period || !start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO budgets (id, category, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, category, amount, period, start_date, end_date || null);
    
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
    res.status(201).json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update budget
router.put('/:id', (req, res) => {
  try {
    const { category, amount, period, start_date, end_date } = req.body;
    
    const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    db.prepare(`
      UPDATE budgets
      SET category = COALESCE(?, category),
          amount = COALESCE(?, amount),
          period = COALESCE(?, period),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(category, amount, period, start_date, end_date, req.params.id);
    
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    res.json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete budget
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget compliance (spending vs budget)
router.get('/:id/compliance', (req, res) => {
  try {
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id) as any;
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const startDate = budget.start_date;
    const endDate = budget.end_date || new Date().toISOString().split('T')[0];
    
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE category = ? AND type = 'expense' AND date >= ? AND date <= ?
    `).get(budget.category, startDate, endDate) as { total: number };
    
    const spent = expenses.total;
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    
    res.json({
      budget: budget.amount,
      spent,
      remaining,
      percentage: Math.min(100, percentage),
      isOverBudget: spent > budget.amount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Overall Budget endpoints
// Get overall budget
router.get('/overall', (req, res) => {
  try {
    const overall = db.prepare('SELECT * FROM overall_budget ORDER BY created_at DESC LIMIT 1').get() as any;
    
    if (!overall) {
      return res.json(null);
    }
    
    // Calculate compliance
    const startDate = overall.start_date;
    const endDate = overall.end_date || new Date().toISOString().split('T')[0];
    
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'expense' AND date >= ? AND date <= ?
    `).get(startDate, endDate) as { total: number };
    
    const spent = expenses.total;
    const remaining = overall.amount - spent;
    const percentage = (spent / overall.amount) * 100;
    
    res.json({
      ...overall,
      compliance: {
        budget: overall.amount,
        spent,
        remaining,
        percentage: Math.min(100, percentage),
        isOverBudget: spent > overall.amount
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set overall budget
router.post('/overall', (req, res) => {
  try {
    const { amount, period, start_date, end_date } = req.body;
    
    if (amount === undefined || !start_date) {
      return res.status(400).json({ error: 'Missing required fields: amount and start_date' });
    }
    
    // Delete existing overall budget
    db.prepare('DELETE FROM overall_budget').run();
    
    // Create new overall budget
    const id = uuidv4();
    db.prepare(`
      INSERT INTO overall_budget (id, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, amount, period || 'monthly', start_date, end_date || null);
    
    const overall = db.prepare('SELECT * FROM overall_budget WHERE id = ?').get(id);
    
    // Calculate compliance
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'expense' AND date >= ? AND date <= ?
    `).get(start_date, end_date || new Date().toISOString().split('T')[0]) as { total: number };
    
    const spent = expenses.total;
    const remaining = amount - spent;
    const percentage = (spent / amount) * 100;
    
    res.status(201).json({
      ...overall,
      compliance: {
        budget: amount,
        spent,
        remaining,
        percentage: Math.min(100, percentage),
        isOverBudget: spent > amount
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update overall budget
router.put('/overall', (req, res) => {
  try {
    const { amount, period, start_date, end_date } = req.body;
    
    const existing = db.prepare('SELECT * FROM overall_budget ORDER BY created_at DESC LIMIT 1').get() as any;
    if (!existing) {
      return res.status(404).json({ error: 'Overall budget not found. Create one first.' });
    }
    
    db.prepare(`
      UPDATE overall_budget
      SET amount = COALESCE(?, amount),
          period = COALESCE(?, period),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(amount, period, start_date, end_date, existing.id);
    
    const updated = db.prepare('SELECT * FROM overall_budget WHERE id = ?').get(existing.id);
    
    // Calculate compliance
    const finalStartDate = start_date || existing.start_date;
    const finalEndDate = end_date || existing.end_date || new Date().toISOString().split('T')[0];
    const finalAmount = amount || existing.amount;
    
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'expense' AND date >= ? AND date <= ?
    `).get(finalStartDate, finalEndDate) as { total: number };
    
    const spent = expenses.total;
    const remaining = finalAmount - spent;
    const percentage = (spent / finalAmount) * 100;
    
    res.json({
      ...updated,
      compliance: {
        budget: finalAmount,
        spent,
        remaining,
        percentage: Math.min(100, percentage),
        isOverBudget: spent > finalAmount
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete overall budget
router.delete('/overall', (req, res) => {
  try {
    db.prepare('DELETE FROM overall_budget').run();
    res.json({ message: 'Overall budget deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

