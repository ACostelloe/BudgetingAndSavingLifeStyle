import express from 'express';
import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { createSavingsGoal, getAllSavingsGoals, updateSavingsGoalProgress } from '../services/savingsGoals.js';

const router = express.Router();

// Get all savings goals
router.get('/', (req, res) => {
  try {
    const goals = getAllSavingsGoals();
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get savings goal by ID
router.get('/:id', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    
    const updated = updateSavingsGoalProgress(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create savings goal
router.post('/', (req, res) => {
  try {
    const { name, target_amount, target_date, category, description } = req.body;
    
    if (!name || target_amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name and target_amount' });
    }
    
    const goal = createSavingsGoal({
      name,
      target_amount,
      target_date: target_date || null,
      category: category || null,
      description: description || null
    });
    
    res.status(201).json(goal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update savings goal
router.put('/:id', (req, res) => {
  try {
    const { name, target_amount, target_date, category, description } = req.body;
    
    const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    
    db.prepare(`
      UPDATE savings_goals
      SET name = COALESCE(?, name),
          target_amount = COALESCE(?, target_amount),
          target_date = COALESCE(?, target_date),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, target_amount, target_date, category, description, req.params.id);
    
    const updated = updateSavingsGoalProgress(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete savings goal
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM savings_goals WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    res.json({ message: 'Savings goal deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

