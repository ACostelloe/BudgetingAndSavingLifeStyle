import { useEffect, useState } from 'react';
import { Trophy, Lock, Sparkles, Star } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';

interface Achievement {
  name: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface AllAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  condition_type: string;
  condition_value: string;
}

export default function Achievements() {
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AllAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const [unlockedRes, allRes] = await Promise.all([
        api.get('/gamification/achievements'),
        api.get('/gamification/achievements/all'),
      ]);
      setUnlocked(unlockedRes.data);
      setAllAchievements(allRes.data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedIds = new Set(unlocked.map(a => a.name));

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Achievements</h2>
        <p className="mt-1 text-sm text-gray-500">
          {unlocked.length} of {allAchievements.length} unlocked
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.name);
          const unlockedAchievement = unlocked.find(a => a.name === achievement.name);

          return (
            <div
              key={achievement.id}
              className={`relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 ${
                isUnlocked 
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-yellow-200' 
                  : 'bg-white opacity-60 border border-gray-200'
              }`}
            >
              {/* Unlocked glow effect */}
              {isUnlocked && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400 rounded-full blur-2xl opacity-30 -mr-10 -mt-10" />
              )}
              
              <div className="relative p-6">
                <div className="flex items-start">
                  <div className={`text-5xl transition-transform duration-300 ${isUnlocked ? 'animate-bounce-slow' : 'grayscale opacity-50'}`}>
                    {achievement.icon}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-bold ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                        {achievement.name}
                      </h3>
                      {isUnlocked ? (
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        </div>
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <p className={`text-sm mb-3 ${isUnlocked ? 'text-gray-700' : 'text-gray-500'}`}>
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        isUnlocked 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        +{achievement.points} pts
                      </span>
                      {unlockedAchievement && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {format(new Date(unlockedAchievement.unlocked_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

