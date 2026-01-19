import { useEffect, useState } from 'react';
import { Plus, Target, TrendingUp, Calendar, Edit2, Trash2, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category: string | null;
  description: string | null;
  is_completed: number;
  progress: number;
  daysRemaining: number | null;
}

export default function SavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchGoals();
    fetchCategories();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await api.get('/savings-goals');
      setGoals(res.data);
    } catch (error) {
      console.error('Failed to fetch savings goals:', error);
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
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await api.delete(`/savings-goals/${id}`);
      fetchGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete savings goal');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      target_amount: parseFloat(formData.get('target_amount') as string),
      target_date: formData.get('target_date') || null,
      category: formData.get('category') || null,
      description: formData.get('description') || null,
    };

    try {
      if (editingGoal) {
        await api.put(`/savings-goals/${editingGoal.id}`, data);
      } else {
        await api.post('/savings-goals', data);
      }
      setShowAddModal(false);
      setEditingGoal(null);
      fetchGoals();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save savings goal');
    }
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setShowAddModal(true);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Savings Goals</h2>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No savings goals set. Create one to start tracking your progress!
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className={`bg-white shadow rounded-lg p-6 ${
                goal.is_completed ? 'border-2 border-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {goal.is_completed ? (
                    <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                  ) : (
                    <Target className="w-6 h-6 text-primary-600 mr-2" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(goal)}
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {goal.description && (
                <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Progress:</span>
                  <span className="text-lg font-bold text-primary-600">
                    ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      goal.is_completed ? 'bg-green-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(100, goal.progress)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>{goal.progress.toFixed(0)}% complete</span>
                  {goal.daysRemaining !== null && (
                    <span>
                      {goal.daysRemaining > 0
                        ? `${goal.daysRemaining} days left`
                        : goal.daysRemaining === 0
                        ? 'Due today!'
                        : `${Math.abs(goal.daysRemaining)} days overdue`}
                    </span>
                  )}
                </div>

                {goal.category && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Category:</span>
                    <span className="ml-2">{goal.category}</span>
                  </div>
                )}

                {goal.target_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Target: {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}

                {goal.is_completed && (
                  <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700 font-medium">
                    🎉 Goal Achieved!
                  </div>
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
              {editingGoal ? 'Edit Savings Goal' : 'Add Savings Goal'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Goal Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingGoal?.name || ''}
                    placeholder="e.g., Emergency Fund"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="target_amount"
                    required
                    defaultValue={editingGoal?.target_amount || ''}
                    placeholder="e.g., 5000"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category (optional - links to budget)
                  </label>
                  <select
                    name="category"
                    defaultValue={editingGoal?.category || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">None (Overall Savings)</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Link to a category budget to track savings from that category
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Target Date (optional)
                  </label>
                  <input
                    type="date"
                    name="target_date"
                    defaultValue={editingGoal?.target_date || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingGoal?.description || ''}
                    placeholder="What are you saving for?"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGoal(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {editingGoal ? 'Update' : 'Add Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

