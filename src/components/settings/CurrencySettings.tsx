import React, { useState } from 'react';
import {
  Coins,
  Globe2,
  RefreshCw,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Sliders,
  Check,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { CurrencyRate } from '../../types/erp';
import { defaultCurrencies } from '../../data/seedData';

export const CurrencySettings: React.FC = () => {
  const { currentCompany, updateCurrencies, updateCompanySettings, convertCurrency, setActiveTab } = useERP();

  const [currencies, setCurrencies] = useState<CurrencyRate[]>(() => {
    return currentCompany.settings.currencies || defaultCurrencies;
  });

  const [baseCurrency, setBaseCurrency] = useState<string>(
    currentCompany.settings.baseCurrency || currentCompany.settings.currency || 'BDT'
  );

  const [autoConvertSalesFx, setAutoConvertSalesFx] = useState<boolean>(
    currentCompany.settings.autoConvertSalesFx ?? true
  );

  const [autoConvertPurchasesFx, setAutoConvertPurchasesFx] = useState<boolean>(
    currentCompany.settings.autoConvertPurchasesFx ?? true
  );

  const [defaultTransactionCurrency, setDefaultTransactionCurrency] = useState<string>(
    currentCompany.settings.defaultTransactionCurrency || baseCurrency
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncingRates, setSyncingRates] = useState(false);

  // Live Test Converter State
  const [calcAmount, setCalcAmount] = useState<number>(1000);
  const [fromCode, setFromCode] = useState<string>('BDT');
  const [toCode, setToCode] = useState<string>('USD');

  // Add Currency modal
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState<number>(1.0);

  const handleRateChange = (code: string, newRateVal: number) => {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, rateToBase: newRateVal, updatedAt: 'Just now' } : c))
    );
  };

  const handleToggleActive = (code: string) => {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleSetBase = (newBaseCode: string) => {
    const targetCur = currencies.find((c) => c.code === newBaseCode);
    if (!targetCur) return;

    const oldRateToBase = targetCur.rateToBase || 1;

    // Recalibrate all rates relative to new base currency
    const recalibrated = currencies.map((c) => {
      const isNewBase = c.code === newBaseCode;
      return {
        ...c,
        isBase: isNewBase,
        rateToBase: isNewBase ? 1.0 : Number((c.rateToBase / oldRateToBase).toFixed(4)),
        updatedAt: 'Base Realigned',
      };
    });

    setBaseCurrency(newBaseCode);
    setCurrencies(recalibrated);
  };

  const handleSyncLiveRates = () => {
    setSyncingRates(true);
    setTimeout(() => {
      // Simulate live Forex API retrieval
      const liveMarketRates: Record<string, number> = {
        BDT: 1.0,
        USD: 121.75,
        EUR: 131.80,
        GBP: 154.20,
        SAR: 32.46,
        AED: 33.15,
        INR: 1.45,
        CAD: 89.20,
        JPY: 0.81,
        CNY: 16.90,
      };

      setCurrencies((prev) =>
        prev.map((c) => {
          if (c.code === baseCurrency) {
            return { ...c, rateToBase: 1.0, updatedAt: 'Live API Refreshed' };
          }
          const liveRate = liveMarketRates[c.code] || c.rateToBase;
          return {
            ...c,
            rateToBase: liveRate,
            updatedAt: 'Live API Refreshed',
          };
        })
      );
      setSyncingRates(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 700);
  };

  const handleSaveSettings = () => {
    updateCurrencies(currencies, baseCurrency);
    updateCompanySettings({
      autoConvertSalesFx,
      autoConvertPurchasesFx,
      defaultTransactionCurrency,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newSymbol) return;

    const upper = newCode.toUpperCase().trim();
    if (currencies.some((c) => c.code === upper)) {
      alert('This currency code already exists!');
      return;
    }

    const created: CurrencyRate = {
      code: upper,
      symbol: newSymbol.trim(),
      name: newName.trim() || upper,
      rateToBase: Number(newRate) || 1.0,
      isBase: false,
      isActive: true,
      updatedAt: 'Manual Config',
    };

    const updated = [...currencies, created];
    setCurrencies(updated);
    updateCurrencies(updated, baseCurrency);
    setIsOpenAdd(false);
    setNewCode('');
    setNewSymbol('');
    setNewName('');
    setNewRate(1.0);
  };

  const convertedResult = convertCurrency(calcAmount, fromCode, toCode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            Global Currency Settings & Exchange Rate Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define corporate base reporting currency and maintain real-time exchange rates across multi-currency vouchers, invoices & reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncLiveRates}
            disabled={syncingRates}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingRates ? 'animate-spin' : ''}`} />
            <span>Sync Live FX Rates</span>
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save FX Settings</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Currency configuration and exchange rate matrix updated and applied across all company modules!</span>
        </div>
      )}

      {/* Base Reporting Currency Selector */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Base Financial Reporting Currency
            </h3>
            <p className="text-xs text-slate-500">
              General Ledger accounts, Balance Sheet, and Trial Balance are consolidated into this base currency.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Active Base:</span>
            <span className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              {baseCurrency} ({currencies.find((c) => c.code === baseCurrency)?.symbol})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2">
          {currencies.map((cur) => {
            const isSelected = cur.code === baseCurrency;
            return (
              <button
                key={cur.code}
                onClick={() => handleSetBase(cur.code)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black font-mono">{cur.symbol}</span>
                  {isSelected && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                </div>
                <div className="text-xs font-bold mt-1">{cur.code}</div>
                <div className="text-[10px] text-slate-500 truncate">{cur.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction Currencies & Exchange Rate Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Transaction Currencies & Exchange Rates (Automated Conversion)
            </h3>
            <p className="text-xs text-slate-500">
              1 unit of foreign currency = Rate in {baseCurrency}. Edit rates directly or click "Sync Live FX Rates".
            </p>
          </div>
          <button
            onClick={() => setIsOpenAdd(true)}
            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Currency</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Rate to {baseCurrency} (1 Unit =)</th>
                <th className="py-3 px-4">Inverse Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Last Rate Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currencies.map((cur) => {
                const isBase = cur.code === baseCurrency;
                const inverse = cur.rateToBase > 0 ? (1 / cur.rateToBase).toFixed(6) : '0';

                return (
                  <tr key={cur.code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {cur.code}
                        </span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[150px]">
                          ({cur.name})
                        </span>
                        {isBase && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            Base
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-black text-sm text-slate-700 dark:text-slate-300">
                      {cur.symbol}
                    </td>

                    <td className="py-3 px-4">
                      {isBase ? (
                        <span className="font-mono font-bold text-slate-400">1.0000 (Pegged)</span>
                      ) : (
                        <div className="flex items-center gap-1.5 max-w-[160px]">
                          <input
                            type="number"
                            step="0.0001"
                            value={cur.rateToBase}
                            onChange={(e) => handleRateChange(cur.code, parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-mono p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                          />
                          <span className="text-[10px] font-mono text-slate-400">{baseCurrency}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      1 {baseCurrency} = {inverse} {cur.code}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(cur.code)}
                        disabled={isBase}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                          cur.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200'
                        } ${isBase ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {cur.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">
                      {cur.updatedAt || 'Recent'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Automated Exchange Rate Conversion in Sales & Purchases */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>3. Automated FX Conversion for Sales & Purchases Modules</span>
            </h3>
            <p className="text-xs text-slate-500">
              When enabled, POS billing and vendor purchases calculate multi-currency line items and automatically post normalized journal vouchers in {baseCurrency}.
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Apply Conversion Rules
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Sales & POS Conversion</span>
                <input
                  type="checkbox"
                  checked={autoConvertSalesFx}
                  onChange={(e) => setAutoConvertSalesFx(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Allows cashiers and sales managers to bill customers in foreign secondary currencies (USD, EUR, GBP, SAR, etc.) with automated instant conversion to {baseCurrency}.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Status: {autoConvertSalesFx ? 'Active (Auto-converting)' : 'Disabled'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Purchases & Vendor Bills</span>
                <input
                  type="checkbox"
                  checked={autoConvertPurchasesFx}
                  onChange={(e) => setAutoConvertPurchasesFx(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enables recording import bills and supplier purchases in foreign currencies with automated inventory valuation and budget tracking against procurement limits.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Status: {autoConvertPurchasesFx ? 'Active (Auto-converting)' : 'Disabled'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                Default POS Billing Currency
              </label>
              <select
                value={defaultTransactionCurrency}
                onChange={(e) => setDefaultTransactionCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
              >
                {currencies.filter((c) => c.isActive).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.name} {c.code === baseCurrency ? '[Base Currency]' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1.5">
                New sales and POS terminals will open with this currency pre-selected.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400 font-mono">
              Pre-selected on Quick POS
            </div>
          </div>
        </div>

        {/* Multi-Currency Budget Callout Banner */}
        <div className="p-3.5 bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-950/30 dark:to-indigo-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Multi-Currency Financial Targets & Budget Allocations
              </h4>
              <p className="text-[11px] text-slate-500">
                You can set procurement and expense budgets in foreign secondary currencies (e.g. USD, EUR) or base {baseCurrency} with real-time variance analysis.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('budgets')}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Open Budgets Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive FX Conversion Calculator Widget */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-xl border border-slate-700 text-white space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-200">
              Interactive Multi-Currency FX Conversion Calculator
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Real-Time Conversion Testing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Input Amount
            </label>
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              className="w-full text-xs font-mono p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Source Currency
            </label>
            <select
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value)}
              className="w-full text-xs p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              {currencies.filter((c) => c.isActive).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1 flex justify-center pt-5">
            <div className="p-2 rounded-full bg-slate-800 border border-slate-700">
              <ArrowRightLeft className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Target Currency
            </label>
            <select
              value={toCode}
              onChange={(e) => setToCode(e.target.value)}
              className="w-full text-xs p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              {currencies.filter((c) => c.isActive).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Calculated Equivalent:</span>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
              {currencies.find((c) => c.code === toCode)?.symbol} {convertedResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCode}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            {calcAmount.toLocaleString()} {fromCode} = {convertedResult.toLocaleString()} {toCode}
          </div>
        </div>
      </div>

      {/* Add Currency Modal */}
      {isOpenAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-rose-600" />
              Add New Transaction Currency
            </h3>

            <form onSubmit={handleAddCurrency} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Code (ISO 3-Letter)
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CAD, JPY, AUD, QAR"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  required
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="e.g. C$, ¥, A$, ر.ق"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Canadian Dollar"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exchange Rate to Base ({baseCurrency})
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={newRate}
                  onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 89.20"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenAdd(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Add Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
