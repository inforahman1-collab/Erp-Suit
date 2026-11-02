import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building,
  CheckCircle2,
  Trash2,
  FileText,
  DollarSign,
  X,
  PlusCircle,
  Coins,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Warehouse,
  Printer,
  Package,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Purchase, PurchaseItem } from '../../types/erp';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { printElementContent } from '../../utils/printEngine';

export const PurchaseView: React.FC<{
  isOpenNewPurchaseModal: boolean;
  onCloseNewPurchaseModal: () => void;
  onOpenNewPurchaseModal: () => void;
}> = ({ isOpenNewPurchaseModal, onCloseNewPurchaseModal, onOpenNewPurchaseModal }) => {
  const {
    language,
    currentCompany,
    currentBranchId,
    purchases,
    suppliers,
    products,
    godowns,
    budgets,
    createPurchase,
    getGodownStock,
  } = useERP();

  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  // Storage Godown selection for order receipt
  const [storageGodownId, setStorageGodownId] = useState<string>(godowns[0]?.id || 'godown_dhaka_main');

  // Currency configuration
  const baseCurrency = currentCompany.settings?.baseCurrency || currentCompany.settings?.currency || 'BDT';
  const currencyList = currentCompany.settings?.currencies || [
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rateToBase: 1.0, isBase: true },
    { code: 'USD', symbol: '$', name: 'US Dollar', rateToBase: 121.50, isBase: false },
    { code: 'EUR', symbol: '€', name: 'Euro', rateToBase: 131.25, isBase: false },
    { code: 'GBP', symbol: '£', name: 'British Pound', rateToBase: 153.80, isBase: false },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', rateToBase: 32.40, isBase: false },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateToBase: 33.08, isBase: false },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToBase: 1.44, isBase: false },
  ];
  const [purchaseCurrency, setPurchaseCurrency] = useState<string>(baseCurrency);

  // Active Procurement Budget lookup
  const procurementBudget = useMemo(() => {
    return budgets.find(
      (b) =>
        b.companyId === currentCompany.id &&
        b.category === 'procurement' &&
        b.status === 'active'
    );
  }, [budgets, currentCompany.id]);

  // Selected Currency Rate
  const currentRateObj = useMemo(() => {
    return currencyList.find((c) => c.code === purchaseCurrency) || { rateToBase: 1, symbol: '৳' };
  }, [currencyList, purchaseCurrency]);

  // New Purchase Form
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'bank' | 'cash' | 'cheque'>('bank');
  const [purchaseDiscount, setPurchaseDiscount] = useState<number>(0);
  const [purchasePaidAmount, setPurchasePaidAmount] = useState<number | ''>('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(() => {
    const p = products[0];
    const gdn = godowns[0];
    return [
      {
        productId: p?.id || '',
        productName: p?.name || '',
        productCode: p?.code || '',
        uom: p?.uom || 'Pcs',
        quantity: 5,
        unitPrice: p?.purchasePrice || 0,
        total: (p?.purchasePrice || 0) * 5,
        godownId: gdn?.id || 'godown_dhaka_main',
        godownName: gdn?.name || 'Dhaka Central Godown (Main)',
      },
    ];
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (currentBranchId !== 'all' && p.branchId !== currentBranchId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBill = p.billNo.toLowerCase().includes(q);
        const matchesSupp = p.supplierName.toLowerCase().includes(q);
        if (!matchesBill && !matchesSupp) return false;
      }
      return true;
    });
  }, [purchases, currentBranchId, searchQuery]);

  const subtotal = useMemo(() => purchaseItems.reduce((acc, i) => acc + i.total, 0), [purchaseItems]);
  const grandTotal = Math.max(0, subtotal - Number(purchaseDiscount || 0));
  const paidAmount = purchasePaidAmount === '' ? grandTotal : Number(purchasePaidAmount);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  // Exchange rate and budget calculations
  const baseCurrencyTotal = Number((grandTotal * (currentRateObj.rateToBase || 1)).toFixed(2));
  const projectedBudgetActual = procurementBudget ? procurementBudget.actualAmount + baseCurrencyTotal : 0;
  const isOverBudget = procurementBudget ? projectedBudgetActual > procurementBudget.baseCurrencyAmount : false;
  const budgetUtilizationPercent = procurementBudget
    ? Number(((projectedBudgetActual / procurementBudget.baseCurrencyAmount) * 100).toFixed(1))
    : 0;

  const handleAddItemRow = () => {
    const p = products[0];
    if (!p) return;
    const gdn = godowns.find((g) => g.id === storageGodownId) || godowns[0];
    setPurchaseItems([
      ...purchaseItems,
      {
        productId: p.id,
        productName: p.name,
        productCode: p.code,
        uom: p.uom,
        quantity: 1,
        unitPrice: p.purchasePrice,
        total: p.purchasePrice,
        godownId: gdn?.id || 'godown_dhaka_main',
        godownName: gdn?.name || 'Dhaka Central Godown (Main)',
      },
    ]);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, val: any) => {
    const updated = [...purchaseItems];
    if (field === 'productId') {
      const p = products.find((x) => x.id === val);
      if (p) {
        updated[index] = {
          ...updated[index],
          productId: p.id,
          productName: p.name,
          productCode: p.code,
          uom: p.uom,
          unitPrice: p.purchasePrice,
          total: updated[index].quantity * p.purchasePrice,
        };
      }
    } else if (field === 'quantity') {
      const q = Math.max(1, parseInt(val) || 1);
      updated[index] = {
        ...updated[index],
        quantity: q,
        total: q * updated[index].unitPrice,
      };
    } else if (field === 'unitPrice') {
      const price = Math.max(0, parseFloat(val) || 0);
      updated[index] = {
        ...updated[index],
        unitPrice: price,
        total: updated[index].quantity * price,
      };
    } else if (field === 'godownId') {
      const gdn = godowns.find((g) => g.id === val);
      updated[index] = {
        ...updated[index],
        godownId: val,
        godownName: gdn ? gdn.name : '',
      };
    }
    setPurchaseItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (purchaseItems.length <= 1) return;
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const supp = suppliers.find((s) => s.id === supplierId);
    if (!supp) {
      setFormError('Please select a supplier');
      return;
    }

    const gdnHeader = godowns.find((g) => g.id === storageGodownId);
    const res = createPurchase({
      supplierId: supp.id,
      supplierName: supp.name,
      date: purchaseDate,
      godownId: storageGodownId,
      godownName: gdnHeader ? gdnHeader.name : undefined,
      items: purchaseItems.map((item) => {
        const itemGdn = godowns.find((g) => g.id === (item.godownId || storageGodownId));
        return {
          ...item,
          godownId: item.godownId || storageGodownId,
          godownName: item.godownName || (itemGdn ? itemGdn.name : undefined),
        };
      }),
      discount: Number(purchaseDiscount) || 0,
      paidAmount,
      paymentMethod: purchasePaymentMethod,
      currency: purchaseCurrency,
      exchangeRate: currentRateObj.rateToBase,
    });

    if (res.success && res.purchase) {
      onCloseNewPurchaseModal();
      setPurchaseDiscount(0);
      setPurchasePaidAmount('');
      setViewingPurchase(res.purchase);
    } else {
      setFormError(res.error || 'Failed to record purchase');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.purchases}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Procurement bills, automatic inventory stock addition, and accounts payable postings
          </p>
        </div>

        <button
          onClick={onOpenNewPurchaseModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Supplier Purchase</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by bill # or supplier name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {filteredPurchases.length} supplier bills
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Bill No</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Supplier</th>
                <th className="py-2.5 px-4">Items Summary</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
                <th className="py-2.5 px-4 text-right">Grand Total</th>
                <th className="py-2.5 px-4 text-right">Paid</th>
                <th className="py-2.5 px-4 text-right">Due (Payable)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No supplier purchase bills recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {p.billNo}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {formatDateBD(p.date)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {p.supplierName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono">
                      {p.items.length} items ({p.items.reduce((sum, i) => sum + i.quantity, 0)} units)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatBDT(p.subtotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBDT(p.grandTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold tabular-nums">
                      {formatBDT(p.paidAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                      {p.dueAmount > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">{formatBDT(p.dueAmount)}</span>
                      ) : (
                        <span className="text-slate-400">৳0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setViewingPurchase(p)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="View Goods Receipt Note & Print Bill (গোডাউন চালান ও ভাউচার)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PURCHASE BILL MODAL */}
      {isOpenNewPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Record Supplier Purchase Bill
                </h2>
              </div>
              <button onClick={onCloseNewPurchaseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {formError}
              </div>
            )}

            {/* Procurement Budget Monitor Banner */}
            {procurementBudget && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  isOverBudget
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PieChart
                    className={`w-4 h-4 shrink-0 ${isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Budget Control: {procurementBudget.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 uppercase">
                        {procurementBudget.periodName}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-85 mt-0.5 font-mono">
                      Cap: ৳{procurementBudget.baseCurrencyAmount.toLocaleString()} · Current Actual: ৳
                      {procurementBudget.actualAmount.toLocaleString()} · Bill Impact: +৳
                      {baseCurrencyTotal.toLocaleString()} ({budgetUtilizationPercent}% projected)
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isOverBudget
                        ? 'bg-rose-200/60 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100'
                        : 'bg-teal-200/60 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100'
                    }`}
                  >
                    {isOverBudget ? 'Exceeds Budget' : 'Budget Approved'}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitPurchase} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Supplier <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Payable: ৳{s.currentBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bill / Invoice Date
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Currency</span>
                    {purchaseCurrency !== baseCurrency && (
                      <span className="text-[10px] text-teal-600 font-mono font-bold">
                        1 {purchaseCurrency} = {currentRateObj.rateToBase} {baseCurrency}
                      </span>
                    )}
                  </label>
                  <select
                    value={purchaseCurrency}
                    onChange={(e) => setPurchaseCurrency(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                  >
                    {currencyList.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) {c.code === baseCurrency ? '• Base Currency' : `• Rate: ${c.rateToBase}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="bank">Bank Transfer / Cheque</option>
                    <option value="cash">Cash in Hand</option>
                  </select>
                </div>
              </div>

              {/* Storage Godown Prominent Prompt - "পণ্য কোন গোডাউনে রাখবে?" */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Warehouse className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                      পণ্য কোন গোডাউনে রাখবে? (Select Storage Godown / Sub-Godown) *
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300">
                      অর্ডার রিসিভ করার পর পণ্য এই গোডাউনে স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে যোগ হবে
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-80">
                  <select
                    value={storageGodownId}
                    onChange={(e) => {
                      const newGdnId = e.target.value;
                      setStorageGodownId(newGdnId);
                      const gdnObj = godowns.find((g) => g.id === newGdnId);
                      setPurchaseItems((prev) =>
                        prev.map((item) => ({
                          ...item,
                          godownId: newGdnId,
                          godownName: gdnObj ? gdnObj.name : item.godownName,
                        }))
                      );
                    }}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white font-bold"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.parentId ? '↳ Sub-Godown: ' : 'Main Godown: '} {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Merchandise Items Received (রিসিভকৃত পণ্যের তালিকা)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 w-48">Storage Godown (গুদাম)</th>
                        <th className="py-2 px-3 w-20">Qty</th>
                        <th className="py-2 px-3 w-28">Cost Price (৳)</th>
                        <th className="py-2 px-3 text-right w-28">Total (৳)</th>
                        <th className="py-2 px-3 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                              className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={item.godownId || storageGodownId}
                              onChange={(e) => handleItemChange(idx, 'godownId', e.target.value)}
                              className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                            >
                              {godowns.map((g) => {
                                const stock = getGodownStock(item.productId, g.id);
                                return (
                                  <option key={g.id} value={g.id}>
                                    {g.parentId ? '↳ ' : ''}{g.name} (মজুত: {stock} {item.uom})
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full text-xs p-1.5 text-center font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-full text-xs p-1.5 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold tabular-nums">
                            ৳{item.total.toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            {purchaseItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settlement summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Special Discount ({purchaseCurrency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={purchaseDiscount === 0 ? '' : purchaseDiscount}
                      onChange={(e) => setPurchaseDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Paid Amount ({purchaseCurrency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={purchasePaidAmount}
                      onChange={(e) => setPurchasePaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder={grandTotal.toString()}
                      className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Due / Accounts Payable
                    </label>
                    <div className="w-full text-xs p-1.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {purchaseCurrency} {dueAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Currency Conversion Breakdown Callout */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Coins className="w-4 h-4 text-teal-600" />
                    <span>
                      Total Bill: <strong className="text-slate-900 dark:text-white font-mono">{purchaseCurrency} {grandTotal.toLocaleString()}</strong>
                      {purchaseCurrency !== baseCurrency && (
                        <span className="text-teal-600 dark:text-teal-400 ml-1 font-semibold">
                          (Converted: ৳{baseCurrencyTotal.toLocaleString()} @ FX {currentRateObj.rateToBase})
                        </span>
                      )}
                    </span>
                  </div>

                  {procurementBudget && (
                    <div className="text-[11px] font-mono text-slate-500">
                      Procurement Budget utilization: <strong className={isOverBudget ? 'text-rose-600' : 'text-teal-600'}>{budgetUtilizationPercent}%</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onCloseNewPurchaseModal}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs"
                >
                  Post Purchase & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEWING PURCHASE / GOODS RECEIPT NOTE (GRN) MODAL */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Goods Receipt Note & Purchase Bill (চালান ও রিসিট ভাউচার)
                </h2>
              </div>
              <button
                onClick={() => setViewingPurchase(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="purchase-receipt-print-area" className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{currentCompany.name}</h3>
                  <p className="text-slate-500">{currentCompany.address}</p>
                  <p className="text-slate-500">Phone: {currentCompany.phone} · Trade Lic: {currentCompany.tradeLicense}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold block mb-1">
                    {viewingPurchase.billNo}
                  </span>
                  <p className="text-slate-500">Date: {formatDateBD(viewingPurchase.date)}</p>
                  <p className="text-slate-500 font-bold">Status: {viewingPurchase.status.toUpperCase()}</p>
                </div>
              </div>

              {/* Supplier & Receiving Godown Banner */}
              <div className="grid grid-cols-2 gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Supplier / Vendor:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{viewingPurchase.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-teal-600 font-semibold uppercase block flex items-center gap-1">
                    <Warehouse className="w-3.5 h-3.5" />
                    Storage Godown (পণ্য রাখা হয়েছে যে গোডাউনে):
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {viewingPurchase.godownName || godowns.find((g) => g.id === viewingPurchase.godownId)?.name || 'Central Godown'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="py-1.5">Product</th>
                    <th className="py-1.5">Godown</th>
                    <th className="py-1.5 text-center">Qty</th>
                    <th className="py-1.5 text-right">Cost Price</th>
                    <th className="py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingPurchase.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-slate-900 dark:text-white">
                        {it.productName} <span className="text-[10px] text-slate-400 font-mono">({it.productCode})</span>
                      </td>
                      <td className="py-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {it.godownName || viewingPurchase.godownName || 'Main Godown'}
                      </td>
                      <td className="py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatBDT(it.unitPrice)}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatBDT(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-end font-mono">
                <div className="w-48 space-y-1 text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatBDT(viewingPurchase.subtotal)}</span>
                  </div>
                  {viewingPurchase.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatBDT(viewingPurchase.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span>Grand Total:</span>
                    <span>{formatBDT(viewingPurchase.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Paid:</span>
                    <span>{formatBDT(viewingPurchase.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Due:</span>
                    <span>{formatBDT(viewingPurchase.dueAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  printElementContent(
                    'purchase-receipt-print-area',
                    `Goods-Receipt-${viewingPurchase.billNo}`,
                    currentCompany.name
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Goods Receipt (প্রিন্ট চালান)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
