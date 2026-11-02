import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Printer,
  Trash2,
  CheckCircle2,
  Barcode,
  CreditCard,
  Building,
  User,
  DollarSign,
  FileText,
  X,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  Coins,
  Warehouse,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Sale, SaleItem, Product } from '../../types/erp';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { printIsolatedDocument } from '../../utils/printEngine';
import { StandardInvoiceReportView } from '../common/StandardInvoiceReportView';
import { amountToWordsBDT } from '../../utils/numberToWords';

export const SalesView: React.FC<{
  isOpenNewSaleModal: boolean;
  onCloseNewSaleModal: () => void;
  onOpenNewSaleModal: () => void;
}> = ({ isOpenNewSaleModal, onCloseNewSaleModal, onOpenNewSaleModal }) => {
  const {
    language,
    currentCompany,
    currentBranchId,
    branches,
    sales,
    products,
    customers,
    godowns,
    createSale,
    deleteSale,
    getGodownStock,
    currentUser,
  } = useERP();

  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'invoices' | 'pos'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<Sale | null>(null);
  const [invoiceModalLayout, setInvoiceModalLayout] = useState<'standard_report' | 'pos'>('standard_report');
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [deleteReason, setDeleteReason] = useState('Customer cancelled order before dispatch');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Dispatch Godown selection for active sale
  const [posGodownId, setPosGodownId] = useState<string>(godowns[0]?.id || 'godown_dhaka_main');
  const posGodownObj = useMemo(() => {
    return godowns.find((g) => g.id === posGodownId) || godowns[0];
  }, [godowns, posGodownId]);

  // Currency selection
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
  const [posCurrency, setPosCurrency] = useState<string>(baseCurrency);
  const currentRateObj = useMemo(() => {
    return currencyList.find((c) => c.code === posCurrency) || { rateToBase: 1, symbol: '৳' };
  }, [currencyList, posCurrency]);

  // POS / New Sale Form State
  const [posCustomer, setPosCustomer] = useState(customers[0]?.id || 'cust_4');
  const [posItems, setPosItems] = useState<SaleItem[]>([]);
  const [posProductSearch, setPosProductSearch] = useState('');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'bank' | 'bkash' | 'nagad' | 'cheque'>('cash');
  const [posPaidAmount, setPosPaidAmount] = useState<number | ''>('');
  const [posError, setPosError] = useState<string | null>(null);

  // Filtered Invoices
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (currentBranchId !== 'all' && s.branchId !== currentBranchId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInv = s.invoiceNo.toLowerCase().includes(q);
        const matchesCust = s.customerName.toLowerCase().includes(q);
        const matchesMethod = s.paymentMethod.toLowerCase().includes(q);
        if (!matchesInv && !matchesCust && !matchesMethod) return false;
      }
      return true;
    });
  }, [sales, currentBranchId, searchQuery]);

  // Product search results for POS
  const posAvailableProducts = useMemo(() => {
    if (!posProductSearch.trim()) return products.slice(0, 8);
    const q = posProductSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
    );
  }, [products, posProductSearch]);

  // Add Item to POS Cart
  const handleAddToCart = (product: Product) => {
    const gdn = godowns.find((g) => g.id === posGodownId) || godowns[0];
    const existing = posItems.find((i) => i.productId === product.id && i.godownId === (gdn?.id || posGodownId));
    if (existing) {
      setPosItems(
        posItems.map((i) =>
          i.productId === product.id && i.godownId === (gdn?.id || posGodownId)
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
            : i
        )
      );
    } else {
      setPosItems([
        ...posItems,
        {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          uom: product.uom,
          quantity: 1,
          unitPrice: product.salesPrice,
          total: product.salesPrice,
          godownId: gdn?.id || posGodownId,
          godownName: gdn?.name || 'Dhaka Central Godown (Main)',
        },
      ]);
    }
  };

  const handleUpdateItemQty = (productId: string, delta: number, itemGodownId?: string) => {
    setPosItems((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId && (!itemGodownId || i.godownId === itemGodownId)) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ, total: newQ * i.unitPrice } : null;
          }
          return i;
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const handleRemoveFromCart = (productId: string, itemGodownId?: string) => {
    setPosItems(posItems.filter((i) => !(i.productId === productId && (!itemGodownId || i.godownId === itemGodownId))));
  };

  const handleUpdateItemGodown = (productId: string, newGodownId: string, currentItemGodownId?: string) => {
    const gdnObj = godowns.find((g) => g.id === newGodownId);
    setPosItems((prev) =>
      prev.map((i) =>
        i.productId === productId && (!currentItemGodownId || i.godownId === currentItemGodownId)
          ? {
              ...i,
              godownId: newGodownId,
              godownName: gdnObj ? gdnObj.name : i.godownName,
            }
          : i
      )
    );
  };

  // Totals
  const subtotal = useMemo(() => posItems.reduce((acc, i) => acc + i.total, 0), [posItems]);
  const vatRate = currentCompany.settings.defaultVatPercent || 7.5;
  const taxableBase = Math.max(0, subtotal - Number(posDiscount || 0));
  const vatAmount = Number(((taxableBase * vatRate) / 100).toFixed(2));
  const grandTotal = Number((taxableBase + vatAmount).toFixed(2));
  const paidAmount = posPaidAmount === '' ? grandTotal : Number(posPaidAmount);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  // Submit Sale
  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    setPosError(null);

    if (posItems.length === 0) {
      setPosError('Please add at least one merchandise item to the bill.');
      return;
    }

    const customer = customers.find((c) => c.id === posCustomer) || customers[0];
    const gdnHeader = godowns.find((g) => g.id === posGodownId);

    const result = createSale({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      godownId: posGodownId,
      godownName: gdnHeader ? gdnHeader.name : undefined,
      items: posItems.map((item) => ({
        ...item,
        godownId: item.godownId || posGodownId,
        godownName: item.godownName || (gdnHeader ? gdnHeader.name : undefined),
      })),
      discount: Number(posDiscount) || 0,
      vatPercent: vatRate,
      paidAmount,
      paymentMethod: posPaymentMethod,
      currency: posCurrency,
      exchangeRate: currentRateObj.rateToBase,
    });

    if (result.success && result.sale) {
      setViewingInvoice(result.sale);
      setPosItems([]);
      setPosDiscount(0);
      setPosPaidAmount('');
      onCloseNewSaleModal();
      setActiveTab('invoices');
    } else {
      setPosError(result.error || 'Failed to complete sale transaction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.sales}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time POS billing, credit sales tracking, VAT calculation, and instant double-entry postings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('pos');
              onOpenNewSaleModal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open Quick POS Terminal</span>
          </button>
        </div>
      </div>

      {/* Invoices List View */}
      <div className="space-y-4">
        {deleteSuccessMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, customer name, payment..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredSales.length} invoices recorded
          </span>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Invoice No</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Dispatch Godown</th>
                  <th className="py-2.5 px-4">Items</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                  <th className="py-2.5 px-4 text-right">VAT ({vatRate}%)</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                  <th className="py-2.5 px-4 text-right">Paid</th>
                  <th className="py-2.5 px-4 text-right">Due</th>
                  <th className="py-2.5 px-4 text-center">Payment</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      No invoices found. Use "Open Quick POS Terminal" to create a new sale.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {s.invoiceNo}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {formatDateBD(s.date)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {s.customerName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40">
                          <Warehouse className="w-3 h-3 text-rose-500" />
                          <span>{s.godownName || 'Main Godown'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">
                        {s.items.length} items ({s.items.reduce((sum, i) => sum + i.quantity, 0)} pcs)
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatBDT(s.subtotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {formatBDT(s.vatAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatBDT(s.grandTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold tabular-nums">
                        {formatBDT(s.paidAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                        {s.dueAmount > 0 ? (
                          <span className="text-rose-600">{formatBDT(s.dueAmount)}</span>
                        ) : (
                          <span className="text-slate-400">৳0.00</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingInvoice(s)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Print Receipt / Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSale(s)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Void & Delete Invoice (Restores Stock & Generates Audit Event)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK POS BILLING MODAL / SCREEN */}
      {isOpenNewSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Quick POS Counter Billing
                </h2>
              </div>
              <button
                onClick={onCloseNewSaleModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {posError && (
              <div className="mt-2 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {posError}
              </div>
            )}

            {/* Dispatch Godown Selection Prompt */}
            <div className="mt-3 p-3 bg-rose-50/80 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 shadow-xs">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>পণ্য কোন গোডাউন থেকে ডেলিভারি হবে? (Dispatch Godown / Sub-Godown)</span>
                    <span className="text-rose-600 font-black">*</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    গোডাউন অনুযায়ী পণ্যের বর্তমান লাইভ স্টক স্বয়ংক্রিয়ভাবে নিচে দেখানো হচ্ছে।
                  </p>
                </div>
              </div>
              <div className="sm:w-72 shrink-0">
                <select
                  value={posGodownId}
                  onChange={(e) => setPosGodownId(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg text-slate-900 dark:text-white font-bold shadow-xs focus:ring-2 focus:ring-rose-500"
                >
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.parentId ? '↳ Sub-Godown: ' : 'Main Godown: '} {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-3 flex-1 overflow-hidden">
              {/* Left Column: Product Selection & Barcode Scan */}
              <div className="lg:col-span-7 flex flex-col gap-3 overflow-hidden">
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={posProductSearch}
                    onChange={(e) => setPosProductSearch(e.target.value)}
                    placeholder="Scan barcode or type product name/SKU..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {posAvailableProducts.map((p) => {
                    const totalStock = Object.values(p.branchStock).reduce((a, b) => a + b, 0);
                    const stockInGodown = getGodownStock(p.id, posGodownId);
                    const inStock = stockInGodown > 0;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className={`text-left p-3 rounded-xl border transition-all group flex flex-col justify-between ${
                          inStock
                            ? 'border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 bg-white dark:bg-slate-800/60 shadow-2xs'
                            : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 truncate">
                              {p.name}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {p.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {p.sku} · Barcode: {p.barcode}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatBDT(p.salesPrice)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Total: {totalStock} {p.uom}
                            </span>
                          </div>

                          {/* Live Dispatch Godown Stock Badge */}
                          <div className="flex items-center justify-between text-[10px] bg-slate-50 dark:bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium truncate">
                              <Warehouse className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">{posGodownObj?.name || 'Godown'}:</span>
                            </span>
                            <span
                              className={`font-mono font-bold shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                                stockInGodown > 5
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : stockInGodown > 0
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {stockInGodown} {p.uom} মজুত
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Bill Cart & Tender */}
              <div className="lg:col-span-5 flex flex-col bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 justify-between overflow-hidden">
                <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                  {/* Customer & Billing Currency Select */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Customer / Account
                      </label>
                      <select
                        value={posCustomer}
                        onChange={(e) => setPosCustomer(e.target.value)}
                        className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.currentBalance > 0 ? `(Due: ৳${c.currentBalance.toLocaleString()})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Currency</span>
                        {posCurrency !== baseCurrency && (
                          <span className="text-[10px] text-rose-600 font-mono font-bold">
                            1 {posCurrency} = {currentRateObj.rateToBase}
                          </span>
                        )}
                      </label>
                      <select
                        value={posCurrency}
                        onChange={(e) => setPosCurrency(e.target.value)}
                        className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                      >
                        {currencyList.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol}) {c.code === baseCurrency ? '• Base' : `@ ${c.rateToBase}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cart Items List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900">
                    {posItems.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Cart is empty. Click merchandise on left to add.
                      </div>
                    ) : (
                      posItems.map((item) => {
                        const itemStockInGdn = getGodownStock(item.productId, item.godownId);
                        const isExceeded = item.quantity > itemStockInGdn;
                        return (
                          <div
                            key={item.productId}
                            className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="truncate max-w-[140px]">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                  {item.productName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  ৳{item.unitPrice.toLocaleString()} / {item.uom}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.productId, -1, item.godownId)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-mono font-bold text-xs w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.productId, 1, item.godownId)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums w-16">
                                ৳{item.total.toLocaleString()}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.productId, item.godownId)}
                                className="text-slate-300 hover:text-rose-600 ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Item Dispatch Godown Selector & Live Stock */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <Warehouse className="w-3 h-3 text-rose-500 shrink-0" />
                                <select
                                  value={item.godownId || posGodownId}
                                  onChange={(e) => handleUpdateItemGodown(item.productId, e.target.value, item.godownId)}
                                  className="w-full text-[10px] py-0.5 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-medium truncate"
                                >
                                  {godowns.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <span
                                className={`font-mono shrink-0 px-1.5 py-0.5 rounded font-semibold ${
                                  isExceeded
                                    ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60'
                                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60'
                                }`}
                              >
                                মজুত: {itemStockInGdn} {item.uom} {isExceeded && '⚠️ স্টক শেষ!'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Calculation Summary & Payment Tender */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 shrink-0">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono tabular-nums">{formatBDT(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Discount (৳):</span>
                    <input
                      type="number"
                      min="0"
                      value={posDiscount === 0 ? '' : posDiscount}
                      onChange={(e) => setPosDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 text-right text-xs p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono"
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>VAT ({vatRate}% NBR):</span>
                    <span className="font-mono tabular-nums">{formatBDT(vatAmount)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Grand Total:</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatBDT(grandTotal)}
                    </span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(['cash', 'bank', 'bkash', 'nagad'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPosPaymentMethod(method)}
                        className={`py-1 text-[11px] font-bold rounded uppercase border transition-all ${
                          posPaymentMethod === method
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {/* Paid & Due */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Paid Tendered (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={posPaidAmount}
                        onChange={(e) => setPosPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder={grandTotal.toString()}
                        className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Due / Balance
                      </label>
                      <div className="w-full text-xs p-1.5 bg-slate-100 dark:bg-slate-900 rounded font-mono font-bold text-rose-600 tabular-nums">
                        {formatBDT(dueAmount)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    disabled={posItems.length === 0}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 mt-1"
                  >
                    Complete Sale & Print Invoice (F8)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW & PRINT INVOICE MODAL */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Sales Invoice Document
                </span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setInvoiceModalLayout('standard_report')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      invoiceModalLayout === 'standard_report'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Standard Report
                  </button>
                  <button
                    onClick={() => setInvoiceModalLayout('pos')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      invoiceModalLayout === 'pos'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    POS Thermal Slip
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 py-3">
              {invoiceModalLayout === 'standard_report' ? (
                <StandardInvoiceReportView
                  companyName={currentCompany.name}
                  companyAddress={currentCompany.address}
                  companyPhone={currentCompany.phone}
                  voucherTitle="SALES VOUCHER"
                  voucherNo={viewingInvoice.invoiceNo}
                  date={formatDateBD(viewingInvoice.date)}
                  partyName={viewingInvoice.customerName}
                  refNo={viewingInvoice.invoiceNo}
                  items={viewingInvoice.items.map((it, idx) => ({
                    sl: idx + 1,
                    description: it.productName,
                    qty: it.quantity,
                    uom: it.uom,
                    unitPrice: it.unitPrice,
                    amount: it.total,
                  }))}
                  totalAmount={viewingInvoice.grandTotal}
                  inWords={amountToWordsBDT(viewingInvoice.grandTotal)}
                  preparedBy={viewingInvoice.salesperson || 'Prepared By'}
                  checkedBy="Checked By / Accountant"
                  authorizedBy="Authorized Director"
                  showActions={true}
                />
              ) : (
                /* Thermal / POS Paper Receipt layout */
                <div className="pt-2 space-y-4 print:p-0 font-mono text-xs">
                  <div className="flex justify-end pb-2">
                    <button
                      onClick={() => {
                        const invoiceHtml = `
                          <div style="font-family: monospace; font-size: 11px; max-width: 300px; margin: 0 auto; padding: 10px;">
                            <div style="text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px;">
                              <h2 style="font-size: 14px; font-weight: bold; margin: 0;">${currentCompany.name}</h2>
                              <p style="font-size: 10px; color: #555; margin: 2px 0;">${currentCompany.address}</p>
                              <p style="font-size: 10px; color: #555; margin: 2px 0;">Phone: ${currentCompany.phone} · BIN: ${currentCompany.tin}</p>
                              <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">TAX INVOICE / CASH MEMO</div>
                            </div>
                            <div style="font-size: 10px; margin-bottom: 8px;">
                              <div>Invoice: <strong>${viewingInvoice.invoiceNo}</strong></div>
                              <div>Date: <strong>${formatDateBD(viewingInvoice.date)}</strong></div>
                              <div>Customer: <strong>${viewingInvoice.customerName}</strong></div>
                              <div>Salesperson: ${viewingInvoice.salesperson}</div>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px;">
                              <thead>
                                <tr style="border-top: 1px dashed #333; border-bottom: 1px dashed #333;">
                                  <th style="text-align: left; padding: 3px 0;">Item</th>
                                  <th style="text-align: center; padding: 3px 0;">Qty</th>
                                  <th style="text-align: right; padding: 3px 0;">Price</th>
                                  <th style="text-align: right; padding: 3px 0;">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${viewingInvoice.items
                                  .map(
                                    (it) => `
                                  <tr>
                                    <td style="padding: 2px 0;">${it.productName}</td>
                                    <td style="text-align: center; padding: 2px 0;">${it.quantity}</td>
                                    <td style="text-align: right; padding: 2px 0;">${formatBDT(it.unitPrice)}</td>
                                    <td style="text-align: right; padding: 2px 0; font-weight: bold;">${formatBDT(it.total)}</td>
                                  </tr>
                                `
                                  )
                                  .join('')}
                              </tbody>
                            </table>
                            <div style="border-top: 1px dashed #333; padding-top: 6px; font-size: 11px; text-align: right;">
                              <div>Subtotal: <strong>${formatBDT(viewingInvoice.subtotal)}</strong></div>
                              ${viewingInvoice.discount > 0 ? `<div>Discount: <strong style="color: #e11d48;">-${formatBDT(viewingInvoice.discount)}</strong></div>` : ''}
                              <div>VAT (${viewingInvoice.vatPercent}%): <strong>${formatBDT(viewingInvoice.vatAmount)}</strong></div>
                              <div style="border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 4px 0; margin: 4px 0; font-size: 13px; font-weight: bold;">
                                Net Payable: ${formatBDT(viewingInvoice.grandTotal)}
                              </div>
                              <div>Paid Amount: <strong style="color: #059669;">${formatBDT(viewingInvoice.paidAmount)}</strong></div>
                              ${viewingInvoice.dueAmount > 0 ? `<div style="color: #e11d48; font-weight: bold;">Outstanding Due: ${formatBDT(viewingInvoice.dueAmount)}</div>` : ''}
                            </div>
                            <div style="text-align: center; font-size: 10px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px;">
                              <p>Thank you for your business!</p>
                              <p style="margin-top: 2px;">Goods once sold can be exchanged within 7 days with invoice.</p>
                            </div>
                          </div>
                        `;
                        printIsolatedDocument(invoiceHtml, `Invoice ${viewingInvoice.invoiceNo}`, {
                          paperSize: 'pos_80mm',
                          showCompanyHeader: true,
                          showSignatures: false,
                          showSeal: false,
                          copies: 1,
                        });
                      }}
                      className="px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print POS Slip
                    </button>
                  </div>

                  <div className="text-center border-b pb-3 border-slate-200 dark:border-slate-700 font-sans">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                      {currentCompany.name}
                    </h2>
                    <p className="text-[11px] text-slate-500">{currentCompany.address}</p>
                    <p className="text-[11px] text-slate-500">Phone: {currentCompany.phone} · BIN: {currentCompany.tin}</p>
                    <div className="mt-2 text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block font-mono">
                      TAX INVOICE / CASH MEMO
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] py-1">
                    <div>
                      <p><span className="text-slate-400">Invoice:</span> <strong>{viewingInvoice.invoiceNo}</strong></p>
                      <p><span className="text-slate-400">Date:</span> <strong>{formatDateBD(viewingInvoice.date)}</strong></p>
                      <p><span className="text-slate-400">Salesperson:</span> {viewingInvoice.salesperson}</p>
                      <p>
                        <span className="text-slate-400">ডেলিভারি গুদাম:</span>{' '}
                        <strong className="text-rose-600 dark:text-rose-400">
                          {viewingInvoice.godownName || 'Main Central Godown'}
                        </strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p><span className="text-slate-400">Customer:</span> <strong>{viewingInvoice.customerName}</strong></p>
                      {viewingInvoice.customerPhone && (
                        <p><span className="text-slate-400">Phone:</span> {viewingInvoice.customerPhone}</p>
                      )}
                      <p><span className="text-slate-400">Payment:</span> <strong className="uppercase">{viewingInvoice.paymentMethod}</strong></p>
                    </div>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-2">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                          <th className="text-left pb-1">Item & Godown</th>
                          <th className="text-center pb-1">Qty</th>
                          <th className="text-right pb-1">Price</th>
                          <th className="text-right pb-1">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {viewingInvoice.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{it.productName}</div>
                              <div className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                <Warehouse className="w-2.5 h-2.5 text-rose-500" />
                                <span>গুদাম: {it.godownName || viewingInvoice.godownName || 'Main Central Godown'}</span>
                              </div>
                            </td>
                            <td className="py-1 text-center">{it.quantity} {it.uom}</td>
                            <td className="py-1 text-right tabular-nums">{formatBDT(it.unitPrice)}</td>
                            <td className="py-1 text-right font-bold tabular-nums">{formatBDT(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1 text-right text-[11px]">
                    <p>Subtotal: <span className="font-bold tabular-nums">{formatBDT(viewingInvoice.subtotal)}</span></p>
                    {viewingInvoice.discount > 0 && (
                      <p>Discount: <span className="text-rose-600 font-bold tabular-nums">-{formatBDT(viewingInvoice.discount)}</span></p>
                    )}
                    <p>VAT ({viewingInvoice.vatPercent}%): <span className="tabular-nums">{formatBDT(viewingInvoice.vatAmount)}</span></p>
                    <p className="text-sm font-bold border-t border-b border-dashed py-1">
                      Net Payable: <span className="tabular-nums">{formatBDT(viewingInvoice.grandTotal)}</span>
                    </p>
                    <p>Paid Amount: <span className="font-bold text-emerald-600 tabular-nums">{formatBDT(viewingInvoice.paidAmount)}</span></p>
                    {viewingInvoice.dueAmount > 0 && (
                      <p className="text-rose-600 font-bold">Outstanding Due: <span className="tabular-nums">{formatBDT(viewingInvoice.dueAmount)}</span></p>
                    )}
                  </div>

                  <div className="pt-4 text-center text-[10px] text-slate-400 font-sans border-t">
                    <p>Thank you for your business! Goods once sold can be exchanged within 7 days with invoice.</p>
                    <p className="mt-1">Powered by Apex ERP Central Cloud</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE / VOID INVOICE CONFIRMATION MODAL */}
      {deletingSale && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Void & Delete Sales Invoice
                </h3>
                <p className="text-xs text-slate-500 font-mono">Invoice #{deletingSale.invoiceNo}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 p-3 bg-red-50/50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/40">
              <p className="font-semibold text-red-800 dark:text-red-300">This action will automatically:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-red-700 dark:text-red-400">
                <li>Restore inventory stock for all {deletingSale.items.length} line items</li>
                <li>Generate compensating reversal stock movements</li>
                <li>Adjust customer balance if credit was issued</li>
                <li>Log a critical record in the immutable Audit Log Viewer</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Void / Deletion (Mandatory for Audit Trail)
              </label>
              <textarea
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Entry error, customer returned items, duplicated billing"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-hidden focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSale(null)}
                className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = deleteSale(deletingSale.id, deleteReason);
                  if (res.success) {
                    setDeleteSuccessMsg(`Invoice #${deletingSale.invoiceNo} successfully voided, inventory restored, and audit log recorded.`);
                    setTimeout(() => setDeleteSuccessMsg(null), 3500);
                  }
                  setDeletingSale(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                Confirm Void & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
