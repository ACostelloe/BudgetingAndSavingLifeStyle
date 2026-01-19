import express from 'express';
import multer from 'multer';
import { parsePDF } from '../services/pdfParser.js';
import { categorizeTransaction, learnCategory } from '../services/smartCategorizer.js';
import { addPoints, updateStreak, checkAchievements } from '../services/gamification.js';
import { createSuggestedBudgets } from '../services/budgetSuggestions.js';
import { createSuggestedSavingsGoals } from '../services/savingsGoalSuggestions.js';
import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload PDF and parse transactions
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'File must be a PDF' });
    }
    
    const parseResult = await parsePDF(req.file.buffer);
    
    if (parseResult.transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions found in PDF' });
    }
    
    // Validate transactions against PDF summary
    if (!parseResult.validation.isValid) {
      console.warn('⚠️ PDF validation failed - transactions may not match PDF totals');
      console.warn(`Credits difference: $${parseResult.validation.differences.creditsDiff.toFixed(2)}`);
      console.warn(`Debits difference: $${parseResult.validation.differences.debitsDiff.toFixed(2)}`);
      if (parseResult.validation.differences.closingBalanceDiff !== null) {
        console.warn(`Closing balance difference: $${parseResult.validation.differences.closingBalanceDiff.toFixed(2)}`);
      }
    }
    
    // Categorize transactions and learn from patterns
    const categorizedTransactions = parseResult.transactions.map(txn => {
      const category = categorizeTransaction(txn.description, txn.amount, txn.type);
      // Learn from successful categorization (if not "Other")
      if (category !== 'Other' && txn.type === 'expense') {
        learnCategory(txn.description, category);
      }
      return {
        ...txn,
        category
      };
    });
    
    // Log categorization results for debugging
    const otherTransactions = categorizedTransactions.filter(t => t.category === 'Other');
    if (otherTransactions.length > 0) {
      console.log(`\n[Upload] ${otherTransactions.length} transactions categorized as "Other":`);
      otherTransactions.slice(0, 10).forEach(t => {
        console.log(`  - "${t.description}" ($${t.amount.toFixed(2)})`);
      });
      if (otherTransactions.length > 10) {
        console.log(`  ... and ${otherTransactions.length - 10} more`);
      }
    }
    
    // Insert transactions
    const insert = db.prepare(`
      INSERT INTO transactions (id, date, description, amount, category, type, source, is_manual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((txns: any[]) => {
      const inserted = [];
      for (const txn of txns) {
        const id = uuidv4();
        insert.run(id, txn.date, txn.description, txn.amount, txn.category, txn.type, 'pdf_import', 0);
        inserted.push({ ...txn, id });
      }
      return inserted;
    });
    
    const inserted = insertMany(categorizedTransactions);
    
    // Calculate categorization statistics
    const categoryCounts: { [key: string]: number } = {};
    inserted.forEach(txn => {
      categoryCounts[txn.category] = (categoryCounts[txn.category] || 0) + 1;
    });
    const categorizedCount = Object.keys(categoryCounts).filter(cat => cat !== 'Other').length;
    const otherCount = categoryCounts['Other'] || 0;
    
    // Determine date range from uploaded transactions
    const dates = inserted.map(t => t.date).sort();
    const dateRange = dates.length > 0 ? {
      start: dates[0],
      end: dates[dates.length - 1]
    } : undefined;
    
    // Auto-create budgets based on spending patterns
    const createdBudgets = createSuggestedBudgets(dateRange);
    
    // Auto-create savings goals based on spending patterns
    const createdSavingsGoals = createSuggestedSavingsGoals(dateRange);
    
    // Gamification
    addPoints(inserted.length * 3); // More points for PDF import
    updateStreak();
    checkAchievements();
    
    res.json({
      message: `Successfully imported ${inserted.length} transactions from PDF`,
      transactions: inserted,
      budgetsCreated: createdBudgets.length,
      budgets: createdBudgets,
      savingsGoalsCreated: createdSavingsGoals.length,
      savingsGoals: createdSavingsGoals,
      categorization: {
        totalCategories: categorizedCount,
        otherCount: otherCount,
        categoryBreakdown: categoryCounts
      },
      validation: {
        isValid: parseResult.validation.isValid,
        summary: parseResult.summary,
        calculatedTotals: {
          credits: parseResult.validation.calculatedCredits,
          debits: parseResult.validation.calculatedDebits,
          closingBalance: parseResult.validation.calculatedClosingBalance
        },
        differences: parseResult.validation.differences
      }
    });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF' });
  }
});

export default router;

