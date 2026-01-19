import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export interface UserProgress {
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_saved: number;
  avatar: string;
}

// Calculate level based on multiple factors
function calculateLevel(progress: UserProgress & { budgetsHit: number; goodTransactions: number }): number {
  let levelScore = 0;
  
  // Factor 1: Total saved (every $100 = 1 point, max 20 points)
  levelScore += Math.min(20, Math.floor(progress.total_saved / 100));
  
  // Factor 2: Streaks (every 7 days = 2 points, max 15 points)
  levelScore += Math.min(15, Math.floor(progress.current_streak / 7) * 2);
  
  // Factor 3: Budgets hit (each budget hit = 3 points, max 20 points)
  levelScore += Math.min(20, progress.budgetsHit * 3);
  
  // Factor 4: Good transactions (income transactions, max 15 points)
  // Every 10 income transactions = 1 point
  levelScore += Math.min(15, Math.floor(progress.goodTransactions / 10));
  
  // Factor 5: Longest streak bonus (every 30 days = 5 points, max 10 points)
  levelScore += Math.min(10, Math.floor(progress.longest_streak / 30) * 5);
  
  // Convert score to level (start at level 1, level up every 10 points)
  const calculatedLevel = Math.max(1, Math.floor(levelScore / 10) + 1);
  
  return calculatedLevel;
}

export function getUserProgress(): UserProgress {
  const progress = db.prepare('SELECT * FROM user_progress LIMIT 1').get() as UserProgress & { id: string; last_activity_date: string };
  
  if (!progress) {
    // Initialize if doesn't exist - start at level 1
    const id = uuidv4();
    db.prepare(`
      INSERT INTO user_progress (id, total_points, level, current_streak, longest_streak, last_activity_date, total_saved, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, 0, 1, 0, 0, new Date().toISOString(), 0, '🌱');
    
    return {
      total_points: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      total_saved: 0,
      avatar: '🌱'
    };
  }

  // Calculate level based on performance metrics
  // Count budgets where spending is within budget
  const allBudgets = db.prepare('SELECT * FROM budgets').all() as Array<{ id: string; category: string; amount: number; start_date: string; end_date: string | null }>;
  let budgetsHit = 0;
  
  for (const budget of allBudgets) {
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as spent
      FROM transactions
      WHERE category = ? AND type = 'expense' AND date >= ? AND (? IS NULL OR date <= ?)
    `).get(budget.category, budget.start_date, budget.end_date, budget.end_date) as { spent: number };
    
    if (expenses.spent <= budget.amount) {
      budgetsHit++;
    }
  }
  
  const goodTransactions = db.prepare(`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE type = 'income'
  `).get() as { count: number };

  const calculatedLevel = calculateLevel({
    ...progress,
    budgetsHit: budgetsHit,
    goodTransactions: goodTransactions.count || 0
  });

  // Update level if it changed
  if (calculatedLevel !== progress.level) {
    db.prepare('UPDATE user_progress SET level = ? WHERE id = ?').run(calculatedLevel, progress.id);
  }

  return {
    total_points: progress.total_points,
    level: calculatedLevel,
    current_streak: progress.current_streak,
    longest_streak: progress.longest_streak,
    total_saved: progress.total_saved || 0,
    avatar: progress.avatar || '🌱'
  };
}

export function setAvatar(avatar: string): void {
  const validAvatars = ['🌱', '🐱', '🐶', '🦊', '🐼'];
  if (!validAvatars.includes(avatar)) {
    throw new Error('Invalid avatar selection');
  }
  
  db.prepare('UPDATE user_progress SET avatar = ?').run(avatar);
}

export function addPoints(points: number): void {
  const progress = getUserProgress();
  const newPoints = progress.total_points + points;
  
  // Level is now calculated dynamically, so just update points
  db.prepare(`
    UPDATE user_progress
    SET total_points = ?, updated_at = CURRENT_TIMESTAMP
  `).run(newPoints);
  
  // Recalculate level and check achievements
  getUserProgress(); // This will recalculate level
  checkAchievements();
}

export function updateStreak(): void {
  const progress = getUserProgress();
  const today = new Date().toISOString().split('T')[0];
  const lastActivity = progress.last_activity_date ? new Date(progress.last_activity_date).toISOString().split('T')[0] : null;
  
  let newStreak = progress.current_streak;
  
  if (!lastActivity) {
    newStreak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastActivity === yesterdayStr || lastActivity === today) {
      newStreak = progress.current_streak + (lastActivity === yesterdayStr ? 1 : 0);
    } else {
      newStreak = 1; // Reset streak
    }
  }
  
  const longestStreak = Math.max(progress.longest_streak, newStreak);
  
  db.prepare(`
    UPDATE user_progress
    SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP
  `).run(newStreak, longestStreak, today);
  
  // Recalculate level and check achievements
  getUserProgress(); // This will recalculate level
  checkAchievements();
}

