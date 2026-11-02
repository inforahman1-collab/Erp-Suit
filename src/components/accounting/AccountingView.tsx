import React, { useState, useMemo } from 'react';
import {
  Scale,
  BookOpen,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  Plus,
  Edit3,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Account, Voucher } from '../../types/erp';
import {
  generateTrialBalance,
  generateProfitAndLoss,
  generateBalanceSheet,
  generateGeneralLedger,
} from '../../services/accountingEngine';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { printElementContent } from '../../utils/printEngine';
import { LedgerAlterModal } from './LedgerAlterModal';

export const AccountingView: React.FC = () => {
  const { language, currentCompany, accounts, vouchers } = useERP();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<
    'trial_balance' | 'profit_loss' | 'balance_sheet' | 'general_ledger' | 'cash_bank' | 'chart_of_accounts'
  >('trial_balance');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [alteringAccount, setAlteringAccount] = useState<Account | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Accounting Engine reports
  const trialBalance = useMemo(() => generateTrialBalance(accounts, vouchers), [accounts, vouchers]);
  const profitAndLoss = useMemo(() => generateProfitAndLoss(accounts, vouchers), [accounts, vouchers]);
  const balanceSheet = useMemo(() => generateBalanceSheet(accounts, vouchers), [accounts, vouchers]);

  // Selected Account for General Ledger
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const generalLedgerRows = useMemo(() => {
    if (!selectedAccount) return [];
    return generateGeneralLedger(selectedAccount, vouchers);
  }, [selectedAccount, vouchers]);

  // Cash and Bank books
  const cashAccounts = accounts.filter((a) => a.subType === 'cash');
  const bankAccounts = accounts.filter((a) => a.subType === 'bank');

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.accounting}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strict double-entry ledger engine, balancing trial balances, P&L, and balance sheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trialBalance.isBalanced ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Trial Balance In Perfect Balance</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>Trial Balance Discrepancy</span>
            </div>
          )}

          <button
            onClick={() => {
              setAlteringAccount(null);
              setIsCreatingAccount(true);
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Ledger (নতুন লেজার)</span>
          </button>

          <button
            onClick={() =>
              printElementContent(
                'accounting-statement-content',
                `Financial Statement - ${activeTab.replace('_', ' ').toUpperCase()}`,
                currentCompany.name
              )
            }
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report (Isolated)</span>
          </button>
        </div>
      </div>

      {/* Financial Statement Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'trial_balance', label: t.trialBalance },
          { id: 'profit_loss', label: t.profitAndLoss },
          { id: 'balance_sheet', label: t.balanceSheet },
          { id: 'general_ledger', label: t.generalLedger },
          { id: 'cash_bank', label: `${t.cashBook} & ${t.bankBook}` },
          { id: 'chart_of_accounts', label: t.chartOfAccounts },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id="accounting-statement-content">
      {/* 1. TRIAL BALANCE TAB */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Trial Balance (রেওয়ামিল)
              </h2>
              <p className="text-xs text-slate-500">
                As of {formatDateBD(new Date().toISOString().split('T')[0])} · All general ledger balances
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {trialBalance.isBalanced ? 'Balanced: Dr = Cr' : 'Unbalanced'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Account Title</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Debit (Dr ৳)</th>
                  <th className="py-2.5 px-4 text-right">Credit (Cr ৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trialBalance.items.map((item) => (
                  <tr key={item.accountId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {item.accountCode}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.accountName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 uppercase text-[10px] font-bold">
                      {item.accountType}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {item.debit > 0 ? formatBDT(item.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {item.credit > 0 ? formatBDT(item.credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right uppercase text-xs">
                    Total Trial Balance Verification:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-rose-600 dark:text-rose-400">
                    {formatBDT(trialBalance.totalDebit)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatBDT(trialBalance.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. PROFIT & LOSS STATEMENT TAB */}
      {activeTab === 'profit_loss' && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-6">
          <div className="text-center border-b pb-4 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {currentCompany.name}
            </h2>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Profit & Loss Statement (লাভ-ক্ষতি বিবরণী)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              For the Period Ended {formatDateBD(new Date().toISOString().split('T')[0])}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Operating Revenues */}
            <div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                <span className="uppercase tracking-wider">I. Operating Revenue</span>
                <span>Amount (৳)</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 py-1">
                {profitAndLoss.operatingRevenue.length === 0 ? (
                  <p className="py-2 text-slate-400">No sales revenue posted in this period.</p>
                ) : (
                  profitAndLoss.operatingRevenue.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-slate-700 dark:text-slate-300">
                      <span>{r.name}</span>
                      <span className="font-mono tabular-nums font-semibold">{formatBDT(r.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                <span>Total Operating Revenue:</span>
                <span className="font-mono tabular-nums">{formatBDT(profitAndLoss.totalRevenue)}</span>
              </div>
            </div>

            {/* Cost of Sales */}
            <div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                <span className="uppercase tracking-wider">II. Cost of Goods Sold (COGS)</span>
                <span>Amount (৳)</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 py-1">
                {profitAndLoss.costOfSales.length === 0 ? (
                  <p className="py-2 text-slate-400">No cost of goods sold entries posted.</p>
                ) : (
                  profitAndLoss.costOfSales.map((c, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-slate-700 dark:text-slate-300">
                      <span>{c.name}</span>
                      <span className="font-mono tabular-nums font-semibold">({formatBDT(c.amount)})</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                <span>Total Cost of Goods Sold:</span>
                <span className="font-mono tabular-nums">({formatBDT(profitAndLoss.totalCostOfSales)})</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between font-bold text-sm text-slate-900 dark:text-white">
              <span>GROSS PROFIT (মোট লাভ):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatBDT(profitAndLoss.grossProfit)}
              </span>
            </div>

            {/* Operating Expenses */}
            <div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                <span className="uppercase tracking-wider">III. Operating Expenses</span>
                <span>Amount (৳)</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 py-1">
                {profitAndLoss.operatingExpenses.map((exp, i) => (
                  <div key={i} className="flex justify-between py-1.5 text-slate-700 dark:text-slate-300">
                    <span>{exp.name}</span>
                    <span className="font-mono tabular-nums font-semibold">{formatBDT(exp.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                <span>Total Operating Expenses:</span>
                <span className="font-mono tabular-nums">({formatBDT(profitAndLoss.totalExpenses)})</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex justify-between font-bold text-base text-slate-900 dark:text-white">
              <span>NET PROFIT / INCOME (নিট লাভ):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatBDT(profitAndLoss.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. BALANCE SHEET TAB */}
      {activeTab === 'balance_sheet' && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-6">
          <div className="text-center border-b pb-4 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {currentCompany.name}
            </h2>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Balance Sheet (উদ্বৃত্তপত্র / আর্থিক অবস্থার বিবরণী)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              As of {formatDateBD(new Date().toISOString().split('T')[0])} · Strict Assets = Liabilities + Equity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left: Assets */}
            <div className="space-y-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide text-xs">
                Assets (সম্পদসমূহ)
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b">Current Assets:</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {balanceSheet.assets.current.map((a, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-slate-600 dark:text-slate-300">
                      <span>{a.name}</span>
                      <span className="font-mono tabular-nums font-semibold">{formatBDT(a.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b">Non-Current / Fixed Assets:</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {balanceSheet.assets.fixed.map((a, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-slate-600 dark:text-slate-300">
                      <span>{a.name}</span>
                      <span className="font-mono tabular-nums font-semibold">{formatBDT(a.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>TOTAL ASSETS:</span>
                <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {formatBDT(balanceSheet.assets.total)}
                </span>
              </div>
            </div>

            {/* Right: Liabilities & Equity */}
            <div className="space-y-4">
              <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-lg font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide text-xs">
                Liabilities & Equity (দায় ও মালিকানা স্বত্ব)
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b">Current Liabilities:</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {balanceSheet.liabilities.current.map((l, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-slate-600 dark:text-slate-300">
                      <span>{l.name}</span>
                      <span className="font-mono tabular-nums font-semibold">{formatBDT(l.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b">Owner's Equity & Retained Earnings:</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {balanceSheet.equity.capital.map((e, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-slate-600 dark:text-slate-300">
                      <span>{e.name}</span>
                      <span className="font-mono tabular-nums font-semibold">{formatBDT(e.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-300">
                    <span>Current Period Net Income (P&L):</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-600">
                      {formatBDT(balanceSheet.equity.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="font-mono tabular-nums text-teal-600 dark:text-teal-400">
                  {formatBDT(balanceSheet.liabilities.total + balanceSheet.equity.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. GENERAL LEDGER TAB */}
      {activeTab === 'general_ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Select Account Head for General Ledger Statement:
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white min-w-[280px]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Net Balance</span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {formatBDT(selectedAccount?.currentBalance || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Voucher No</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Narration / Particulars</th>
                    <th className="py-2.5 px-4 text-right">Debit (Dr ৳)</th>
                    <th className="py-2.5 px-4 text-right">Credit (Cr ৳)</th>
                    <th className="py-2.5 px-4 text-right">Running Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {generalLedgerRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-500">{row.date === 'Opening' ? 'Opening' : formatDateBD(row.date)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{row.voucherNo}</td>
                      <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-500">{row.voucherType}</td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">{row.narration}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {row.debit > 0 ? formatBDT(row.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {row.credit > 0 ? formatBDT(row.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatBDT(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. CASH & BANK BOOKS TAB */}
      {activeTab === 'cash_bank' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash in Hand accounts */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{t.cashBook}</span>
                <span className="text-xs font-mono text-rose-600">
                  {formatBDT(cashAccounts.reduce((sum, a) => sum + a.currentBalance, 0))}
                </span>
              </h3>
              <div className="space-y-2">
                {cashAccounts.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Code: {c.code}</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(c.currentBalance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank accounts */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{t.bankBook}</span>
                <span className="text-xs font-mono text-emerald-600">
                  {formatBDT(bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0))}
                </span>
              </h3>
              <div className="space-y-2">
                {bankAccounts.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Code: {b.code}</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(b.currentBalance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CHART OF ACCOUNTS (COA) TAB */}
      {activeTab === 'chart_of_accounts' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Chart of Accounts Architecture (হিসাবের তালিকা)
            </h2>
            <span className="text-xs text-slate-500 font-mono">{accounts.length} active ledger accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Account Code</th>
                  <th className="py-2.5 px-4">Account Name (English)</th>
                  <th className="py-2.5 px-4">Bengali Title</th>
                  <th className="py-2.5 px-4">Major Head</th>
                  <th className="py-2.5 px-4">Sub-Category</th>
                  <th className="py-2.5 px-4 text-right">Current Balance</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{acc.code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{acc.name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{acc.nameBn || '-'}</td>
                    <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {acc.type}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{acc.subType}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(acc.currentBalance)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setAlteringAccount(acc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                        title="Alter / Edit Ledger Name, Code, Balance & Details"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Alter (অল্টার)</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* LEDGER ALTER & CREATE MODAL */}
      <LedgerAlterModal
        isOpen={isCreatingAccount || !!alteringAccount}
        account={alteringAccount}
        onClose={() => {
          setIsCreatingAccount(false);
          setAlteringAccount(null);
        }}
      />
    </div>
  );
};
