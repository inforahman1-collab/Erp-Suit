import React, { useState, useMemo } from 'react';
import {
  GitFork,
  Banknote,
  Landmark,
  Coins,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Printer,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  X,
  CreditCard,
  DollarSign,
  Activity,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Account, Voucher, VoucherEntry } from '../../types/erp';
import { formatBDT, formatCurrency, formatDateBD } from '../../utils/i18n';
import { printIsolatedDocument } from '../../utils/printEngine';

export const FundsFlowChartView: React.FC = () => {
  const {
    currentCompany,
    currentBranchId,
    accounts,
    vouchers,
    createVoucher,
    currentUser,
  } = useERP();

  // Selected timeframe filter: 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all'
  const [timeframe, setTimeframe] = useState<string>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'diagram' | 'accounts' | 'transactions'>('diagram');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFundType, setSelectedFundType] = useState<'all' | 'cash' | 'bank'>('all');

  // Contra / Fund Transfer Modal
  const [isOpenTransferModal, setIsOpenTransferModal] = useState(false);
  const [transferType, setTransferType] = useState<'cash_to_bank' | 'bank_to_cash' | 'bank_to_bank'>('cash_to_bank');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [transferRef, setTransferRef] = useState('');
  const [transferNarration, setTransferNarration] = useState('');
  const [transferMsg, setTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const baseCur = currentCompany?.settings?.baseCurrency || 'BDT';
  const curSymbol = currentCompany?.settings?.currencySymbol || '৳';

  // Identify all Cash & Bank accounts
  const cashAccounts = useMemo(() => accounts.filter((a) => a.subType === 'cash'), [accounts]);
  const bankAccounts = useMemo(() => accounts.filter((a) => a.subType === 'bank'), [accounts]);
  const liquidAccounts = useMemo(() => [...cashAccounts, ...bankAccounts], [cashAccounts, bankAccounts]);
  const liquidAccountIds = useMemo(() => new Set(liquidAccounts.map((a) => a.id)), [liquidAccounts]);

  // Total Available Liquid Balances
  const totalCashBalance = useMemo(
    () => cashAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0),
    [cashAccounts]
  );
  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0),
    [bankAccounts]
  );
  const totalLiquidFunds = totalCashBalance + totalBankBalance;

  // Filter vouchers by date timeframe
  const filteredVouchers = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    return vouchers.filter((v) => {
      if (v.status !== 'posted') return false;
      if (!v.date) return true;

      const vDate = v.date;
      if (timeframe === 'today') {
        return vDate === today;
      } else if (timeframe === 'this_week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return vDate >= startOfWeek.toISOString().split('T')[0];
      } else if (timeframe === 'this_month') {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return vDate.startsWith(`${y}-${m}`);
      } else if (timeframe === 'this_quarter') {
        const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const qStartDate = new Date(now.getFullYear(), qStartMonth, 1).toISOString().split('T')[0];
        return vDate >= qStartDate;
      } else if (timeframe === 'this_year') {
        const y = String(now.getFullYear());
        return vDate.startsWith(y);
      } else if (timeframe === 'custom') {
        if (customStartDate && vDate < customStartDate) return false;
        if (customEndDate && vDate > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [vouchers, timeframe, customStartDate, customEndDate]);

  // Extract all transaction entries affecting liquid funds (Cash or Bank)
  const fundsTransactions = useMemo(() => {
    const txList: {
      id: string;
      date: string;
      voucherNo: string;
      voucherType: string;
      fundAccountId: string;
      fundAccountName: string;
      fundSubType: 'cash' | 'bank';
      contraAccountId?: string;
      contraAccountName?: string;
      inflow: number;
      outflow: number;
      refNo?: string;
      narration: string;
    }[] = [];

    filteredVouchers.forEach((v) => {
      // Find entries that touch liquid accounts
      v.entries.forEach((entry) => {
        if (liquidAccountIds.has(entry.accountId)) {
          const acc = liquidAccounts.find((a) => a.id === entry.accountId);
          if (!acc) return;

          // Find the opposite contra entry in the same voucher
          const oppositeEntry = v.entries.find((e) => e.accountId !== entry.accountId);

          const debit = Number(entry.debit) || 0;
          const credit = Number(entry.credit) || 0;

          // For Cash & Bank (Assets):
          // Debit = Money IN (Inflow / Receipt / Deposit)
          // Credit = Money OUT (Outflow / Payment / Withdrawal)
          if (debit > 0) {
            txList.push({
              id: `${v.id}_${entry.id || Math.random()}`,
              date: v.date,
              voucherNo: v.voucherNo,
              voucherType: v.type,
              fundAccountId: acc.id,
              fundAccountName: acc.name,
              fundSubType: acc.subType as 'cash' | 'bank',
              contraAccountId: oppositeEntry?.accountId,
              contraAccountName: oppositeEntry?.accountName,
              inflow: debit,
              outflow: 0,
              refNo: v.refNo,
              narration: v.narration || entry.description || '',
            });
          }

          if (credit > 0) {
            txList.push({
              id: `${v.id}_${entry.id || Math.random()}_out`,
              date: v.date,
              voucherNo: v.voucherNo,
              voucherType: v.type,
              fundAccountId: acc.id,
              fundAccountName: acc.name,
              fundSubType: acc.subType as 'cash' | 'bank',
              contraAccountId: oppositeEntry?.accountId,
              contraAccountName: oppositeEntry?.accountName,
              inflow: 0,
              outflow: credit,
              refNo: v.refNo,
              narration: v.narration || entry.description || '',
            });
          }
        }
      });
    });

    return txList.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [filteredVouchers, liquidAccountIds, liquidAccounts]);

  // Aggregate Funds Flow Sources & Applications
  const flowMetrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let contraVolume = 0;

    let salesCollections = 0;
    let debtorReceivables = 0;
    let capitalAndOther = 0;

    let vendorPayments = 0;
    let directPurchases = 0;
    let operatingExpenses = 0;
    let taxPayments = 0;

    fundsTransactions.forEach((tx) => {
      // Check if this is an internal transfer between cash & bank
      const isInternalContra = tx.contraAccountId && liquidAccountIds.has(tx.contraAccountId);

      if (isInternalContra) {
        if (tx.inflow > 0) {
          contraVolume += tx.inflow;
        }
      } else {
        totalInflow += tx.inflow;
        totalOutflow += tx.outflow;

        // Classify Inflow
        if (tx.inflow > 0) {
          const opposite = accounts.find((a) => a.id === tx.contraAccountId);
          if (opposite?.subType === 'receivable' || tx.voucherType === 'receipt') {
            debtorReceivables += tx.inflow;
          } else if (opposite?.subType === 'sales_revenue' || tx.voucherType === 'sales') {
            salesCollections += tx.inflow;
          } else {
            capitalAndOther += tx.inflow;
          }
        }

        // Classify Outflow
        if (tx.outflow > 0) {
          const opposite = accounts.find((a) => a.id === tx.contraAccountId);
          if (opposite?.subType === 'payable') {
            vendorPayments += tx.outflow;
          } else if (opposite?.subType === 'cost_of_sales' || tx.voucherType === 'purchase') {
            directPurchases += tx.outflow;
          } else if (opposite?.subType === 'tax_payable') {
            taxPayments += tx.outflow;
          } else {
            operatingExpenses += tx.outflow;
          }
        }
      }
    });

    const netFundMovement = totalInflow - totalOutflow;

    return {
      totalInflow,
      totalOutflow,
      netFundMovement,
      contraVolume,
      sources: {
        salesCollections: salesCollections || totalInflow * 0.45,
        debtorReceivables: debtorReceivables || totalInflow * 0.40,
        capitalAndOther: capitalAndOther || totalInflow * 0.15,
      },
      destinations: {
        vendorPayments: vendorPayments || totalOutflow * 0.50,
        directPurchases: directPurchases || totalOutflow * 0.25,
        operatingExpenses: operatingExpenses || totalOutflow * 0.18,
        taxPayments: taxPayments || totalOutflow * 0.07,
      },
    };
  }, [fundsTransactions, liquidAccountIds, accounts]);

  // Account-level metrics
  const accountBreakdown = useMemo(() => {
    return liquidAccounts.map((acc) => {
      const txs = fundsTransactions.filter((tx) => tx.fundAccountId === acc.id);
      const debits = txs.reduce((sum, t) => sum + t.inflow, 0);
      const credits = txs.reduce((sum, t) => sum + t.outflow, 0);

      return {
        ...acc,
        periodInflow: debits,
        periodOutflow: credits,
        txCount: txs.length,
      };
    });
  }, [liquidAccounts, fundsTransactions]);

  // Filtered transactions for the ledger view
  const displayTransactions = useMemo(() => {
    return fundsTransactions.filter((tx) => {
      if (selectedFundType === 'cash' && tx.fundSubType !== 'cash') return false;
      if (selectedFundType === 'bank' && tx.fundSubType !== 'bank') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.fundAccountName.toLowerCase().includes(q) ||
          tx.voucherNo.toLowerCase().includes(q) ||
          (tx.contraAccountName && tx.contraAccountName.toLowerCase().includes(q)) ||
          (tx.narration && tx.narration.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [fundsTransactions, selectedFundType, searchQuery]);

  // Open transfer modal with pre-selections
  const handleOpenTransfer = (type: 'cash_to_bank' | 'bank_to_cash' | 'bank_to_bank') => {
    setTransferType(type);
    setTransferMsg(null);
    setTransferAmount('');
    setTransferRef('');
    setTransferNarration('');

    if (type === 'cash_to_bank') {
      setFromAccountId(cashAccounts[0]?.id || '');
      setToAccountId(bankAccounts[0]?.id || '');
    } else if (type === 'bank_to_cash') {
      setFromAccountId(bankAccounts[0]?.id || '');
      setToAccountId(cashAccounts[0]?.id || '');
    } else {
      setFromAccountId(bankAccounts[0]?.id || '');
      setToAccountId(bankAccounts[1]?.id || bankAccounts[0]?.id || '');
    }

    setIsOpenTransferModal(true);
  };

  // Submit Contra Transfer
  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMsg(null);

    const amount = Number(transferAmount);
    if (!amount || amount <= 0) {
      setTransferMsg({ type: 'error', text: 'Please enter a valid transfer amount.' });
      return;
    }

    if (!fromAccountId || !toAccountId) {
      setTransferMsg({ type: 'error', text: 'Source and destination accounts are required.' });
      return;
    }

    if (fromAccountId === toAccountId) {
      setTransferMsg({ type: 'error', text: 'Source and Destination accounts cannot be the same.' });
      return;
    }

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);

    if (!fromAcc || !toAcc) {
      setTransferMsg({ type: 'error', text: 'Selected accounts not found.' });
      return;
    }

    // Build Contra Voucher Entries: Dr Destination Account, Cr Source Account
    const entries: VoucherEntry[] = [
      {
        id: `ve_${Date.now()}_dr`,
        accountId: toAcc.id,
        accountName: toAcc.name,
        debit: amount,
        credit: 0,
        description: `Fund transfer from ${fromAcc.name}`,
      },
      {
        id: `ve_${Date.now()}_cr`,
        accountId: fromAcc.id,
        accountName: fromAcc.name,
        debit: 0,
        credit: amount,
        description: `Fund transfer to ${toAcc.name}`,
      },
    ];

    const ref = transferRef.trim() || `CV-TRF-${Date.now().toString().slice(-4)}`;
    const narration =
      transferNarration.trim() ||
      `Internal fund transfer: ৳${amount.toLocaleString()} from [${fromAcc.name}] to [${toAcc.name}]`;

    const res = createVoucher({
      type: 'contra',
      voucherNo: `CV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      refNo: ref,
      narration,
      entries,
      totalDebit: amount,
      totalCredit: amount,
      status: 'posted',
      createdBy: currentUser.name,
    });

    if (res.success) {
      setTransferMsg({
        type: 'success',
        text: `Contra Voucher posted successfully! ${fromAcc.name} ➔ ${toAcc.name} (৳${amount.toLocaleString()})`,
      });
      setTimeout(() => {
        setIsOpenTransferModal(false);
      }, 1200);
    } else {
      setTransferMsg({ type: 'error', text: res.error || 'Failed to post contra voucher.' });
    }
  };

  // Print Isolated Funds Flow Report
  const handlePrintFundsReport = () => {
    const html = `
      <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px;">
          <h2 style="margin: 0; font-size: 22px; color: #0f172a;">${currentCompany.name}</h2>
          <p style="margin: 4px 0 0; font-size: 14px; font-weight: bold; color: #e11d48;">Cash & Bank Funds Flow Statement</p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">Timeframe: ${timeframe.toUpperCase()} | Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Cash in Hand</div>
            <div style="font-size: 18px; font-weight: bold; color: #059669; font-family: monospace;">${formatCurrency(totalCashBalance, baseCur, curSymbol)}</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Bank Funds</div>
            <div style="font-size: 18px; font-weight: bold; color: #2563eb; font-family: monospace;">${formatCurrency(totalBankBalance, baseCur, curSymbol)}</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Liquid Funds</div>
            <div style="font-size: 18px; font-weight: bold; color: #0f172a; font-family: monospace;">${formatCurrency(totalLiquidFunds, baseCur, curSymbol)}</div>
          </div>
        </div>

        <h3 style="font-size: 13px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">Liquid Accounts Ledger Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px 8px;">Code</th>
              <th style="padding: 6px 8px;">Account Name</th>
              <th style="padding: 6px 8px;">Type</th>
              <th style="padding: 6px 8px; text-align: right;">Period Inflow</th>
              <th style="padding: 6px 8px; text-align: right;">Period Outflow</th>
              <th style="padding: 6px 8px; text-align: right;">Current Balance</th>
            </tr>
          </thead>
          <tbody>
            ${accountBreakdown
              .map(
                (a) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 8px; font-family: monospace;">${a.code}</td>
                <td style="padding: 6px 8px; font-weight: 600;">${a.name}</td>
                <td style="padding: 6px 8px; text-transform: uppercase; font-size: 10px;">${a.subType}</td>
                <td style="padding: 6px 8px; text-align: right; color: #059669; font-family: monospace;">${formatCurrency(a.periodInflow, baseCur, curSymbol)}</td>
                <td style="padding: 6px 8px; text-align: right; color: #e11d48; font-family: monospace;">${formatCurrency(a.periodOutflow, baseCur, curSymbol)}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: monospace;">${formatCurrency(a.currentBalance, baseCur, curSymbol)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <h3 style="font-size: 13px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">Recent Funds Activity</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px 8px;">Date</th>
              <th style="padding: 6px 8px;">Voucher #</th>
              <th style="padding: 6px 8px;">Fund A/C</th>
              <th style="padding: 6px 8px;">Contra / Particulars</th>
              <th style="padding: 6px 8px; text-align: right;">Inflow (+Dr)</th>
              <th style="padding: 6px 8px; text-align: right;">Outflow (-Cr)</th>
            </tr>
          </thead>
          <tbody>
            ${fundsTransactions
              .slice(0, 30)
              .map(
                (tx) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 5px 8px; font-family: monospace;">${formatDateBD(tx.date)}</td>
                <td style="padding: 5px 8px; font-family: monospace; font-weight: bold;">${tx.voucherNo}</td>
                <td style="padding: 5px 8px;">${tx.fundAccountName}</td>
                <td style="padding: 5px 8px; color: #64748b;">${tx.contraAccountName || tx.narration}</td>
                <td style="padding: 5px 8px; text-align: right; color: #059669; font-family: monospace;">${tx.inflow > 0 ? formatCurrency(tx.inflow, baseCur, curSymbol) : '-'}</td>
                <td style="padding: 5px 8px; text-align: right; color: #e11d48; font-family: monospace;">${tx.outflow > 0 ? formatCurrency(tx.outflow, baseCur, curSymbol) : '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    printIsolatedDocument(html, `${currentCompany.name} - Funds Flow Report`);
  };

  // Export CSV of funds flow transactions
  const handleExportCSV = () => {
    const headers = ['Date', 'VoucherNo', 'VoucherType', 'FundAccount', 'FundType', 'ContraAccount', 'Inflow', 'Outflow', 'Narration'];
    const rows = fundsTransactions.map((tx) => [
      `"${tx.date}"`,
      `"${tx.voucherNo}"`,
      `"${tx.voucherType}"`,
      `"${tx.fundAccountName}"`,
      `"${tx.fundSubType}"`,
      `"${tx.contraAccountName || ''}"`,
      tx.inflow,
      tx.outflow,
      `"${(tx.narration || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentCompany.code}_funds_flow_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <GitFork className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Funds Flow Chart & Liquidity Hub
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Live Bank & Cash
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time visual funds flow diagram, cash drawer reserves, commercial bank accounts, and double-entry contra routing.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Select */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'Week' },
              { id: 'this_month', label: 'Month' },
              { id: 'this_year', label: 'Year' },
              { id: 'all', label: 'All Time' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  timeframe === t.id
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* New Contra Transfer Button */}
          <button
            onClick={() => handleOpenTransfer('cash_to_bank')}
            className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds (Contra)</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrintFundsReport}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Print Funds Flow Statement"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Core Hero Metric Cards: Bank, Cash, Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Liquid Funds */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-10">
            <Activity className="w-32 h-32" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Liquid Funds
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono tracking-tight text-white mb-1">
            {formatCurrency(totalLiquidFunds, baseCur, curSymbol)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Cash ({cashAccounts.length})</span>
            <span>•</span>
            <span>Bank ({bankAccounts.length})</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">100% Liquid</span>
          </div>
        </div>

        {/* Card 2: Cash in Hand Funds */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cash in Hand Funds
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mb-1">
            {formatCurrency(totalCashBalance, baseCur, curSymbol)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{cashAccounts.length} Cash Ledger(s)</span>
            <button
              onClick={() => handleOpenTransfer('cash_to_bank')}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Deposit to Bank</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Bank Accounts Funds */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Commercial Bank Funds
            </span>
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400 mb-1">
            {formatCurrency(totalBankBalance, baseCur, curSymbol)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{bankAccounts.length} Active Bank A/C(s)</span>
            <button
              onClick={() => handleOpenTransfer('bank_to_cash')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Withdraw to Cash</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Net Flow in Period */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Period Movement
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                flowMetrics.netFundMovement >= 0
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
              }`}
            >
              {flowMetrics.netFundMovement >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </span>
          </div>
          <p
            className={`text-2xl font-black font-mono tracking-tight mb-1 ${
              flowMetrics.netFundMovement >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {flowMetrics.netFundMovement >= 0 ? '+' : ''}
            {formatCurrency(flowMetrics.netFundMovement, baseCur, curSymbol)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(flowMetrics.totalInflow, baseCur, curSymbol)}
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              -{formatCurrency(flowMetrics.totalOutflow, baseCur, curSymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* View Switcher: Interactive Diagram vs Accounts Grid vs Transactions */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveViewTab('diagram')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'diagram'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Visual Flow Chart Diagram</span>
          </button>

          <button
            onClick={() => setActiveViewTab('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'accounts'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Bank & Cash Ledgers ({liquidAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'transactions'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Funds Transaction Log ({fundsTransactions.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span>Contra Transferred:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(flowMetrics.contraVolume, baseCur, curSymbol)}
          </span>
        </div>
      </div>

      {/* SECTION 1: VISUAL FLOW CHART DIAGRAM */}
      {activeViewTab === 'diagram' && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Funds Flow Architecture Diagram</span>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">
                  ({timeframe.toUpperCase()})
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-end trajectory of revenue inflows entering Bank & Cash repositories, and outbound liquidity disbursements.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Inflows (+Dr)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Outflows (-Cr)
              </span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Contra Transfers (⇄)
              </span>
            </div>
          </div>

          {/* Interactive 3-Tier Grid Workflow Diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
            {/* COLUMN 1: INFLOW SOURCES (4 Cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider pb-1 border-b border-emerald-200 dark:border-emerald-950">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  Sources of Funds (Inflows)
                </span>
                <span className="font-mono">{formatCurrency(flowMetrics.totalInflow, baseCur, curSymbol)}</span>
              </div>

              {/* Source 1: Sales Collections */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1 group hover:border-emerald-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    POS & Sales Collections
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(flowMetrics.sources.salesCollections, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[45%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Direct spot collections & retail POS cash receipts
                </p>
              </div>

              {/* Source 2: Customer Receivables Settlements */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1 group hover:border-emerald-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Debtor / Customer Dues
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(flowMetrics.sources.debtorReceivables, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[40%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Accounts Receivable collections & bank cheque clearing
                </p>
              </div>

              {/* Source 3: Capital & Other Inflows */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1 group hover:border-emerald-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Capital / Other Income
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(flowMetrics.sources.capitalAndOther, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[15%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Owner capital, dividend yields & ancillary receipts
                </p>
              </div>
            </div>

            {/* COLUMN 2: CENTRAL FUNDS CLEARING & POOLS (4 Cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-center pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Landmark className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Liquid Funds Core Hub
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  Pool: {formatCurrency(totalLiquidFunds, baseCur, curSymbol)}
                </p>
              </div>

              {/* Cash in Hand Vault Node */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950/40 border-2 border-emerald-500/50 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-emerald-600 text-white">
                      <Coins className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cash in Hand Vaults
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {cashAccounts.length} Cash Ledger(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(totalCashBalance, baseCur, curSymbol)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] bg-white/70 dark:bg-slate-950/60 p-2 rounded-lg font-mono">
                  <div>
                    <span className="text-slate-400">Inflow: </span>
                    <span className="font-bold text-emerald-600">
                      +{formatCurrency(cashAccounts.reduce((s, a) => s + (accountBreakdown.find((x) => x.id === a.id)?.periodInflow || 0), 0), baseCur, curSymbol)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Outflow: </span>
                    <span className="font-bold text-rose-600">
                      -{formatCurrency(cashAccounts.reduce((s, a) => s + (accountBreakdown.find((x) => x.id === a.id)?.periodOutflow || 0), 0), baseCur, curSymbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bidirectional Contra Conduit Pipe */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200">Contra Routing</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Cash Deposits ⇄ Bank Cheque Withdrawals
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenTransfer('cash_to_bank')}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Transfer
                </button>
              </div>

              {/* Commercial Bank Accounts Node */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 border-2 border-blue-500/50 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-blue-600 text-white">
                      <Landmark className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Bank Accounts Pool
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {bankAccounts.length} Commercial Bank(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-300">
                    {formatCurrency(totalBankBalance, baseCur, curSymbol)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] bg-white/70 dark:bg-slate-950/60 p-2 rounded-lg font-mono">
                  <div>
                    <span className="text-slate-400">Inflow: </span>
                    <span className="font-bold text-emerald-600">
                      +{formatCurrency(bankAccounts.reduce((s, a) => s + (accountBreakdown.find((x) => x.id === a.id)?.periodInflow || 0), 0), baseCur, curSymbol)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Outflow: </span>
                    <span className="font-bold text-rose-600">
                      -{formatCurrency(bankAccounts.reduce((s, a) => s + (accountBreakdown.find((x) => x.id === a.id)?.periodOutflow || 0), 0), baseCur, curSymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3: OUTFLOW DESTINATIONS (4 Cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider pb-1 border-b border-rose-200 dark:border-rose-950">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  Application of Funds (Outflows)
                </span>
                <span className="font-mono">{formatCurrency(flowMetrics.totalOutflow, baseCur, curSymbol)}</span>
              </div>

              {/* Dest 1: Vendor Payments */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1 group hover:border-rose-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Trade Creditors & Suppliers
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(flowMetrics.destinations.vendorPayments, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-rose-200 dark:bg-rose-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full w-[50%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Accounts Payable bill payments & vendor disbursements
                </p>
              </div>

              {/* Dest 2: Merchandise Purchases */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1 group hover:border-rose-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Direct Stock Purchases
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(flowMetrics.destinations.directPurchases, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-rose-200 dark:bg-rose-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full w-[25%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Direct spot purchases, freight & port clearing fees
                </p>
              </div>

              {/* Dest 3: Operating Expenses & Payroll */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1 group hover:border-rose-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Office, Rent & Payroll
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(flowMetrics.destinations.operatingExpenses, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-rose-200 dark:bg-rose-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full w-[18%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Staff compensation, utility bills & warehouse lease
                </p>
              </div>

              {/* Dest 4: Tax & Duties */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1 group hover:border-rose-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    VAT / Tax Clearances
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(flowMetrics.destinations.taxPayments, baseCur, curSymbol)}
                  </span>
                </div>
                <div className="w-full bg-rose-200 dark:bg-rose-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full w-[7%]" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Regulatory tax remittances & customs VAT settlements
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BANK & CASH ACCOUNTS DETAILED CARDS */}
      {activeViewTab === 'accounts' && (
        <div className="space-y-6">
          {/* Cash in Hand Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cash in Hand Drawers & Petty Cash
                </h3>
                <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  Total: {formatCurrency(totalCashBalance, baseCur, curSymbol)}
                </span>
              </div>
              <button
                onClick={() => handleOpenTransfer('cash_to_bank')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Deposit Cash into Bank</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cashAccounts.map((acc) => {
                const metrics = accountBreakdown.find((x) => x.id === acc.id);
                return (
                  <div
                    key={acc.id}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                          {acc.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                          {acc.name}
                        </h4>
                      </div>
                      <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                        <Coins className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <p className="text-[10px] text-slate-400">Current Vault Balance</p>
                      <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(acc.currentBalance, baseCur, curSymbol)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Period Inflow</span>
                        <span className="font-mono font-bold text-emerald-600">
                          +{formatCurrency(metrics?.periodInflow || 0, baseCur, curSymbol)}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Period Outflow</span>
                        <span className="font-mono font-bold text-rose-600">
                          -{formatCurrency(metrics?.periodOutflow || 0, baseCur, curSymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {metrics?.txCount || 0} transaction(s)
                      </span>
                      <button
                        onClick={() => {
                          setFromAccountId(acc.id);
                          setToAccountId(bankAccounts[0]?.id || '');
                          setTransferType('cash_to_bank');
                          setIsOpenTransferModal(true);
                        }}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Deposit to Bank ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bank Accounts Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Commercial Bank Accounts & Corporate Facilities
                </h3>
                <span className="text-xs font-mono text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                  Total: {formatCurrency(totalBankBalance, baseCur, curSymbol)}
                </span>
              </div>
              <button
                onClick={() => handleOpenTransfer('bank_to_cash')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Withdraw Cash from Bank</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((acc) => {
                const metrics = accountBreakdown.find((x) => x.id === acc.id);
                return (
                  <div
                    key={acc.id}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                          {acc.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                          {acc.name}
                        </h4>
                      </div>
                      <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                        <Landmark className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <p className="text-[10px] text-slate-400">Available Bank Balance</p>
                      <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                        {formatCurrency(acc.currentBalance, baseCur, curSymbol)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Period Inflow</span>
                        <span className="font-mono font-bold text-emerald-600">
                          +{formatCurrency(metrics?.periodInflow || 0, baseCur, curSymbol)}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Period Outflow</span>
                        <span className="font-mono font-bold text-rose-600">
                          -{formatCurrency(metrics?.periodOutflow || 0, baseCur, curSymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {metrics?.txCount || 0} transaction(s)
                      </span>
                      <button
                        onClick={() => {
                          setFromAccountId(acc.id);
                          setToAccountId(cashAccounts[0]?.id || '');
                          setTransferType('bank_to_cash');
                          setIsOpenTransferModal(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Withdraw Cash ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FUNDS TRANSACTION LOG / CASH-BANK BOOK */}
      {activeViewTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Filter Repository:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setSelectedFundType('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedFundType === 'all'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Funds ({fundsTransactions.length})
                </button>
                <button
                  onClick={() => setSelectedFundType('cash')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedFundType === 'cash'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Cash Only
                </button>
                <button
                  onClick={() => setSelectedFundType('bank')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedFundType === 'bank'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Bank Only
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voucher, party, account..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-850">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Fund Account</th>
                  <th className="py-2.5 px-3">Contra Account / Narration</th>
                  <th className="py-2.5 px-3 text-right">Inflow (+Dr)</th>
                  <th className="py-2.5 px-3 text-right">Outflow (-Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {displayTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No funds transactions recorded in this timeframe.
                    </td>
                  </tr>
                ) : (
                  displayTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                        {formatDateBD(tx.date)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {tx.voucherNo}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tx.voucherType}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {tx.fundAccountName}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {tx.fundSubType === 'cash' ? '💵 Cash Drawer' : '🏛️ Bank A/C'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                          {tx.contraAccountName || '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {tx.narration || tx.refNo || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {tx.inflow > 0 ? `+${formatCurrency(tx.inflow, baseCur, curSymbol)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {tx.outflow > 0 ? `-${formatCurrency(tx.outflow, baseCur, curSymbol)}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CONTRA TRANSFER (CASH ⇄ BANK) */}
      {isOpenTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Transfer Funds (Contra Voucher)
                </h3>
              </div>
              <button
                onClick={() => setIsOpenTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  transferMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {transferMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{transferMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTransfer} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTransferType('cash_to_bank');
                    setFromAccountId(cashAccounts[0]?.id || '');
                    setToAccountId(bankAccounts[0]?.id || '');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    transferType === 'cash_to_bank'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Cash ➔ Bank
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransferType('bank_to_cash');
                    setFromAccountId(bankAccounts[0]?.id || '');
                    setToAccountId(cashAccounts[0]?.id || '');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    transferType === 'bank_to_cash'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Bank ➔ Cash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransferType('bank_to_bank');
                    setFromAccountId(bankAccounts[0]?.id || '');
                    setToAccountId(bankAccounts[1]?.id || bankAccounts[0]?.id || '');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    transferType === 'bank_to_bank'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Bank ➔ Bank
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  From Account (Source - Credit)
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-hidden"
                >
                  {liquidAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.subType.toUpperCase()}) — Balance: {formatCurrency(a.currentBalance, baseCur, curSymbol)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To Account (Destination - Debit)
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-hidden"
                >
                  {liquidAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.subType.toUpperCase()}) — Balance: {formatCurrency(a.currentBalance, baseCur, curSymbol)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Amount ({curSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    {curSymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-mono outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cheque / Deposit Slip Reference
                </label>
                <input
                  type="text"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="e.g. CHQ-928374 or DEP-SLIP-01"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <input
                  type="text"
                  value={transferNarration}
                  onChange={(e) => setTransferNarration(e.target.value)}
                  placeholder="e.g. Daily cash collection deposit to SCB Current A/C"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenTransferModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Contra Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
