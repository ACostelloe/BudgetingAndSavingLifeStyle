import { useEffect, useState } from 'react';
import { Plus, Upload, Edit2, Trash2, Trash } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  source: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.map((c: any) => c.name));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
      setSelectedIds(new Set());
      // Notify dashboard to refresh
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('Please select transactions to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} transaction(s)?`)) return;
    
    try {
      await api.delete('/transactions/bulk', {
        data: { ids: Array.from(selectedIds) }
      });
      setSelectedIds(new Set());
      fetchTransactions();
      // Notify dashboard to refresh
      window.dispatchEvent(new Event('transaction-updated'));
      alert(`Successfully deleted ${selectedIds.size} transaction(s)`);
    } catch (error: any) {
      console.error('Failed to delete transactions:', error);
      alert(error.response?.data?.error || 'Failed to delete transactions');
    }
  };

  const handleDeleteAllPDFImports = async () => {
    const pdfImports = transactions.filter(t => t.source === 'pdf_import');
    if (pdfImports.length === 0) {
      alert('No PDF imports found');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete all ${pdfImports.length} PDF imported transactions?`)) return;
    
    try {
      await api.delete('/transactions/bulk', {
        data: { source: 'pdf_import' }
      });
      setSelectedIds(new Set());
      fetchTransactions();
      // Notify dashboard to refresh
      window.dispatchEvent(new Event('transaction-updated'));
      alert(`Successfully deleted ${pdfImports.length} PDF imported transaction(s)`);
    } catch (error: any) {
      console.error('Failed to delete PDF imports:', error);
      alert(error.response?.data?.error || 'Failed to delete PDF imports');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      let message = `Successfully imported ${res.data.transactions.length} transaction${res.data.transactions.length !== 1 ? 's' : ''}!`;
      
      // Validation results
      if (res.data.validation) {
        const val = res.data.validation;
        message += `\n\n--- PDF Validation ---`;
        if (val.isValid) {
          message += `\n✓ All transactions validated successfully!`;
        } else {
          message += `\n⚠ Validation warnings detected:`;
          if (val.differences.creditsDiff > 0.10) {
            message += `\n  - Credits difference: $${val.differences.creditsDiff.toFixed(2)}`;
          }
          if (val.differences.debitsDiff > 0.10) {
            message += `\n  - Debits difference: $${val.differences.debitsDiff.toFixed(2)}`;
          }
          if (val.differences.closingBalanceDiff !== null && val.differences.closingBalanceDiff > 0.10) {
            message += `\n  - Closing balance difference: $${val.differences.closingBalanceDiff.toFixed(2)}`;
          }
        }
        if (val.summary.openingBalance !== null) {
          message += `\nOpening Balance: $${val.summary.openingBalance.toFixed(2)}`;
        }
        if (val.summary.closingBalance !== null) {
          message += `\nClosing Balance: $${val.summary.closingBalance.toFixed(2)}`;
        }
        message += `\nTotal Credits: $${val.calculatedTotals.credits.toFixed(2)}`;
        message += `\nTotal Debits: $${val.calculatedTotals.debits.toFixed(2)}`;
      }
      
      // Show categorization stats
      if (res.data.categorization) {
        const cat = res.data.categorization;
        message += `\n\n--- Categorization Summary ---`;
        message += `\nTotal categories identified: ${cat.totalCategories}`;
        if (cat.otherCount > 0) {
          message += `\nTransactions categorized as 'Other': ${cat.otherCount}`;
        }
        
        // Show top categories
        const topCategories = Object.entries(cat.categoryBreakdown)
          .filter(([cat]) => cat !== 'Other')
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 5)
          .map(([cat, count]: any) => `${cat} (${count})`)
          .join(', ');
        
        if (topCategories) {
          message += `\nTop categories: ${topCategories}`;
        }
      }
      
      if (res.data.budgetsCreated > 0) {
        const categoryBudgets = res.data.budgets.filter((b: any) => !b.isOverall);
        const overallBudget = res.data.budgets.find((b: any) => b.isOverall);
        
        message += `\n\n✨ ${res.data.budgetsCreated} budget${res.data.budgetsCreated !== 1 ? 's' : ''} automatically created!`;
        
        if (overallBudget) {
          message += `\n\n💰 Overall Monthly Budget: $${overallBudget.amount.toFixed(2)}`;
        }
        
        if (categoryBudgets.length > 0) {
          message += `\n\n📊 Category Budgets: ${categoryBudgets.map((b: any) => b.category).join(', ')}`;
        }
        
        message += `\n\nCheck the Budgets page to review and adjust them.`;
      }
      
      if (res.data.savingsGoalsCreated > 0) {
        message += `\n\n🎯 ${res.data.savingsGoalsCreated} savings goal${res.data.savingsGoalsCreated !== 1 ? 's' : ''} suggested!`;
        res.data.savingsGoals.forEach((goal: any) => {
          message += `\n  - ${goal.name}: $${goal.target_amount.toFixed(2)}`;
          if (goal.reason) {
            message += `\n    ${goal.reason}`;
          }
        });
        message += `\n\nCheck the Savings Goals page to review them.`;
      }
      
      alert(message);
      setShowUploadModal(false);
      fetchTransactions();
      // Notify dashboard to refresh
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      date: formData.get('date'),
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category'),
      type: formData.get('type'),
    };

    try {
      if (editingTransaction) {
        await api.put(`/transactions/${editingTransaction.id}`, data);
      } else {
        await api.post('/transactions', data);
      }
      setShowAddModal(false);
      setEditingTransaction(null);
      fetchTransactions();
      // Notify dashboard to refresh
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save transaction');
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Transactions</h2>
        <div className="flex gap-2">
          {transactions.some(t => t.source === 'pdf_import') && (
            <button
              onClick={handleDeleteAllPDFImports}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete All PDF Imports
            </button>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </button>
          <button
            onClick={() => {
              setEditingTransaction(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-900">
            {selectedIds.size} transaction(s) selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {transactions.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === transactions.length && transactions.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Select All</span>
            </label>
          </div>
        )}
        <ul className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">
              No transactions yet. Add one or upload a PDF to get started!
            </li>
          ) : (
            transactions.map((transaction) => (
              <li 
                key={transaction.id} 
                className={`px-6 py-4 hover:bg-gray-50 ${selectedIds.has(transaction.id) ? 'bg-primary-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {transaction.category}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>{format(new Date(transaction.date), 'MMM d, yyyy')}</span>
                        {transaction.source && (
                          <span className="ml-2 text-xs text-gray-400">• {transaction.source}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-lg font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(transaction)}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editingTransaction?.date || format(new Date(), 'yyyy-MM-dd')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    name="description"
                    required
                    defaultValue={editingTransaction?.description || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    defaultValue={editingTransaction?.amount || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    name="type"
                    required
                    defaultValue={editingTransaction?.type || 'expense'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    defaultValue={editingTransaction?.category || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Auto-categorize</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTransaction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {editingTransaction ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Upload Bank Statement PDF</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a PDF of your bank statement to automatically import transactions.
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <button
              onClick={() => setShowUploadModal(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

