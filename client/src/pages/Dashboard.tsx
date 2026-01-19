import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Trophy, Flame, AlertTriangle, PiggyBank, Link as LinkIcon } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import Avatar from '../components/Avatar';
import LevelUpNotification from '../components/LevelUpNotification';
import AvatarSelector from '../components/AvatarSelector';
import { Link } from 'react-router-dom';

interface Stats {
  income: number;
  expenses: number;
  net: number;
  expensesByCategory: Array<{ category: string; total: number }>;
  transactionCount: number;
}

interface Progress {
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_saved: number;
  avatar: string;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [alerts, setAlerts] = useState<OverspendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    fetchData();
    // Refresh data every 30 seconds to catch level ups
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress && previousLevel !== null && progress.level > previousLevel) {
      setShowLevelUp(true);
    }
    if (progress) {
      setPreviousLevel(progress.level);
    }
  }, [progress, previousLevel]);

  const fetchData = async () => {
    try {
      const [statsRes, progressRes, goalsRes, alertsRes] = await Promise.all([
        api.get('/gamification/stats'),
        api.get('/gamification/progress'),
        api.get('/savings-goals').catch(() => ({ data: [] })),
        api.get('/analysis/overspending').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setProgress(progressRes.data);
      setSavingsGoals(goalsRes.data.slice(0, 3) || []);
      setAlerts(alertsRes.data.slice(0, 3) || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      {showLevelUp && progress && (
        <LevelUpNotification 
          level={progress.level} 
          onClose={() => setShowLevelUp(false)} 
        />
      )}

      {showAvatarSelector && progress && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg max-w-md w-full">
            <button
              onClick={() => setShowAvatarSelector(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <AvatarSelector
              currentAvatar={progress.avatar || '🌱'}
              onSelect={(avatar) => {
                setProgress({ ...progress, avatar });
                setShowAvatarSelector(false);
              }}
            />
          </div>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Avatar and Progress Section */}
      {progress && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Avatar Card */}
          <div className="lg:col-span-1">
            <Avatar
              level={progress.level}
              points={progress.total_points}
              streak={progress.current_streak}
              totalSaved={progress.total_saved}
              avatar={progress.avatar || '🌱'}
              onAvatarClick={() => setShowAvatarSelector(true)}
            />
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Points</p>
                  <p className="text-3xl font-bold mt-1">{progress.total_points.toLocaleString()}</p>
                </div>
                <Trophy className="w-12 h-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Current Streak</p>
                  <p className="text-3xl font-bold mt-1 flex items-center gap-1">
                    <Flame className="w-6 h-6" />
                    {progress.current_streak}
                  </p>
                  <p className="text-xs text-orange-100 mt-1">days in a row!</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Saved</p>
                  <p className="text-3xl font-bold mt-1">${progress.total_saved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <DollarSign className="w-12 h-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Longest Streak</p>
                  <p className="text-3xl font-bold mt-1">{progress.longest_streak}</p>
                  <p className="text-xs text-purple-100 mt-1">best record</p>
                </div>
                <Target className="w-12 h-12 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Income</dt>
                    <dd className="text-lg font-medium text-gray-900">${stats.income.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingDown className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expenses</dt>
                    <dd className="text-lg font-medium text-gray-900">${stats.expenses.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className={`h-6 w-6 ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Net</dt>
                    <dd className={`text-lg font-medium ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${stats.net.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-6 w-6 text-primary-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Transactions</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.transactionCount}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts and Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overspending Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-red-900">Overspending Alerts</h3>
              </div>
              <Link
                to="/analysis"
                className="text-sm text-red-700 hover:text-red-900 underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{alert.category}</span>
                    <span className="text-sm font-semibold text-red-600">
                      ${alert.overspent_amount.toFixed(2)} over
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Savings Goals */}
        {savingsGoals.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <PiggyBank className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-900">Savings Goals</h3>
              </div>
              <Link
                to="/savings-goals"
                className="text-sm text-green-700 hover:text-green-900 underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {savingsGoals.map((goal) => (
                <div key={goal.id} className="bg-white rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{goal.name}</span>
                    <span className="text-sm font-semibold text-green-600">
                      {goal.progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, goal.progress)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      {stats && stats.expensesByCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {stats.expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.expensesByCategory}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Bar dataKey="total" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

