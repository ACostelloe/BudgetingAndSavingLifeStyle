import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Target, DollarSign } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
}

interface BudgetCompliance {
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

interface OverallBudget {
  id: string;
  amount: number;
  period: string;
  start_date: string;
  end_date: string | null;
  compliance?: BudgetCompliance;
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<(Budget & { compliance?: BudgetCompliance })[]>([]);
  const [overallBudget, setOverallBudget] = useState<OverallBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOverallModal, setShowOverallModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchBudgets();
    fetchOverallBudget();
    fetchCategories();
    
    // Listen for transaction updates
    const handleTransactionChange = () => {
      fetchBudgets();
      fetchOverallBudget();
    };
    window.addEventListener('transaction-updated', handleTransactionChange);
    
    return () => {
      window.removeEventListener('transaction-updated', handleTransactionChange);
    };
  }, []);

  const fetchOverallBudget = async () => {
    try {
      const res = await api.get('/budgets/overall');
      setOverallBudget(res.data);
    } catch (error) {
      console.error('Failed to fetch overall budget:', error);
      setOverallBudget(null);
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/budgets');
      const budgetsData = res.data;
      
      // Fetch compliance for each budget
      const budgetsWithCompliance = await Promise.all(
        budgetsData.map(async (budget: Budget) => {
          try {
            const complianceRes = await api.get(`/budgets/${budget.id}/compliance`);
            return { ...budget, compliance: complianceRes.data };
          } catch {
            return budget;
          }
        })
      );
      
      setBudgets(budgetsWithCompliance);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.map((c: any) => c.name).filter((n: string) => n !== 'Income'));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      category: formData.get('category'),
      amount: parseFloat(formData.get('amount') as string),
      period: formData.get('period'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date') || null,
    };

    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, data);
      } else {
        await api.post('/budgets', data);
      }
      setShowAddModal(false);
      setEditingBudget(null);
      fetchBudgets();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save budget');
    }
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setShowAddModal(true);
  };

  const handleOverallBudgetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      amount: parseFloat(formData.get('amount') as string),
      period: formData.get('period') || 'monthly',
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date') || null,
    };

    try {
      if (overallBudget) {
        await api.put('/budgets/overall', data);
      } else {
        await api.post('/budgets/overall', data);
      }
      setShowOverallModal(false);
      fetchOverallBudget();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save overall budget');
    }
  };

  const handleDeleteOverallBudget = async () => {
    if (!confirm('Are you sure you want to delete the overall budget?')) return;
    try {
      await api.delete('/budgets/overall');
      setOverallBudget(null);
    } catch (error) {
      console.error('Failed to delete overall budget:', error);
      alert('Failed to delete overall budget');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Budgets</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOverallModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {overallBudget ? 'Edit Overall Budget' : 'Set Overall Budget'}
          </button>
          <button
            onClick={() => {
              setEditingBudget(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category Budget
          </button>
        </div>
      </div>

      {/* Overall Budget Card */}
      {overallBudget && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg rounded-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 mr-2" />
              <h3 className="text-xl font-bold">Overall Monthly Budget</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOverallModal(true)}
                className="text-white hover:text-gray-200"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteOverallBudget}
                className="text-white hover:text-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {overallBudget.compliance && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-primary-100">Total Budget:</span>
                <span className="text-2xl font-bold">${overallBudget.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-primary-100">Spent:</span>
                <span className={`text-xl font-semibold ${overallBudget.compliance.isOverBudget ? 'text-red-200' : 'text-white'}`}>
                  ${overallBudget.compliance.spent.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-primary-100">Remaining:</span>
                <span className={`text-xl font-semibold ${overallBudget.compliance.remaining < 0 ? 'text-red-200' : 'text-green-200'}`}>
                  ${overallBudget.compliance.remaining.toFixed(2)}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-primary-100 mb-2">
                  <span>{overallBudget.compliance.percentage.toFixed(0)}% used</span>
                  <span className="font-semibold">
                    {overallBudget.compliance.isOverBudget ? '⚠️ Over Budget!' : '✓ On Track'}
                  </span>
                </div>
                <div className="w-full bg-primary-400 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      overallBudget.compliance.isOverBudget ? 'bg-red-400' : 'bg-white'
                    }`}
                    style={{ width: `${Math.min(100, overallBudget.compliance.percentage)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No budgets set. Create one to start tracking your spending!
          </div>
        ) : (
          budgets.map((budget) => (
            <div key={budget.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Target className="w-5 h-5 text-primary-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">{budget.category}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(budget)}
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Budget:</span>
                  <span className="font-medium">${budget.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Period:</span>
                  <span className="font-medium capitalize">{budget.period}</span>
                </div>
                {budget.compliance && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Spent:</span>
                      <span className={`font-medium ${budget.compliance.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                        ${budget.compliance.spent.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Remaining:</span>
                      <span className={`font-medium ${budget.compliance.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${budget.compliance.remaining.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{budget.compliance.percentage.toFixed(0)}% used</span>
                        <span>{budget.compliance.isOverBudget ? 'Over budget!' : 'On track'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            budget.compliance.isOverBudget ? 'bg-red-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${Math.min(100, budget.compliance.percentage)}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {editingBudget ? 'Edit Budget' : 'Add Budget'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    required
                    defaultValue={editingBudget?.category || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    defaultValue={editingBudget?.amount || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <select
                    name="period"
                    required
                    defaultValue={editingBudget?.period || 'monthly'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    defaultValue={editingBudget?.start_date || format(new Date(), 'yyyy-MM-dd')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={editingBudget?.end_date || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBudget(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {editingBudget ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overall Budget Modal */}
      {showOverallModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {overallBudget ? 'Edit Overall Budget' : 'Set Overall Budget'}
            </h3>
            <form onSubmit={handleOverallBudgetSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Budget Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    defaultValue={overallBudget?.amount || ''}
                    placeholder="e.g., 3000"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Total amount you want to spend per month across all categories</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <select
                    name="period"
                    required
                    defaultValue={overallBudget?.period || 'monthly'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    defaultValue={overallBudget?.start_date || format(new Date(), 'yyyy-MM-dd')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={overallBudget?.end_date || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverallModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {overallBudget ? 'Update' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

