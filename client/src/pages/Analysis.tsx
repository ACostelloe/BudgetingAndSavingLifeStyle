import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryInsight {
  category: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageOfTotal: number;
  recommendations: string[];
}

interface SpendingAnalysis {
  totalExpenses: number;
  categoryInsights: CategoryInsight[];
  topCategories: Array<{ category: string; amount: number }>;
  overspendingCategories: Array<{ category: string; budget: number; spent: number; over: number }>;
  savingsOpportunities: Array<{ category: string; potentialSavings: number; reason: string }>;
}

interface OverspendingAlert {
  id: string;
  category: string;
  overspent_amount: number;
  percentage_over: number;
  alert_date: string;
}

export default function Analysis() {
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [alerts, setAlerts] = useState<OverspendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalysis();
    fetchAlerts();
  }, [dateRange]);
  
  useEffect(() => {
    // Listen for transaction updates
    const handleTransactionChange = () => {
      fetchAnalysis();
      fetchAlerts();
    };
    window.addEventListener('transaction-updated', handleTransactionChange);
    
    return () => {
      window.removeEventListener('transaction-updated', handleTransactionChange);
    };
  }, []);

  const fetchAnalysis = async () => {
    try {
      const res = await api.get('/analysis/spending', {
        params: dateRange,
      });
      setAnalysis(res.data);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/analysis/overspending');
      setAlerts(res.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const checkOverspending = async () => {
    try {
      await api.post('/analysis/check-overspending');
      fetchAlerts();
      fetchAnalysis();
      alert('Overspending check completed!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to check overspending');
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await api.put(`/analysis/overspending/${id}/resolve`);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!analysis) {
    return <div className="text-center py-12">No analysis data available</div>;
  }

  return (
    <div className="px-4 sm:px-0 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Spending Analysis</h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <span className="self-center">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Overspending Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-900">Overspending Alerts</h3>
            </div>
            <button
              onClick={checkOverspending}
              className="text-sm text-red-700 hover:text-red-900 underline"
            >
              Check Again
            </button>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded p-3 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-gray-900">{alert.category}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    - ${alert.overspent_amount.toFixed(2)} over budget (
                    {alert.percentage_over.toFixed(0)}%)
                  </span>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Mark Resolved
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-primary-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analysis.totalExpenses.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overspending Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.overspendingCategories.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Lightbulb className="h-8 w-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Savings Opportunities</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.savingsOpportunities.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Categories Chart */}
      {analysis.topCategories.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Spending Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysis.topCategories}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Bar dataKey="amount" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Insights */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Category Insights</h3>
        <div className="space-y-4">
          {analysis.categoryInsights.slice(0, 10).map((insight) => (
            <div key={insight.category} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">{insight.category}</span>
                  {insight.trend === 'increasing' && (
                    <TrendingUp className="w-4 h-4 text-red-500 ml-2" />
                  )}
                  {insight.trend === 'decreasing' && (
                    <TrendingDown className="w-4 h-4 text-green-500 ml-2" />
                  )}
                </div>
                <span className="text-lg font-semibold">
                  ${insight.totalSpent.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {insight.transactionCount} transactions • Avg: ${insight.averageTransaction.toFixed(2)} •{' '}
                {insight.percentageOfTotal.toFixed(1)}% of total
              </div>
              {insight.recommendations.length > 0 && (
                <div className="mt-2 text-sm text-blue-600">
                  💡 {insight.recommendations[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Savings Opportunities */}
      {analysis.savingsOpportunities.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Lightbulb className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-green-900">Savings Opportunities</h3>
          </div>
          <div className="space-y-3">
            {analysis.savingsOpportunities.map((opp, index) => (
              <div key={index} className="bg-white rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-gray-900">{opp.category}</span>
                    <p className="text-sm text-gray-600 mt-1">{opp.reason}</p>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    ${opp.potentialSavings.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overspending Categories */}
      {analysis.overspendingCategories.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-900">Overspending Categories</h3>
          </div>
          <div className="space-y-3">
            {analysis.overspendingCategories.map((cat, index) => (
              <div key={index} className="bg-white rounded p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900">{cat.category}</span>
                    <p className="text-sm text-gray-600 mt-1">
                      Budget: ${cat.budget.toFixed(2)} • Spent: ${cat.spent.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    ${cat.over.toFixed(2)} over
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