export function updateTotalSaved(amount: number): void {
  const progress = getUserProgress();
  const newTotal = progress.total_saved + amount;
  
  db.prepare(`
    UPDATE user_progress
    SET total_saved = ?, updated_at = CURRENT_TIMESTAMP
  `).run(newTotal);
  
  // Recalculate level and check achievements
  getUserProgress(); // This will recalculate level
  checkAchievements();
}

export function checkAchievements(): void {
  const progress = getUserProgress();
  const userId = 'default';
  
  // Get all achievements
  const achievements = db.prepare('SELECT * FROM achievements').all() as Array<{
    id: string;
    name: string;
    condition_type: string;
    condition_value: string;
    points: number;
  }>;
  
  // Get unlocked achievements
  const unlocked = db.prepare(`
    SELECT achievement_id FROM user_achievements WHERE user_id = ?
  `).all(userId) as Array<{ achievement_id: string }>;
  const unlockedIds = new Set(unlocked.map(u => u.achievement_id));
  
  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue;
    
    let unlocked = false;
    
    switch (achievement.condition_type) {
      case 'level':
        if (progress.level >= parseInt(achievement.condition_value)) {
          unlocked = true;
        }
        break;
      case 'streak':
        if (progress.current_streak >= parseInt(achievement.condition_value)) {
          unlocked = true;
        }
        break;
      case 'total_saved':
        if (progress.total_saved >= parseFloat(achievement.condition_value)) {
          unlocked = true;
        }
        break;
      case 'transaction_count':
        const count = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
        if (count.count >= parseInt(achievement.condition_value)) {
          unlocked = true;
        }
        break;
      case 'savings_goals_completed':
        const goalsCompleted = db.prepare('SELECT COUNT(*) as count FROM savings_goals WHERE is_completed = 1').get() as { count: number };
        if (goalsCompleted.count >= parseInt(achievement.condition_value)) {
          unlocked = true;
        }
        break;
      case 'all_budgets_hit':
        const budgets = db.prepare('SELECT * FROM budgets').all() as Array<{ id: string; category: string; amount: number; start_date: string; end_date: string | null }>;
        let allHit = true;
        for (const budget of budgets) {
          const expenses = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as spent
            FROM transactions
            WHERE category = ? AND type = 'expense' AND date >= ? AND (? IS NULL OR date <= ?)
          `).get(budget.category, budget.start_date, budget.end_date, budget.end_date) as { spent: number };
          if (expenses.spent > budget.amount) {
            allHit = false;
            break;
          }
        }
        if (allHit && budgets.length > 0) {
          unlocked = true;
        }
        break;
    }
    
    if (unlocked) {
      // Unlock achievement
      db.prepare(`
        INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), userId, achievement.id);
      
      // Add points
      addPoints(achievement.points);
    }
  }
  
  // Auto-create savings goal achievements
  const goalsCompleted = db.prepare('SELECT COUNT(*) as count FROM savings_goals WHERE is_completed = 1').get() as { count: number };
  if (goalsCompleted.count > 0) {
    const achievementName = `Completed ${goalsCompleted.count} Savings Goal${goalsCompleted.count > 1 ? 's' : ''}`;
    const existingAchievement = db.prepare('SELECT * FROM achievements WHERE name = ?').get(achievementName);
    if (!existingAchievement) {
      const achievementId = uuidv4();
      db.prepare(`
        INSERT INTO achievements (id, name, description, icon, points, condition_type, condition_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        achievementId,
        achievementName,
        `Completed ${goalsCompleted.count} savings goal${goalsCompleted.count > 1 ? 's' : ''}`,
        '🎯',
        goalsCompleted.count * 50,
        'savings_goals_completed',
        goalsCompleted.count.toString()
      );
    }
  }
}

export function getUnlockedAchievements(): Array<{ name: string; description: string; icon: string; unlocked_at: string }> {
  const achievements = db.prepare(`
    SELECT a.name, a.description, a.icon, ua.unlocked_at
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = ?
    ORDER BY ua.unlocked_at DESC
  `).all('default') as Array<{ name: string; description: string; icon: string; unlocked_at: string }>;
  
  return achievements;
}

