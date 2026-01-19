import { useEffect, useState } from 'react';
import { Sparkles, Star, Zap } from 'lucide-react';

interface AvatarProps {
  level: number;
  points: number;
  streak: number;
  totalSaved: number;
  avatar: string;
  onAvatarClick?: () => void;
}

// Avatar characters based on level (for titles, not the actual avatar)
const getAvatarCharacter = (level: number): string => {
  if (level >= 50) return '👑'; // King/Queen
  if (level >= 40) return '🦸'; // Superhero
  if (level >= 30) return '🎓'; // Graduate
  if (level >= 20) return '💼'; // Professional
  if (level >= 10) return '⭐'; // Star
  if (level >= 5) return '🎯'; // Target
  return '🌱'; // Seedling (beginner)
};

const getAvatarColor = (level: number): string => {
  if (level >= 50) return 'from-purple-500 to-pink-500';
  if (level >= 40) return 'from-blue-500 to-cyan-500';
  if (level >= 30) return 'from-green-500 to-emerald-500';
  if (level >= 20) return 'from-yellow-500 to-orange-500';
  if (level >= 10) return 'from-blue-400 to-indigo-500';
  if (level >= 5) return 'from-green-400 to-teal-500';
  return 'from-gray-400 to-gray-600';
};

const getTitle = (level: number): string => {
  if (level >= 50) return 'Financial Master';
  if (level >= 40) return 'Budget Hero';
  if (level >= 30) return 'Finance Graduate';
  if (level >= 20) return 'Budget Professional';
  if (level >= 10) return 'Rising Star';
  if (level >= 5) return 'Budget Tracker';
  return 'Budget Beginner';
};

export default function Avatar({ level, points, streak, totalSaved, avatar, onAvatarClick }: AvatarProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [pointsToNextLevel, setPointsToNextLevel] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Calculate progress to next level (100 points per level)
    const currentLevelPoints = (level - 1) * 100;
    const nextLevelPoints = level * 100;
    const progress = points - currentLevelPoints;
    const needed = nextLevelPoints - currentLevelPoints;
    const percent = Math.min(100, (progress / needed) * 100);
    
    setPointsToNextLevel(nextLevelPoints - points);
    setProgressPercent(percent);
  }, [level, points]);

  const character = getAvatarCharacter(level);
  const colorGradient = getAvatarColor(level);
  const title = getTitle(level);

  return (
    <div className="relative">
      {/* Avatar Card */}
      <div className={`bg-gradient-to-br ${colorGradient} rounded-2xl shadow-xl p-6 text-white relative overflow-hidden`}>
        {/* Decorative elements */}
        <div className="absolute top-2 right-2 opacity-20">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="absolute bottom-2 left-2 opacity-20">
          <Star className="w-6 h-6" />
        </div>

        <div className="relative z-10">
          {/* Avatar Character */}
          <div className="flex flex-col items-center mb-4">
            <div 
              className={`text-8xl mb-2 transform hover:scale-110 transition-transform duration-300 ${onAvatarClick ? 'cursor-pointer' : ''}`}
              onClick={onAvatarClick}
              title={onAvatarClick ? 'Click to change avatar' : ''}
            >
              {avatar || character}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">{title}</h3>
              <p className="text-sm opacity-90">Level {level}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold">{points}</div>
              <div className="text-xs opacity-80">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                🔥 {streak}
              </div>
              <div className="text-xs opacity-80">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                ${totalSaved >= 1000 ? (totalSaved / 1000).toFixed(1) + 'k' : totalSaved.toFixed(0)}
              </div>
              <div className="text-xs opacity-80">Saved</div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress to Level {level + 1}</span>
              <span>{pointsToNextLevel} points needed</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 10 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Badge */}
      {level >= 5 && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg animate-bounce">
          <Zap className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

