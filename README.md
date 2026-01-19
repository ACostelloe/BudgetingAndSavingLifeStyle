# Budgeting & Saving Lifestyle App

A personalized gamified budgeting app with PDF bank statement parsing, smart categorization, and achievement tracking. Available as a **desktop executable** with auto-update capabilities.

## Features

- 📄 **PDF Bank Statement Parsing**: Upload PDFs of bank statements to automatically import transactions
- 🎯 **Smart Categorization**: AI-powered transaction categorization that learns from your behavior
- 🎮 **Gamification**: Earn points, unlock achievements, and maintain streaks
- 💰 **Budget Management**: Set budgets by category and track spending
- 📊 **Visual Analytics**: Beautiful charts and graphs to visualize your spending
- ✏️ **Editable Fields**: All transactions and budgets are fully editable
- 🔄 **Smart Learning**: The app learns from your categorization patterns
- 💻 **Desktop App**: Standalone executable for Windows, macOS, and Linux
- 🔄 **Auto-Updates**: Automatic update checking and installation
- 💾 **Data Persistence**: All data persists across app restarts and updates

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Desktop**: Electron
- **Database**: SQLite (better-sqlite3) - persists in user data directory
- **PDF Parsing**: pdf-parse
- **Charts**: Recharts
- **Auto-Updates**: electron-updater

## Installation

### Development Mode

1. Install all dependencies:
```bash
npm run install:all
```

2. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend dev server on http://localhost:3000
- Electron window (auto-opens)

### Building Executable

1. Build the application:
```bash
npm run build
```

2. Create executable:
```bash
npm run dist
```

The executable will be created in the `dist-electron/` directory.

For detailed build instructions, see [BUILD.md](./BUILD.md).

## Usage

### Adding Transactions

1. Click "Add Transaction" to manually add a transaction
2. Or click "Upload PDF" to import transactions from a bank statement PDF

### Setting Budgets

1. Go to the Budgets page
2. Click "Add Budget"
3. Select a category, set an amount, and choose a period (weekly/monthly/yearly)

### Tracking Progress

- View your level, points, and streak on the Dashboard
- Check your achievements on the Achievements page
- Monitor spending vs budgets with visual progress bars

## PDF Format Support

The app supports common bank statement formats. For best results:
- PDFs should contain transaction dates and amounts
- Dates can be in MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD format
- Amounts should be clearly visible

## Smart Features

- **Auto-categorization**: Transactions are automatically categorized based on description keywords
- **Learning System**: When you manually categorize a transaction, the app learns and improves
- **Budget Compliance**: Real-time tracking of spending against budgets
- **Achievement System**: Unlock achievements for milestones like:
  - First transaction
  - Week-long streak
  - Budget compliance
  - Savings milestones
  - Level progression

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── pages/   # Page components
│   │   ├── components/ # Reusable components
│   │   └── api/     # API client
├── server/          # Express backend
│   ├── src/
│   │   ├── routes/  # API routes
│   │   ├── services/ # Business logic
│   │   └── database.ts # Database setup
├── electron/        # Electron main process
│   ├── main.js      # Main Electron process
│   └── preload.js   # Preload script
├── assets/          # App icons
└── package.json     # Root package.json with Electron config
```

## Data Persistence

The app stores all data in platform-specific user data directories:

- **Windows**: `%APPDATA%\BudgetLife\budgeting.db`
- **macOS**: `~/Library/Application Support/BudgetLife/budgeting.db`
- **Linux**: `~/.config/BudgetLife/budgeting.db`

Data persists across:
- App restarts
- App updates
- System reboots

## Development

- Backend uses TypeScript with ES modules
- Frontend uses Vite for fast development
- Database is SQLite (file: `budgeting.db`)
- Hot reload enabled for both frontend and backend

## License

MIT

