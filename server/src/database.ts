import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Get user data directory for persistence
function getUserDataPath(): string {
  // Check if running in Electron
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    // Electron environment - use app.getPath('userData')
    // Note: In Electron, this will be set via environment variable
    const electronUserData = process.env.ELECTRON_USER_DATA;
    if (electronUserData) {
      const dbDir = path.join(electronUserData, 'BudgetLife');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      return path.join(dbDir, 'budgeting.db');
    }
  }
  
  // Development or non-electron environment
  // Use current directory or user's home directory
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    return path.join(process.cwd(), 'budgeting.db');
  }
  
  // Production non-electron: use user's home directory
  const homeDir = os.homedir();
  const appDataDir = path.join(homeDir, '.budgetlife');
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  return path.join(appDataDir, 'budgeting.db');
}

const dbPath = getUserDataPath();
if (!dbPath) {
  throw new Error('Failed to determine database path');
}

let db: Database.Database;
try {
  db = new Database(dbPath);
  console.log(`Database initialized at: ${dbPath}`);
} catch (error: any) {
  console.error('Failed to initialize database:', error);
  throw error;
}

// Initialize database schema
export function initializeDatabase() {
  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      source TEXT,
      is_manual INTEGER DEFAULT 0
    )
  `);

  // Budgets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('weekly', 'monthly', 'yearly')),
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Overall budget table (one row for total monthly budget)
  db.exec(`
    CREATE TABLE IF NOT EXISTS overall_budget (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Savings goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT,
      category TEXT,
      description TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Overspending alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS overspending_alerts (
      id TEXT PRIMARY KEY,
      budget_id TEXT,
      category TEXT,
      overspent_amount REAL NOT NULL,
      percentage_over REAL NOT NULL,
      alert_date TEXT NOT NULL,
      is_resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (budget_id) REFERENCES budgets(id)
    )
  `);

  // Categories table (for smart categorization)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      keywords TEXT,
      parent_category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User progress table (gamification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      total_points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date TEXT,
      total_saved REAL DEFAULT 0,
      avatar TEXT DEFAULT '🌱',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Achievements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      points INTEGER DEFAULT 0,
      condition_type TEXT NOT NULL,
      condition_value TEXT,
      unlocked_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User achievements junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id)
    )
  `);

  // Category learning table (for smart categorization)
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_learning (
      id TEXT PRIMARY KEY,
      description_pattern TEXT NOT NULL,
      category TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      usage_count INTEGER DEFAULT 1,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category) REFERENCES categories(name)
    )
  `);

  // Initialize default user progress
  const progressExists = db.prepare('SELECT COUNT(*) as count FROM user_progress').get() as { count: number };
  if (progressExists.count === 0) {
    db.prepare(`
      INSERT INTO user_progress (id, total_points, level, current_streak, longest_streak, last_activity_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 0, 1, 0, 0, new Date().toISOString());
  }

  // Initialize default categories with comprehensive keywords
  const categories = [
    { 
      name: 'Rent & Utilities', 
      keywords: 'rent, mortgage, electricity, electric, power, gas, water, utility, utilities, internet, wifi, broadband, phone, mobile, telstra, optus, vodafone, nbn, strata, body corporate, council rates, rates, insurance, home insurance, property management, mgm martin, real estate' 
    },
    { 
      name: 'Food & Dining', 
      keywords: 'food, grocery, groceries, coles, woolworths, iga, aldi, supermarket, restaurant, cafe, dining, meal, takeaway, uber eats, doordash, menulog, mcdonalds, kfc, hungry jacks, pizza, sushi, bakery, butcher, fishmonger, deli, jarrett street caf, black star pastry, pig and pastry, eatalo, hankin company, quay quarter, green destiny' 
    },
    { 
      name: 'Travel & Transport', 
      keywords: 'uber, taxi, transport, transportfornsw, opal, train, bus, tram, ferry, parking, toll, fuel, petrol, gas station, bp, shell, caltex, mobil, 7-eleven, car, vehicle, flight, airline, qantas, virgin, jetstar, hotel, accommodation, travel, holiday, vacation' 
    },
    { 
      name: 'Entertainment', 
      keywords: 'entertainment, movie, cinema, theater, theatre, concert, music, spotify, netflix, disney, streaming, subscription, game, gaming, playstation, xbox, nintendo, sportsbet, betting, gambling, lottery, pub, bar, club, drinks, alcohol, beer, wine, spirits' 
    },
    { 
      name: 'Shopping & Retail', 
      keywords: 'shopping, shop, store, purchase, retail, amazon, ebay, kogan, target, kmart, big w, myer, david jones, clothing, clothes, shoes, electronics, appliances, furniture, homewares, decor, art on king, jokers tobacconist' 
    },
    { 
      name: 'Healthcare & Fitness', 
      keywords: 'healthcare, health, medical, doctor, dentist, pharmacy, chemist, hospital, clinic, optometrist, physiotherapy, chiropractor, massage, gym, fitness, yoga, pilates, personal trainer, sports, fitness equipment' 
    },
    { 
      name: 'Subscriptions & Services', 
      keywords: 'subscription, membership, adobe, apple, audible, mailchimp, intuit, software, app, cloud, saas, service, onlyfans, prime, amazon prime, streaming service' 
    },
    { 
      name: 'Bills & Payments', 
      keywords: 'bill, payment, bpay, bankwest, direct debit, automatic payment, recurring, monthly payment, annual fee, service fee, processing fee' 
    },
    { 
      name: 'Personal Care', 
      keywords: 'haircut, hairdresser, barber, salon, beauty, spa, cosmetics, toiletries, personal care, grooming' 
    },
    { 
      name: 'Education & Learning', 
      keywords: 'education, school, university, course, tuition, training, learning, books, textbook, stationery, supplies' 
    },
    { 
      name: 'Charity & Donations', 
      keywords: 'donation, charity, st vincent, salvos, red cross, giving, fundraiser, cause' 
    },
    { 
      name: 'Income', 
      keywords: 'salary, wage, paycheck, pay, deposit, income, payment, transfer, tfr, osko payment, sportsbet withdrawal, nib health funds' 
    },
    { 
      name: 'Other', 
      keywords: 'other, miscellaneous, unknown' 
    }
  ];

  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (id, name, keywords) VALUES (?, ?, ?)');
  categories.forEach(cat => {
    insertCategory.run(uuidv4(), cat.name, cat.keywords);
  });

  // Initialize default achievements
  const achievements = [
    { name: 'First Transaction', description: 'Added your first transaction', icon: '🎯', points: 10, condition_type: 'transaction_count', condition_value: '1' },
    { name: 'Week Warrior', description: 'Tracked expenses for 7 days straight', icon: '🔥', points: 50, condition_type: 'streak', condition_value: '7' },
    { name: 'Budget Master', description: 'Stayed within budget for a month', icon: '💎', points: 100, condition_type: 'budget_compliance', condition_value: '30' },
    { name: 'Saver', description: 'Saved $1000', icon: '💰', points: 200, condition_type: 'total_saved', condition_value: '1000' },
    { name: 'Level Up', description: 'Reached level 5', icon: '⭐', points: 150, condition_type: 'level', condition_value: '5' },
    { name: 'PDF Pro', description: 'Imported 10 PDF statements', icon: '📄', points: 75, condition_type: 'pdf_imports', condition_value: '10' }
  ];

  const insertAchievement = db.prepare(`
    INSERT OR IGNORE INTO achievements (id, name, description, icon, points, condition_type, condition_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  achievements.forEach(ach => {
    insertAchievement.run(uuidv4(), ach.name, ach.description, ach.icon, ach.points, ach.condition_type, ach.condition_value);
  });
}

export default db;

