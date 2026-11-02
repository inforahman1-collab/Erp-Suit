import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Building2,
  Edit2,
  Trash2,
  X,
  PieChart,
  Coins,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Budget } from '../../types/erp';
import { formatBDT, formatCurrency } from '../../utils/i18n';

export const BudgetsView: React.FC = () => {
  const {
    currentCompany,
    budgets,
    accounts,
    addBudget,
    updateBudget,
    deleteBudget,
    updateCompanySettings,
    convertCurrency,
  } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form State
  const [budgetName, setBudgetName] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<'expense' | 'sales_target' | 'procurement' | 'capex'>('expense');
  const [budgetAccountId, setBudgetAccountId] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [budgetPeriodName, setBudgetPeriodName] = useState('2026-Q1');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [budgetCurrency, setBudgetCurrency] = useState(currentCompany.settings.baseCurrency || 'BDT');
  const [budgetAmount, setBudgetAmount] = useState<number | ''>(500000);
  const [thresholdPercent, setThresholdPercent] = useState<number>(80);
  const [budgetNotes, setBudgetNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Budget Policy controls
  const budgetSettings = currentCompany.settings.budgetSettings || {
    enforceBudgetLimits: true,
    warningThreshold: 80,
    autoNotifyExceeded: true,
    defaultPeriod: 'quarterly',
  };

  const currencyList = currentCompany.settings.currencies || [];
  const baseCurrencyCode = currentCompany.settings.baseCurrency || currentCompany.settings.currency || 'BDT';
  const selectedCurRate = currencyList.find((c) => c.code === budgetCurrency)?.rateToBase || 1;

  // Filtered Budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (selectedPeriod !== 'all' && b.periodName !== selectedPeriod) return false;
      if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesAcc = (b.accountName || '').toLowerCase().includes(q);
        const matchesPeriod = b.periodName.toLowerCase().includes(q);
        if (!matchesName && !matchesAcc && !matchesPeriod) return false;
      }
      return true;
    });
  }, [budgets, selectedPeriod, selectedCategory, searchQuery]);

  // Executive Metrics
  const metrics = useMemo(() => {
    let totalBudgetBase = 0;
    let totalActualBase = 0;
    let totalExpensesBudget = 0;
    let totalExpensesActual = 0;
    let totalSalesTarget = 0;
    let totalSalesActual = 0;

    budgets.forEach((b) => {
      totalBudgetBase += b.baseCurrencyAmount || 0;
      totalActualBase += b.actualAmount || 0;

      if (b.category === 'expense' || b.category === 'procurement' || b.category === 'capex') {
        totalExpensesBudget += b.baseCurrencyAmount || 0;
        totalExpensesActual += b.actualAmount || 0;
      } else if (b.category === 'sales_target') {
        totalSalesTarget += b.baseCurrencyAmount || 0;
        totalSalesActual += b.actualAmount || 0;
      }
    });

    const netVariance = totalBudgetBase - totalActualBase;
    const expenseUtilization = totalExpensesBudget > 0 ? (totalExpensesActual / totalExpensesBudget) * 100 : 0;
    const salesAttainment = totalSalesTarget > 0 ? (totalSalesActual / totalSalesTarget) * 100 : 0;
    const exceededCount = budgets.filter((b) => b.actualAmount > b.baseCurrencyAmount).length;

    return {
      totalBudgetBase,
      totalActualBase,
      netVariance,
      totalExpensesBudget,
      totalExpensesActual,
      expenseUtilization,
      totalSalesTarget,
      totalSalesActual,
      salesAttainment,
      exceededCount,
    };
  }, [budgets]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingBudget(null);
    setBudgetName('');
    setBudgetCategory('procurement');
    setBudgetAccountId('');
    setBudgetPeriod('quarterly');
    setBudgetPeriodName('2026-Q1');
    setStartDate('2026-01-01');
    setEndDate('2026-03-31');
    setBudgetCurrency(baseCurrencyCode);
    setBudgetAmount(500000);
    setThresholdPercent(80);
    setBudgetNotes('');
    setFormError(null);
    setIsOpenModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setBudgetName(b.name);
    setBudgetCategory(b.category);
    setBudgetAccountId(b.accountId || '');
    setBudgetPeriod(b.period);
    setBudgetPeriodName(b.periodName);
    setStartDate(b.startDate);
    setEndDate(b.endDate);
    setBudgetCurrency(b.currency);
    setBudgetAmount(b.budgetAmount);
    setThresholdPercent(b.warningThresholdPercent || 80);
    setBudgetNotes(b.notes || '');
    setFormError(null);
    setIsOpenModal(true);
  };

  // Submit Budget Form
  const handleSubmitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetName.trim()) {
      setFormError('Please enter a descriptive budget target name.');
      return;
    }
    if (!budgetAmount || Number(budgetAmount) <= 0) {
      setFormError('Please specify a positive budget amount.');
      return;
    }

    const linkedAcc = accounts.find((a) => a.id === budgetAccountId);

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        name: budgetName.trim(),
        category: budgetCategory,
        accountId: budgetAccountId || undefined,
        accountName: linkedAcc?.name,
        period: budgetPeriod,
        periodName: budgetPeriodName,
        startDate,
        endDate,
        currency: budgetCurrency,
        budgetAmount: Number(budgetAmount),
        warningThresholdPercent: Number(thresholdPercent),
        notes: budgetNotes.trim(),
      });
    } else {
      addBudget({
        name: budgetName.trim(),
        category: budgetCategory,
        accountId: budgetAccountId || undefined,
        accountName: linkedAcc?.name,
        period: budgetPeriod,
        periodName: budgetPeriodName,
        startDate,
        endDate,
        currency: budgetCurrency,
        budgetAmount: Number(budgetAmount),
        warningThresholdPercent: Number(thresholdPercent),
        notes: budgetNotes.trim(),
      });
    }

    setIsOpenModal(false);
  };

  const handleToggleEnforceLimits = () => {
    updateCompanySettings({
      budgetSettings: {
        ...budgetSettings,
        enforceBudgetLimits: !budgetSettings.enforceBudgetLimits,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>Corporate Budgets & Financial Target Planning</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-currency budget allocations, spend variance analysis, threshold alerts, and real-time ledger synchronization
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleEnforceLimits}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              budgetSettings.enforceBudgetLimits
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title="Toggle automated budget warnings when creating purchases or sales"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Budget Control: {budgetSettings.enforceBudgetLimits ? 'Active (Strict)' : 'Advisory Only'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Budget Allocation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Consolidated Budget</span>
            <Coins className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatBDT(metrics.totalBudgetBase)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Base: {baseCurrencyCode}</span>
            <span>{budgets.length} Targets Defined</span>
          </div>
        </div>

        {/* Total Actual Spend & Revenue */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Actual Spend / Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatBDT(metrics.totalActualBase)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Overall Consumed</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {metrics.totalBudgetBase > 0 ? ((metrics.totalActualBase / metrics.totalBudgetBase) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* Procurement & Expense Utilization */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Expense & Procurement</span>
            <PieChart className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatBDT(metrics.totalExpensesActual)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Allocated: {formatBDT(metrics.totalExpensesBudget)}</span>
            <span
              className={`font-bold font-mono ${
                metrics.expenseUtilization > 90 ? 'text-rose-600' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {metrics.expenseUtilization.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Sales Target Attainment */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Sales Revenue Target</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatBDT(metrics.totalSalesActual)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Goal: {formatBDT(metrics.totalSalesTarget)}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {metrics.salesAttainment.toFixed(1)}% Attained
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search budget title, category, or chart of account..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Fiscal Periods</option>
              <option value="2026-Q1">2026-Q1</option>
              <option value="2026-Q2">2026-Q2</option>
              <option value="FY-2026">FY-2026 Annual</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="procurement">Procurement (Purchases)</option>
              <option value="sales_target">Sales Target</option>
              <option value="expense">Operating Expense</option>
              <option value="capex">Capital Expenditure (Capex)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Budgets List & Variance Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Budget Name & Category</th>
                <th className="py-3 px-4">Period & Timeline</th>
                <th className="py-3 px-4">Budgeted Target</th>
                <th className="py-3 px-4">Actual Recorded</th>
                <th className="py-3 px-4">Variance / Balance</th>
                <th className="py-3 px-4 min-w-[150px]">Budget Utilization</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-xs">No budget targets match the selected criteria.</p>
                    <button
                      onClick={handleOpenCreate}
                      className="mt-3 text-rose-600 dark:text-rose-400 text-xs font-bold underline"
                    >
                      Create first budget allocation
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((b) => {
                  const utilization = b.baseCurrencyAmount > 0 ? (b.actualAmount / b.baseCurrencyAmount) * 100 : 0;
                  const isOver = b.actualAmount > b.baseCurrencyAmount;
                  const isWarning = utilization >= (b.warningThresholdPercent || 80);
                  const isSales = b.category === 'sales_target';
                  const remaining = b.baseCurrencyAmount - b.actualAmount;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{b.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              b.category === 'procurement'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                : b.category === 'sales_target'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : b.category === 'capex'
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            {b.category.replace('_', ' ')}
                          </span>
                          {b.accountName && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {b.accountName}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{b.periodName}</div>
                        <div className="text-[10px] text-slate-400">
                          {b.startDate} to {b.endDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(b.budgetAmount, b.currency)}
                        </div>
                        {b.currency !== baseCurrencyCode && (
                          <div className="text-[10px] text-slate-400">
                            ≈ {formatBDT(b.baseCurrencyAmount)} (FX {b.exchangeRate})
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatBDT(b.actualAmount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div
                          className={`font-bold ${
                            isSales
                              ? remaining <= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                              : remaining < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {remaining < 0 ? '-' : ''}
                          {formatBDT(Math.abs(remaining))}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isSales
                            ? remaining <= 0
                              ? 'Target Exceeded!'
                              : 'Pending Target'
                            : remaining < 0
                            ? 'Over Budget'
                            : 'Remaining'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-500">{utilization.toFixed(1)}%</span>
                            <span className="text-[10px] text-slate-400">
                              Limit: {b.warningThresholdPercent || 80}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isSales
                                  ? utilization >= 100
                                    ? 'bg-emerald-500'
                                    : 'bg-indigo-500'
                                  : isOver
                                  ? 'bg-rose-500'
                                  : isWarning
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, utilization)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isSales ? (
                          utilization >= 100 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Goal Met
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              In Progress
                            </span>
                          )
                        ) : isOver ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Over Budget</span>
                          </span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Warning
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Edit Budget Target"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete budget "${b.name}"?`)) {
                                deleteBudget(b.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Delete Budget Target"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Budget Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingBudget ? 'Edit Budget Target' : 'Create New Budget Allocation'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBudget} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Title *
                </label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="e.g. Q1 Wholesale Merchandise Procurement"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Type *
                  </label>
                  <select
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="procurement">Procurement (Vendor Purchases)</option>
                    <option value="sales_target">Sales Revenue Target</option>
                    <option value="expense">Operating Expense</option>
                    <option value="capex">Capital Expenditure (Capex / Assets)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Linked Chart of Account (Optional)
                  </label>
                  <select
                    value={budgetAccountId}
                    onChange={(e) => setBudgetAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="">General (No specific account)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Period Frequency
                  </label>
                  <select
                    value={budgetPeriod}
                    onChange={(e) => setBudgetPeriod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Period Label
                  </label>
                  <input
                    type="text"
                    value={budgetPeriodName}
                    onChange={(e) => setBudgetPeriodName(e.target.value)}
                    placeholder="e.g. 2026-Q1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Warning Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={thresholdPercent}
                    onChange={(e) => setThresholdPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Multi-Currency Budget Definition */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-rose-600" />
                    <span>Budget Currency & FX Valuation</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    FX Rate: 1 {budgetCurrency} = {selectedCurRate} {baseCurrencyCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Currency (Base or Secondary)
                    </label>
                    <select
                      value={budgetCurrency}
                      onChange={(e) => setBudgetCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    >
                      {currencyList.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name} {c.code === baseCurrencyCode ? '[Base]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Target Amount ({budgetCurrency}) *
                    </label>
                    <input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                {budgetCurrency !== baseCurrencyCode && Number(budgetAmount) > 0 && (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs flex items-center justify-between text-indigo-900 dark:text-indigo-200">
                    <span>Base Currency Consolidated Equivalent:</span>
                    <span className="font-mono font-black text-sm">
                      {formatBDT(Number(budgetAmount) * selectedCurRate)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Notes & Strategy
                </label>
                <textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={(e) => setBudgetNotes(e.target.value)}
                  placeholder="Business context, department allocation guidelines, or procurement strategy..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  {editingBudget ? 'Save Changes' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
