import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  PlusCircle,
  FileText,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { getVoucherTypeStyle } from '../../utils/voucherConfig';
import { generateProfitAndLoss } from '../../services/accountingEngine';

export const DashboardView: React.FC<{
  onOpenSaleModal: () => void;
  onOpenVoucherModal: () => void;
  onOpenPurchaseModal: () => void;
}> = ({ onOpenSaleModal, onOpenVoucherModal, onOpenPurchaseModal }) => {
  const {
    language,
    currentCompany,
    currentBranchId,
    currentBranch,
    sales,
    purchases,
    vouchers,
    products,
    customers,
    suppliers,
    accounts,
    setActiveTab,
  } = useERP();

  const t = translations[language];
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year'>('month');

  // Filter dates
  const todayStr = '2026-10-20'; // Current system anchor date

  // Filtered sales and purchases based on time range
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (currentBranchId !== 'all' && s.branchId !== currentBranchId) return false;
      if (timeFilter === 'today') return s.date === todayStr;
      if (timeFilter === 'month') return s.date.startsWith('2026-10');
      if (timeFilter === 'year') return s.date.startsWith('2026');
      return true;
    });
  }, [sales, currentBranchId, timeFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (currentBranchId !== 'all' && p.branchId !== currentBranchId) return false;
      if (timeFilter === 'today') return p.date === todayStr;
      if (timeFilter === 'month') return p.date.startsWith('2026-10');
      if (timeFilter === 'year') return p.date.startsWith('2026');
      return true;
    });
  }, [purchases, currentBranchId, timeFilter]);

  // Aggregate metrics
  const totalSalesAmount = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalPurchasesAmount = filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);

  // Cash and Bank accounts
  const cashAccounts = accounts.filter((a) => a.subType === 'cash');
  const bankAccounts = accounts.filter((a) => a.subType === 'bank');
  const totalCash = cashAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalBank = bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  // Accounts Receivable and Payable
  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);
  const totalPayable = suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0);

  // Inventory valuation
  const totalInventoryValuation = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = currentBranchId === 'all'
        ? Object.values(p.branchStock || {}).reduce((s, q) => s + q, 0)
        : (p.branchStock?.[currentBranchId] || 0);
      return acc + stock * (p.purchasePrice || 0);
    }, 0);
  }, [products, currentBranchId]);

  // P&L calculation
  const pl = useMemo(() => generateProfitAndLoss(accounts, vouchers), [accounts, vouchers]);

  // Low stock items
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = currentBranchId === 'all'
        ? Object.values(p.branchStock || {}).reduce((s, q) => s + q, 0)
        : (p.branchStock?.[currentBranchId] || 0);
      return stock <= (p.minStockAlert || 0);
    });
  }, [products, currentBranchId]);

  // Recent vouchers
  const recentVouchers = useMemo(() => {
    return vouchers.slice(0, 5);
  }, [vouchers]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {currentCompany?.name || 'Enterprise Workspace'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentBranch ? currentBranch.name : t.allBranches} · {t.tagline}
          </p>
        </div>

        {/* Filters & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Time Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                timeFilter === 'today' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.filterToday}
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                timeFilter === 'month' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.filterThisMonth}
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                timeFilter === 'year' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.filterThisYear}
            </button>
          </div>

          <button
            onClick={onOpenSaleModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t.newSale}</span>
          </button>
          <button
            onClick={onOpenVoucherModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{t.newVoucher}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (60-30-10 palette, tabular numerals, clean subtle borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t.todaySales} ({timeFilter})</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatBDT(totalSalesAmount)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +14.2%
            </span>
            <span>vs previous period</span>
          </div>
        </div>

        {/* Purchases Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t.todayPurchases}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatBDT(totalPurchasesAmount)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {filteredPurchases.length} supplier orders
            </span>
          </div>
        </div>

        {/* Cash & Bank Balances */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Liquidity (Cash & Bank)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatBDT(totalCash + totalBank)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Cash: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatBDT(totalCash)}</strong></span>
            <span>Bank: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatBDT(totalBank)}</strong></span>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">{t.inventoryValue}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatBDT(totalInventoryValuation)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>Across {products.length} SKUs in catalog</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row: Receivables, Payables, Gross Profit & Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receivables */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.receivables} (Customer Due)</span>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-400 font-mono tabular-nums mt-1">
            {formatBDT(totalReceivable)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {customers.filter((c) => c.currentBalance > 0).length} customers with outstanding balances
          </p>
        </div>

        {/* Payables */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.payables} (Supplier Due)</span>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono tabular-nums mt-1">
            {formatBDT(totalPayable)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {suppliers.filter((s) => s.currentBalance > 0).length} pending vendor bills
          </p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.grossProfit}</span>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {formatBDT(pl.grossProfit)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Revenue minus COGS from posted journals
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.netProfit}</span>
          <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${pl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {formatBDT(pl.netProfit)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            After operating expenses (Rent, Utilities, Staff)
          </p>
        </div>
      </div>

      {/* Main Content Grid: Chart & Trends + Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Financial Momentum Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.salesTrend}
              </h2>
              <p className="text-xs text-slate-500">
                Monthly revenue trajectory & double-entry transactions
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Fiscal Year 2026</span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2">
            {[
              { month: 'May', sales: 420000, purchases: 310000 },
              { month: 'Jun', sales: 510000, purchases: 380000 },
              { month: 'Jul', sales: 640000, purchases: 490000 },
              { month: 'Aug', sales: 580000, purchases: 440000 },
              { month: 'Sep', sales: 720000, purchases: 530000 },
              { month: 'Oct', sales: 840000, purchases: 610000 },
            ].map((d) => {
              const maxVal = 900000;
              const salesHeight = (d.sales / maxVal) * 100;
              const purchHeight = (d.purchases / maxVal) * 100;

              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Sales Bar */}
                    <div
                      style={{ height: `${salesHeight}%` }}
                      className="w-1/2 max-w-[24px] bg-rose-600 rounded-t-sm transition-all hover:bg-rose-700 relative group cursor-pointer"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        Sales: {formatBDT(d.sales)}
                      </div>
                    </div>

                    {/* Purchase Bar */}
                    <div
                      style={{ height: `${purchHeight}%` }}
                      className="w-1/2 max-w-[24px] bg-emerald-600 rounded-t-sm transition-all hover:bg-emerald-700 relative group cursor-pointer"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        Purch: {formatBDT(d.purchases)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{d.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 bg-rose-600 rounded-xs" />
              Gross Sales (Revenue)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 bg-emerald-600 rounded-xs" />
              Inventory Procurements
            </span>
          </div>
        </div>

        {/* Low Stock Alerts & Fast Selling Items */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.lowStockAlerts}
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              View Inventory
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                All inventory items are currently above safety thresholds.
              </p>
            ) : (
              lowStockProducts.map((p) => {
                const totalStock = Object.values(p.branchStock || {}).reduce((a, b) => a + b, 0);
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        SKU: {p.sku} · Alert: {p.minStockAlert} {p.uom}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                        {totalStock} {p.uom} left
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-center">
            <button
              onClick={onOpenPurchaseModal}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition-colors"
            >
              Order Low Stock Supplies
            </button>
          </div>
        </div>
      </div>

      {/* Recent Color-Coded Vouchers List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.recentTransactions}
            </h2>
            <p className="text-xs text-slate-500">
              Live double-entry vouchers across all branches
            </p>
          </div>
          <button
            onClick={() => setActiveTab('vouchers')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700"
          >
            All Vouchers →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Narration</th>
                <th className="py-2.5 px-4">Party</th>
                <th className="py-2.5 px-4 text-right">Debit (Dr)</th>
                <th className="py-2.5 px-4 text-right">Credit (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentVouchers.map((v) => {
                const style = getVoucherTypeStyle(v.type, currentCompany.settings?.voucherColors);
                return (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {v.voucherNo}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        style={{
                          backgroundColor: style.bgHex,
                          color: style.textHex,
                          borderColor: style.borderHex,
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold border inline-flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.colorHex }} />
                        {style.nameEn}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {formatDateBD(v.date)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {v.narration}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                      {v.partyName || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(v.totalDebit)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(v.totalCredit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
