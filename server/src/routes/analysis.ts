import express from 'express';
import { analyzeSpending } from '../services/categoryAnalysis.js';
import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get spending analysis
router.get('/spending', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const dateRange = start_date && end_date ? {
      start: start_date as string,
      end: end_date as string
    } : undefined;
    
    const analysis = analyzeSpending(dateRange);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get overspending alerts
router.get('/overspending', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT 
        oa.*,
        b.category as budget_category,
        b.amount as budget_amount
      FROM overspending_alerts oa
      LEFT JOIN budgets b ON oa.budget_id = b.id
      WHERE oa.is_resolved = 0
      ORDER BY oa.created_at DESC
    `).all();
    
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check and create overspending alerts
router.post('/check-overspending', (req, res) => {
  try {
    const budgets = db.prepare('SELECT * FROM budgets').all() as Array<{
      id: string;
      category: string;
      amount: number;
      start_date: string;
      end_date: string | null;
    }>;
    
    const newAlerts: any[] = [];
    
    for (const budget of budgets) {
      const expenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE category = ? AND type = 'expense' AND date >= ? AND (? IS NULL OR date <= ?)
      `).get(budget.category, budget.start_date, budget.end_date, budget.end_date) as { spent: number };
      
      if (expenses.spent > budget.amount) {
        const overspent = expenses.spent - budget.amount;
        const percentageOver = ((expenses.spent / budget.amount) - 1) * 100;
        
        // Check if alert already exists
        const existing = db.prepare(`
          SELECT * FROM overspending_alerts 
          WHERE budget_id = ? AND is_resolved = 0
        `).get(budget.id);
        
        if (!existing) {
          const id = uuidv4();
          db.prepare(`
            INSERT INTO overspending_alerts (id, budget_id, category, overspent_amount, percentage_over, alert_date)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            id,
            budget.id,
            budget.category,
            overspent,
            percentageOver,
            new Date().toISOString().split('T')[0]
          );
          
          newAlerts.push({
            id,
            budget_id: budget.id,
            category: budget.category,
            overspent_amount: overspent,
            percentage_over: percentageOver
          });
        }
      }
    }
    
    res.json({ alertsCreated: newAlerts.length, alerts: newAlerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve overspending alert
router.put('/overspending/:id/resolve', (req, res) => {
  try {
    db.prepare('UPDATE overspending_alerts SET is_resolved = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Alert resolved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

