import express from 'express';
import db from '../database.js';
import { categorizeTransaction, learnCategory } from '../services/smartCategorizer.js';
import { addPoints, updateStreak, checkAchievements, getUserProgress } from '../services/gamification.js';
import { updateSavingsGoalProgress } from '../services/savingsGoals.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all transactions
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY date DESC, created_at DESC';
    
    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:id', (req, res) => {
  try {
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
router.post('/', (req, res) => {
  try {
    const { date, description, amount, category, type, source } = req.body;
    
    if (!date || !description || amount === undefined || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const id = uuidv4();
    const finalCategory = category || categorizeTransaction(description, amount, type);
    
    db.prepare(`
      INSERT INTO transactions (id, date, description, amount, category, type, source, is_manual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, description, amount, finalCategory, type, source || 'manual', 1);
    
    // Learn from manual categorization
    if (category) {
      learnCategory(description, category);
    }
    
    // Check for overspending after transaction
    const budget = category ? db.prepare('SELECT * FROM budgets WHERE category = ? ORDER BY created_at DESC LIMIT 1').get(category) as any : null;
    if (budget && type === 'expense') {
      const expenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE category = ? AND type = 'expense' AND date >= ? AND (? IS NULL OR date <= ?)
      `).get(category, budget.start_date, budget.end_date, budget.end_date) as { spent: number };
      
      if (expenses.spent > budget.amount) {
        // Check if alert already exists
        const existingAlert = db.prepare('SELECT * FROM overspending_alerts WHERE budget_id = ? AND is_resolved = 0').get(budget.id);
        if (!existingAlert) {
          const overspent = expenses.spent - budget.amount;
          const percentageOver = ((expenses.spent / budget.amount) - 1) * 100;
          const alertId = uuidv4();
          db.prepare(`
            INSERT INTO overspending_alerts (id, budget_id, category, overspent_amount, percentage_over, alert_date)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(alertId, budget.id, category, overspent, percentageOver, new Date().toISOString().split('T')[0]);
        }
      }
    }
    
    // Update savings goals progress
    if (type === 'expense' || type === 'income') {
      const goals = db.prepare('SELECT id FROM savings_goals').all() as Array<{ id: string }>;
      for (const goal of goals) {
        updateSavingsGoalProgress(goal.id);
      }
    }
    
    // Gamification
    addPoints(5); // Points for adding transaction
    updateStreak();
    // Recalculate level (happens in getUserProgress)
    getUserProgress();
    checkAchievements();
    
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction
router.put('/:id', (req, res) => {
  try {
    const { date, description, amount, category, type } = req.body;
    
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const finalCategory = category || existing.category || categorizeTransaction(description || existing.description, amount || existing.amount, type || existing.type);
    
    db.prepare(`
      UPDATE transactions
      SET date = COALESCE(?, date),
          description = COALESCE(?, description),
          amount = COALESCE(?, amount),
          category = ?,
          type = COALESCE(?, type),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(date, description, amount, finalCategory, type, req.params.id);
    
    // Learn from updated categorization
    if (category && description) {
      learnCategory(description, category);
    }
    
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete transactions - MUST come before /:id route
router.delete('/bulk', (req, res) => {
  try {
    const { ids, source } = req.body;
    
    if (ids && Array.isArray(ids)) {
      // Delete by IDs
      if (ids.length === 0) {
        return res.status(400).json({ error: 'No transaction IDs provided' });
      }
      
      const placeholders = ids.map(() => '?').join(',');
      const result = db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
      
      res.json({ 
        message: `Deleted ${result.changes} transaction(s)`,
        deletedCount: result.changes 
      });
    } else if (source) {
      // Delete by source (e.g., all PDF imports)
      const result = db.prepare('DELETE FROM transactions WHERE source = ?').run(source);
      
      res.json({ 
        message: `Deleted ${result.changes} transaction(s) from source: ${source}`,
        deletedCount: result.changes 
      });
    } else {
      return res.status(400).json({ error: 'Must provide either ids array or source' });
    }
  } catch (error: any) {
    console.error('Error bulk deleting transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to delete transactions' });
  }
});

// Bulk import transactions
router.post('/bulk', (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions must be an array' });
    }
    
    const insert = db.prepare(`
      INSERT INTO transactions (id, date, description, amount, category, type, source, is_manual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((txns: any[]) => {
      const inserted = [];
      for (const txn of txns) {
        const id = uuidv4();
        const category = txn.category || categorizeTransaction(txn.description, txn.amount, txn.type);
        insert.run(id, txn.date, txn.description, txn.amount, category, txn.type, txn.source || 'import', 0);
        inserted.push({ ...txn, id, category });
      }
      return inserted;
    });
    
    const inserted = insertMany(transactions);
    
    // Gamification
    addPoints(inserted.length * 2); // More points for bulk import
    updateStreak();
    checkAchievements();
    
    res.status(201).json({ message: `Imported ${inserted.length} transactions`, transactions: inserted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction - MUST come after /bulk route
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

