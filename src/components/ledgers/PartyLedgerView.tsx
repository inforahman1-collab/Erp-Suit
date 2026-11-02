import React, { useState, useMemo } from 'react';
import {
  Users2,
  Building,
  Search,
  Plus,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Customer, Supplier, Voucher } from '../../types/erp';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { printElementContent } from '../../utils/printEngine';
import { PartyAlterModal } from './PartyAlterModal';

export const PartyLedgerView: React.FC<{ initialType?: 'customers' | 'suppliers' }> = ({
  initialType = 'customers',
}) => {
  const {
    language,
    currentCompany,
    customers,
    suppliers,
    vouchers,
    sales,
    purchases,
    recordCustomerReceipt,
    recordSupplierPayment,
    addCustomer,
    addSupplier,
    updateCustomer,
    deleteCustomer,
    updateSupplier,
    deleteSupplier,
  } = useERP();

  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(initialType);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isOpenReceiptModal, setIsOpenReceiptModal] = useState(false);
  const [isOpenPaymentModal, setIsOpenPaymentModal] = useState(false);
  const [isOpenAddPartyModal, setIsOpenAddPartyModal] = useState(false);
  const [isOpenAlterModal, setIsOpenAlterModal] = useState(false);
  const [alterParty, setAlterParty] = useState<Customer | Supplier | null>(null);

  // Receipt / Payment form
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txMethod, setTxMethod] = useState<'cash' | 'bank'>('cash');
  const [txRefNo, setTxRefNo] = useState('');
  const [txNarration, setTxNarration] = useState('');
  const [txError, setTxError] = useState<string | null>(null);

  // New Party Form
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyEmail, setPartyEmail] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyOpeningBal, setPartyOpeningBal] = useState(0);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Customer Ledger Statement generation
  const customerLedgerRows = useMemo(() => {
    if (!selectedCustomer) return [];

    const rows: {
      date: string;
      refNo: string;
      type: string;
      description: string;
      debit: number; // Sale increases receivable
      credit: number; // Receipt decreases receivable
      balance: number;
    }[] = [];

    let running = selectedCustomer.openingBalance;

    rows.push({
      date: 'Opening',
      refNo: '-',
      type: 'Opening Balance',
      description: 'Opening balance brought forward',
      debit: running > 0 ? running : 0,
      credit: running < 0 ? Math.abs(running) : 0,
      balance: running,
    });

    // Gather all sales for this customer
    const custSales = sales.filter((s) => s.customerId === selectedCustomer.id);
    custSales.forEach((s) => {
      running += s.grandTotal;
      rows.push({
        date: s.date,
        refNo: s.invoiceNo,
        type: 'Sales Invoice',
        description: `Invoice #${s.invoiceNo} (${s.items.length} items)`,
        debit: s.grandTotal,
        credit: 0,
        balance: running,
      });

      if (s.paidAmount > 0) {
        running -= s.paidAmount;
        rows.push({
          date: s.date,
          refNo: `RCT-${s.invoiceNo}`,
          type: 'Payment Tendered',
          description: `Settlement via ${s.paymentMethod}`,
          debit: 0,
          credit: s.paidAmount,
          balance: running,
        });
      }
    });

    // Gather all vouchers with partyId === customer.id
    const custVouchers = vouchers.filter((v) => v.partyId === selectedCustomer.id && v.status === 'posted');
    custVouchers.forEach((v) => {
      // If it's a receipt voucher
      if (v.type === 'receipt') {
        running -= v.totalDebit;
        rows.push({
          date: v.date,
          refNo: v.voucherNo,
          type: 'Receipt Voucher',
          description: v.narration,
          debit: 0,
          credit: v.totalDebit,
          balance: running,
        });
      }
    });

    return rows.sort((a, b) => (a.date === 'Opening' ? -1 : b.date === 'Opening' ? 1 : a.date.localeCompare(b.date)));
  }, [selectedCustomer, sales, vouchers]);

  // Supplier Ledger Statement generation
  const supplierLedgerRows = useMemo(() => {
    if (!selectedSupplier) return [];

    const rows: {
      date: string;
      refNo: string;
      type: string;
      description: string;
      debit: number; // Payment decreases payable
      credit: number; // Purchase increases payable
      balance: number;
    }[] = [];

    let running = selectedSupplier.openingBalance;

    rows.push({
      date: 'Opening',
      refNo: '-',
      type: 'Opening Balance',
      description: 'Opening balance brought forward',
      debit: 0,
      credit: running,
      balance: running,
    });

    // Purchases from this supplier
    const suppPurchases = purchases.filter((p) => p.supplierId === selectedSupplier.id);
    suppPurchases.forEach((p) => {
      running += p.grandTotal;
      rows.push({
        date: p.date,
        refNo: p.billNo,
        type: 'Purchase Bill',
        description: `Bill #${p.billNo} from ${p.supplierName}`,
        debit: 0,
        credit: p.grandTotal,
        balance: running,
      });

      if (p.paidAmount > 0) {
        running -= p.paidAmount;
        rows.push({
          date: p.date,
          refNo: `PMT-${p.billNo}`,
          type: 'Bill Payment',
          description: `Paid via ${p.paymentMethod}`,
          debit: p.paidAmount,
          credit: 0,
          balance: running,
        });
      }
    });

    // Payment vouchers
    const suppVouchers = vouchers.filter((v) => v.partyId === selectedSupplier.id && v.status === 'posted');
    suppVouchers.forEach((v) => {
      if (v.type === 'payment') {
        running -= v.totalDebit;
        rows.push({
          date: v.date,
          refNo: v.voucherNo,
          type: 'Payment Voucher',
          description: v.narration,
          debit: v.totalDebit,
          credit: 0,
          balance: running,
        });
      }
    });

    return rows.sort((a, b) => (a.date === 'Opening' ? -1 : b.date === 'Opening' ? 1 : a.date.localeCompare(b.date)));
  }, [selectedSupplier, purchases, vouchers]);

  // Handle Receipt collection
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    if (!selectedCustomer || txAmount <= 0) {
      setTxError('Please enter a valid receipt amount.');
      return;
    }
    const success = recordCustomerReceipt(selectedCustomer.id, txAmount, txMethod, txRefNo, txNarration);
    if (success) {
      setIsOpenReceiptModal(false);
      setTxAmount(0);
      setTxNarration('');
      setTxRefNo('');
    } else {
      setTxError('Failed to record receipt');
    }
  };

  // Handle Vendor Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    if (!selectedSupplier || txAmount <= 0) {
      setTxError('Please enter a valid payment amount.');
      return;
    }
    const success = recordSupplierPayment(selectedSupplier.id, txAmount, txMethod, txRefNo, txNarration);
    if (success) {
      setIsOpenPaymentModal(false);
      setTxAmount(0);
      setTxNarration('');
      setTxRefNo('');
    } else {
      setTxError('Failed to record payment');
    }
  };

  // Handle Add Party
  const handleSaveNewParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    if (activeTab === 'customers') {
      addCustomer({
        name: partyName,
        phone: partyPhone,
        email: partyEmail,
        address: partyAddress,
        openingBalance: Number(partyOpeningBal) || 0,
      });
    } else {
      addSupplier({
        name: partyName,
        phone: partyPhone,
        email: partyEmail,
        address: partyAddress,
        openingBalance: Number(partyOpeningBal) || 0,
      });
    }

    setIsOpenAddPartyModal(false);
    setPartyName('');
    setPartyPhone('');
    setPartyEmail('');
    setPartyAddress('');
    setPartyOpeningBal(0);
  };

  return (
    <div className="space-y-6">
      {/* Title & Switch Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {activeTab === 'customers' ? t.customers : t.suppliers}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Individual party sub-ledgers, running balances, receivables, payables, and money receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Customer / Supplier Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'customers'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>Customers (Receivables)</span>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'suppliers'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Suppliers (Payables)</span>
            </button>
          </div>

          <button
            onClick={() => setIsOpenAddPartyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add {activeTab === 'customers' ? 'Customer' : 'Supplier'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Party Selector Cards; Right = Ledger Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Party Directory */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {activeTab === 'customers'
              ? customers
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-rose-600 tabular-nums">
                              {formatBDT(c.currentBalance)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerId(c.id);
                                setAlterParty(c);
                                setIsOpenAlterModal(true);
                              }}
                              title="Alter Customer (অল্টার কাস্টমার)"
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{c.code} · {c.category}</span>
                          <span>{c.phone}</span>
                        </div>
                      </div>
                    );
                  })
              : suppliers
                  .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((s) => {
                    const isSelected = selectedSupplier?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSupplierId(s.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                            {s.name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-teal-600 tabular-nums">
                              {formatBDT(s.currentBalance)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplierId(s.id);
                                setAlterParty(s);
                                setIsOpenAlterModal(true);
                              }}
                              title="Alter Supplier (অল্টার সরবরাহকারী)"
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-teal-600 transition-colors"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{s.code}</span>
                          <span>{s.phone}</span>
                        </div>
                      </div>
                    );
                  })}
          </div>
        </div>

        {/* Right Column: Statement Details & Transaction Action */}
        <div className="lg:col-span-8 space-y-4">
          {/* Party Header Banner */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeTab === 'customers' ? selectedCustomer?.name : selectedSupplier?.name}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {activeTab === 'customers' ? selectedCustomer?.code : selectedSupplier?.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === 'customers' ? selectedCustomer?.address : selectedSupplier?.address} · Phone: {activeTab === 'customers' ? selectedCustomer?.phone : selectedSupplier?.phone}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-right mr-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {activeTab === 'customers' ? 'Outstanding Receivable' : 'Outstanding Payable'}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatBDT(activeTab === 'customers' ? selectedCustomer?.currentBalance || 0 : selectedSupplier?.currentBalance || 0)}
                </span>
              </div>

              {/* Alter Party Button */}
              <button
                type="button"
                onClick={() => {
                  setAlterParty(activeTab === 'customers' ? selectedCustomer : selectedSupplier);
                  setIsOpenAlterModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-600 shadow-xs transition-colors whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Alter (অল্টার)</span>
              </button>

              {activeTab === 'customers' ? (
                <button
                  onClick={() => setIsOpenReceiptModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                >
                  Collect Due (Receipt RV)
                </button>
              ) : (
                <button
                  onClick={() => setIsOpenPaymentModal(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                >
                  Make Payment (PV)
                </button>
              )}
            </div>
          </div>

          {/* Statement Table */}
          <div id="party-ledger-statement-area" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Transaction Statement & Running Balance Ledger
              </span>
              <button
                onClick={() =>
                  printElementContent(
                    'party-ledger-statement-area',
                    `${(activeTab === 'customers' ? selectedCustomer?.name : selectedSupplier?.name) || 'Party'} - Statement of Account`,
                    currentCompany.name
                  )
                }
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-semibold p-1 px-2.5 rounded bg-slate-100 dark:bg-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Ledger (Isolated)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Ref / Voucher</th>
                    <th className="py-2.5 px-4">Transaction Details</th>
                    <th className="py-2.5 px-4 text-right">Debit (Dr ৳)</th>
                    <th className="py-2.5 px-4 text-right">Credit (Cr ৳)</th>
                    <th className="py-2.5 px-4 text-right">Running Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(activeTab === 'customers' ? customerLedgerRows : supplierLedgerRows).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {row.date === 'Opening' ? 'Opening' : formatDateBD(row.date)}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {row.refNo}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{row.type}:</span> {row.description}
                      </td>
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
      </div>

      {/* MONEY RECEIPT COLLECTION MODAL */}
      {isOpenReceiptModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Collect Customer Money Receipt
              </h3>
              <button onClick={() => setIsOpenReceiptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {txError && (
              <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {txError}
              </div>
            )}

            <form onSubmit={handleSaveReceipt} className="space-y-3 pt-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs">
                <p className="text-slate-500">Customer: <strong className="text-slate-900 dark:text-white">{selectedCustomer.name}</strong></p>
                <p className="text-slate-500">Total Outstanding Due: <strong className="text-rose-600">{formatBDT(selectedCustomer.currentBalance)}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Amount (৳) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={txAmount === 0 ? '' : txAmount}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  placeholder={selectedCustomer.currentBalance.toString()}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Method
                  </label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Deposit / Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Money Receipt / Cheque #
                  </label>
                  <input
                    type="text"
                    value={txRefNo}
                    onChange={(e) => setTxRefNo(e.target.value)}
                    placeholder="e.g. MR-5012"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Narration
                </label>
                <input
                  type="text"
                  value={txNarration}
                  onChange={(e) => setTxNarration(e.target.value)}
                  placeholder="e.g. Received partial recovery against invoice due"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenReceiptModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Post Money Receipt (RV)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER PAYMENT MODAL */}
      {isOpenPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Disburse Supplier Payment
              </h3>
              <button onClick={() => setIsOpenPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {txError && (
              <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {txError}
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-3 pt-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs">
                <p className="text-slate-500">Supplier: <strong className="text-slate-900 dark:text-white">{selectedSupplier.name}</strong></p>
                <p className="text-slate-500">Total Payable Balance: <strong className="text-amber-600">{formatBDT(selectedSupplier.currentBalance)}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (৳) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={txAmount === 0 ? '' : txAmount}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  placeholder={selectedSupplier.currentBalance.toString()}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disbursement Method
                  </label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="bank">Bank Cheque / Online</option>
                    <option value="cash">Cash in Hand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cheque / Ref No
                  </label>
                  <input
                    type="text"
                    value={txRefNo}
                    onChange={(e) => setTxRefNo(e.target.value)}
                    placeholder="e.g. CHQ-99120"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Narration
                </label>
                <input
                  type="text"
                  value={txNarration}
                  onChange={(e) => setTxNarration(e.target.value)}
                  placeholder="e.g. Payment towards Walton monthly billing"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Post Payment Voucher (PV)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PARTY MODAL */}
      {isOpenAddPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Register New {activeTab === 'customers' ? 'Customer' : 'Supplier'}
              </h3>
              <button onClick={() => setIsOpenAddPartyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewParty} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Name / Business Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Dhaka Prime Traders Ltd"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={partyPhone}
                    onChange={(e) => setPartyPhone(e.target.value)}
                    placeholder="+880 1711-..."
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={partyEmail}
                    onChange={(e) => setPartyEmail(e.target.value)}
                    placeholder="account@..."
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  placeholder="Commercial location, Dhaka"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Opening Balance (৳)
                </label>
                <input
                  type="number"
                  value={partyOpeningBal === 0 ? '' : partyOpeningBal}
                  onChange={(e) => setPartyOpeningBal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenAddPartyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Save Party Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alter Party Modal */}
      <PartyAlterModal
        isOpen={isOpenAlterModal}
        partyType={activeTab === 'customers' ? 'customer' : 'supplier'}
        party={alterParty}
        onClose={() => {
          setIsOpenAlterModal(false);
          setAlterParty(null);
        }}
        onUpdate={(data) => {
          if (activeTab === 'customers' && alterParty) {
            updateCustomer(alterParty.id, data);
          } else if (alterParty) {
            updateSupplier(alterParty.id, data);
          }
        }}
        onDelete={(id) => {
          if (activeTab === 'customers') {
            const res = deleteCustomer(id);
            if (res.success) {
              const remaining = customers.filter((c) => c.id !== id);
              setSelectedCustomerId(remaining[0]?.id || '');
            }
            return res;
          } else {
            const res = deleteSupplier(id);
            if (res.success) {
              const remaining = suppliers.filter((s) => s.id !== id);
              setSelectedSupplierId(remaining[0]?.id || '');
            }
            return res;
          }
        }}
      />
    </div>
  );
};
