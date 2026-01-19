# Quick Start Guide

## Getting Started

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Start the Application**
   ```bash
   npm run dev
   ```
   
   This starts both the backend (port 5000) and frontend (port 3000).

3. **Open Your Browser**
   Navigate to http://localhost:3000

## First Steps

### 1. Upload a Bank Statement PDF
   - Click "Upload PDF" on the Transactions page
   - Select your bank statement PDF
   - Transactions will be automatically imported and categorized

### 2. Add Manual Transactions
   - Click "Add Transaction"
   - Fill in the details (date, description, amount, type)
   - Category can be auto-assigned or manually selected

### 3. Set Up Budgets
   - Go to the Budgets page
   - Click "Add Budget"
   - Choose a category, set amount, and period
   - Track your spending against budgets

### 4. Track Your Progress
   - View your level, points, and streak on the Dashboard
   - Check achievements on the Achievements page
   - Monitor spending trends with charts

## Tips

- **Smart Categorization**: The app learns from your manual categorizations. The more you use it, the smarter it gets!
- **Edit Everything**: All transactions and budgets are fully editable
- **Gamification**: Earn points for every transaction, maintain streaks, and unlock achievements
- **PDF Format**: Works best with standard bank statement PDFs. If parsing fails, you can manually add transactions.

## Troubleshooting

- **PDF not parsing**: Try manually adding a few transactions first to help the app understand your format
- **Server not starting**: Make sure ports 5000 and 3000 are available
- **Database errors**: Delete `budgeting.db` and restart the server to reset

Enjoy budgeting! 💰

