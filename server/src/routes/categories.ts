import express from 'express';
import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', (req, res) => {
  try {
    const { name, keywords, parent_category } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO categories (id, name, keywords, parent_category)
      VALUES (?, ?, ?, ?)
    `).run(id, name, keywords || '', parent_category || null);
    
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:id', (req, res) => {
  try {
    const { name, keywords, parent_category } = req.body;
    
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          keywords = COALESCE(?, keywords),
          parent_category = COALESCE(?, parent_category)
      WHERE id = ?
    `).run(name, keywords, parent_category, req.params.id);
    
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

