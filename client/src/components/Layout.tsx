import { Link, useLocation } from 'react-router-dom';
import { Home, Receipt, Target, Trophy, PiggyBank, BarChart3 } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import api from '../api/client';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [userProgress, setUserProgress] = useState<{ level: number; avatar: string } | null>(null);

  useEffect(() => {
    // Fetch user progress for avatar display
    api.get('/gamification/progress')
      .then(res => setUserProgress({ level: res.data.level, avatar: res.data.avatar }))
      .catch(() => {});
  }, [location]);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
    { path: '/savings-goals', icon: PiggyBank, label: 'Savings' },
    { path: '/analysis', icon: BarChart3, label: 'Analysis' },
    { path: '/achievements', icon: Trophy, label: 'Achievements' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="text-3xl">
                  {userProgress?.avatar || '🌱'}
                </div>
                <h1 className="text-2xl font-bold text-primary-600">Budget Life</h1>
                {userProgress && (
                  <span className="text-sm text-gray-500">Lv.{userProgress.level}</span>
                )}
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-4 ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

