import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Filter,
  Search,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  X,
  PlusCircle,
  Trash2,
  ExternalLink,
  Mail,
  SlidersHorizontal,
  ShoppingBag,
  Package,
  Layers,
  ArrowRight,
  Warehouse,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Voucher, VoucherTypeCode, VoucherEntry, Product, Sale } from '../../types/erp';
import { DEFAULT_VOUCHER_TYPES, getVoucherTypeStyle } from '../../utils/voucherConfig';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { validateJournalBalance } from '../../services/accountingEngine';
import { VoucherPrintSettingsModal } from './VoucherPrintSettingsModal';
import { VoucherEmailModal } from './VoucherEmailModal';
import { VoucherAlterModal } from './VoucherAlterModal';
import { printIsolatedDocument } from '../../utils/printEngine';
import { StandardInvoiceReportView } from '../common/StandardInvoiceReportView';
import { amountToWordsBDT } from '../../utils/numberToWords';

export const VoucherHub: React.FC<{
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}> = ({ isOpenCreateModal, onCloseCreateModal, onOpenCreateModal }) => {
  const {
    language,
    currentCompany,
    currentBranchId,
    vouchers,
    accounts,
    customers,
    suppliers,
    products,
    sales,
    godowns,
    createVoucher,
    reverseVoucher,
    createSale,
    recordOrderReceipt,
    getGodownStock,
    currentUser,
  } = useERP();

  const t = translations[language];
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);
  const [printingVoucher, setPrintingVoucher] = useState<Voucher | null>(null);
  const [emailingVoucher, setEmailingVoucher] = useState<Voucher | null>(null);
  const [reversingVoucherId, setReversingVoucherId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [alteringVoucher, setAlteringVoucher] = useState<Voucher | null>(null);
  const [viewingLayout, setViewingLayout] = useState<'standard_report' | 'journal'>('standard_report');

  // Receipt Voucher Modes: 'payment' | 'order_receipt'
  const [receiptMode, setReceiptMode] = useState<'payment' | 'order_receipt'>('payment');
  const [orderVoucherQuery, setOrderVoucherQuery] = useState('');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [orderReceiptAmount, setOrderReceiptAmount] = useState<number | ''>('');
  const [orderReceiptMethod, setOrderReceiptMethod] = useState<'cash' | 'bank' | 'bkash' | 'nagad'>('cash');
  const [orderReceiptAccountId, setOrderReceiptAccountId] = useState('');
  const [orderReceiptRefNo, setOrderReceiptRefNo] = useState('');
  const [orderReceiptNarration, setOrderReceiptNarration] = useState('');
  const [orderReceiptMsg, setOrderReceiptMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sales Voucher Product Entry State
  const [salesVoucherMode, setSalesVoucherMode] = useState<'inventory_items' | 'journal'>('inventory_items');
  const [salesProductLines, setSalesProductLines] = useState<
    Array<{
      id: string;
      productId: string;
      productName: string;
      productCode: string;
      uom: string;
      quantity: number;
      unitPrice: number;
      total: number;
      godownId: string;
      godownName: string;
    }>
  >([]);
  const [selectedProdForLine, setSelectedProdForLine] = useState('');
  const [prodLineQty, setProdLineQty] = useState<number>(1);
  const [prodLinePrice, setProdLinePrice] = useState<number | ''>('');
  const [prodLineGodown, setProdLineGodown] = useState('');
  const [salesVoucherCustomerId, setSalesVoucherCustomerId] = useState(customers[0]?.id || '');
  const [salesVoucherDiscount, setSalesVoucherDiscount] = useState<number>(0);
  const [salesVoucherPaidAmount, setSalesVoucherPaidAmount] = useState<number | ''>('');
  const [salesVoucherPaymentMethod, setSalesVoucherPaymentMethod] = useState<'cash' | 'bank' | 'bkash' | 'nagad'>('cash');

  // New Voucher Form State
  const [formType, setFormType] = useState<VoucherTypeCode>('payment');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNarration, setFormNarration] = useState('');
  const [formRefNo, setFormRefNo] = useState('');
  const [formPartyType, setFormPartyType] = useState<'customer' | 'supplier' | 'none'>('none');
  const [formPartyId, setFormPartyId] = useState('');
  const [formEntries, setFormEntries] = useState<VoucherEntry[]>([
    { id: '1', accountId: accounts[0]?.id || '', accountName: accounts[0]?.name || '', debit: 0, credit: 0, description: '' },
    { id: '2', accountId: accounts[1]?.id || '', accountName: accounts[1]?.name || '', debit: 0, credit: 0, description: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Computations for Sales Voucher Items
  const salesItemsSubtotal = useMemo(() => {
    return salesProductLines.reduce((sum, item) => sum + item.total, 0);
  }, [salesProductLines]);

  const salesItemsVat = useMemo(() => {
    const vatRate = currentCompany.settings?.defaultVatPercent || 5;
    const taxable = Math.max(0, salesItemsSubtotal - (Number(salesVoucherDiscount) || 0));
    return Number(((taxable * vatRate) / 100).toFixed(2));
  }, [salesItemsSubtotal, salesVoucherDiscount, currentCompany.settings]);

  const salesItemsGrandTotal = useMemo(() => {
    return Math.max(0, salesItemsSubtotal - (Number(salesVoucherDiscount) || 0) + salesItemsVat);
  }, [salesItemsSubtotal, salesVoucherDiscount, salesItemsVat]);

  // Live Double-Entry Balancing check
  const balanceCheck = useMemo(() => {
    return validateJournalBalance(formEntries);
  }, [formEntries]);

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (selectedTypeFilter !== 'all' && v.type !== selectedTypeFilter) return false;
      if (currentBranchId !== 'all' && v.branchId !== currentBranchId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = v.voucherNo.toLowerCase().includes(q);
        const matchesNarration = v.narration.toLowerCase().includes(q);
        const matchesParty = v.partyName?.toLowerCase().includes(q);
        const matchesRef = v.refNo?.toLowerCase().includes(q);
        if (!matchesNo && !matchesNarration && !matchesParty && !matchesRef) return false;
      }
      return true;
    });
  }, [vouchers, selectedTypeFilter, currentBranchId, searchQuery]);

  // Add line to journal entry
  const handleAddLine = () => {
    const newEntry: VoucherEntry = {
      id: `ve_${Date.now()}_${formEntries.length + 1}`,
      accountId: accounts[0]?.id || '',
      accountName: accounts[0]?.name || '',
      debit: 0,
      credit: 0,
      description: '',
    };
    setFormEntries([...formEntries, newEntry]);
  };

  const handleRemoveLine = (idx: number) => {
    if (formEntries.length <= 2) return;
    setFormEntries(formEntries.filter((_, i) => i !== idx));
  };

  const handleEntryChange = (index: number, field: keyof VoucherEntry, value: any) => {
    const updated = [...formEntries];
    if (field === 'accountId') {
      const acc = accounts.find((a) => a.id === value);
      updated[index] = {
        ...updated[index],
        accountId: value,
        accountName: acc ? acc.name : '',
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setFormEntries(updated);
  };

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formNarration.trim()) {
      setFormError('Please enter a narration/purpose for this voucher.');
      return;
    }

    if (!balanceCheck.isValid) {
      setFormError(
        `Journal entry does not balance! Total Debit: ৳${balanceCheck.totalDebit}, Total Credit: ৳${balanceCheck.totalCredit}. Discrepancy: ৳${balanceCheck.difference}`
      );
      return;
    }

    const party = formPartyType === 'customer'
      ? customers.find((c) => c.id === formPartyId)
      : formPartyType === 'supplier'
      ? suppliers.find((s) => s.id === formPartyId)
      : undefined;

    const res = createVoucher({
      type: formType,
      date: formDate,
      entries: formEntries,
      narration: formNarration,
      refNo: formRefNo,
      partyType: formPartyType,
      partyId: formPartyId || undefined,
      partyName: party?.name,
    });

    if (res.success) {
      onCloseCreateModal();
      // Reset form
      setFormNarration('');
      setFormRefNo('');
      setFormPartyType('none');
      setFormEntries([
        { id: '1', accountId: accounts[0]?.id || '', accountName: accounts[0]?.name || '', debit: 0, credit: 0 },
        { id: '2', accountId: accounts[1]?.id || '', accountName: accounts[1]?.name || '', debit: 0, credit: 0 },
      ]);
    } else {
      setFormError(res.error || 'Failed to post voucher');
    }
  };

  // Add Item Line to Sales Voucher
  const handleAddSalesProductLine = () => {
    if (!selectedProdForLine) return;
    const prod = products.find((p) => p.id === selectedProdForLine);
    if (!prod) return;

    const qty = Number(prodLineQty) > 0 ? Number(prodLineQty) : 1;
    const price = prodLinePrice !== '' ? Number(prodLinePrice) : prod.salesPrice;
    const gdn = godowns.find((g) => g.id === prodLineGodown) || godowns[0];

    const newLine = {
      id: `spl_${Date.now()}_${salesProductLines.length + 1}`,
      productId: prod.id,
      productName: prod.name,
      productCode: prod.code,
      uom: prod.uom,
      quantity: qty,
      unitPrice: price,
      total: Number((qty * price).toFixed(2)),
      godownId: gdn?.id || '',
      godownName: gdn?.name || 'Central Godown',
    };

    setSalesProductLines([...salesProductLines, newLine]);
    setSelectedProdForLine('');
    setProdLineQty(1);
    setProdLinePrice('');
  };

  const handleRemoveSalesProductLine = (lineId: string) => {
    setSalesProductLines(salesProductLines.filter((l) => l.id !== lineId));
  };

  // Submit Itemized Sales Voucher
  const handleSubmitItemizedSalesVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (salesProductLines.length === 0) {
      setFormError('Please add at least one product item to the sales voucher.');
      return;
    }

    const cust = customers.find((c) => c.id === salesVoucherCustomerId) || customers[0];
    const paid = salesVoucherPaidAmount !== '' ? Number(salesVoucherPaidAmount) : salesItemsGrandTotal;

    const selectedGodownObj = godowns.find((g) => g.id === prodLineGodown);
    const res = createSale({
      customerId: cust?.id || 'cust_1',
      customerName: cust?.name || 'Customer',
      customerPhone: cust?.phone || '',
      godownId: salesProductLines[0]?.godownId || prodLineGodown,
      godownName: salesProductLines[0]?.godownName || selectedGodownObj?.name || 'Main Central Godown',
      items: salesProductLines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        productCode: l.productCode,
        uom: l.uom,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
        godownId: l.godownId || prodLineGodown,
        godownName: l.godownName || selectedGodownObj?.name,
      })),
      discount: Number(salesVoucherDiscount) || 0,
      paidAmount: paid,
      paymentMethod: salesVoucherPaymentMethod,
      date: formDate,
    });

    if (res.success) {
      setSalesProductLines([]);
      setFormNarration('');
      onCloseCreateModal();
    } else {
      setFormError(res.error || 'Failed to post sales voucher');
    }
  };

  // Submit Order Receipt Voucher (By Voucher/Invoice No Wise)
  const handleSubmitOrderReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderReceiptMsg(null);

    if (!selectedSaleForReceipt) {
      setOrderReceiptMsg({ type: 'error', text: 'Please select an order / sales invoice voucher.' });
      return;
    }

    const amount = Number(orderReceiptAmount);
    if (!amount || amount <= 0) {
      setOrderReceiptMsg({ type: 'error', text: 'Please enter a valid receipt collection amount greater than 0.' });
      return;
    }

    const res = recordOrderReceipt(
      selectedSaleForReceipt.id,
      amount,
      orderReceiptMethod,
      orderReceiptRefNo || selectedSaleForReceipt.invoiceNo,
      orderReceiptNarration || `Payment received against Order/Invoice #${selectedSaleForReceipt.invoiceNo}`,
      orderReceiptAccountId || undefined
    );

    if (res.success) {
      setOrderReceiptMsg({
        type: 'success',
        text: `Order receipt of ৳${amount.toLocaleString()} posted successfully against ${selectedSaleForReceipt.invoiceNo}!`,
      });
      setTimeout(() => {
        setSelectedSaleForReceipt(null);
        setOrderReceiptAmount('');
        setOrderReceiptRefNo('');
        setOrderReceiptNarration('');
        setOrderReceiptMsg(null);
        onCloseCreateModal();
      }, 1000);
    } else {
      setOrderReceiptMsg({ type: 'error', text: res.error || 'Failed to post order receipt' });
    }
  };

  const handleConfirmReversal = () => {
    if (!reversingVoucherId || !reversalReason.trim()) return;
    reverseVoucher(reversingVoucherId, reversalReason);
    setReversingVoucherId(null);
    setReversalReason('');
  };

  return (
    <div className="space-y-6">
      {/* Module Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.vouchers}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Double-entry balanced vouchers with distinctive 10-type color coding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Voucher</span>
          </button>
        </div>
      </div>

      {/* 10 Voucher Color Badges Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
        <button
          onClick={() => setSelectedTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            selectedTypeFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          All Types ({vouchers.length})
        </button>

        {(Object.keys(DEFAULT_VOUCHER_TYPES) as VoucherTypeCode[]).map((typeCode) => {
          const cfg = getVoucherTypeStyle(typeCode, currentCompany.settings?.voucherColors);
          const count = vouchers.filter((v) => v.type === typeCode).length;
          const isSelected = selectedTypeFilter === typeCode;

          return (
            <button
              key={typeCode}
              onClick={() => setSelectedTypeFilter(typeCode)}
              style={{
                borderColor: isSelected ? cfg.colorHex : undefined,
                backgroundColor: isSelected ? cfg.bgHex : undefined,
                color: isSelected ? cfg.textHex : undefined,
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'shadow-xs border-2'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.colorHex }} />
              <span>{cfg.prefix} - {cfg.nameEn.replace(' Voucher', '')}</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/5 dark:bg-white/10 ml-0.5">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by voucher #, narration, party..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong className="text-slate-800 dark:text-slate-200">{filteredVouchers.length}</strong> vouchers
        </div>
      </div>

      {/* Voucher Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Narration</th>
                <th className="py-2.5 px-4">Party</th>
                <th className="py-2.5 px-4">Entries Count</th>
                <th className="py-2.5 px-4 text-right">Debit (৳)</th>
                <th className="py-2.5 px-4 text-right">Credit (৳)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No vouchers found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const style = getVoucherTypeStyle(v.type, currentCompany.settings?.voucherColors);
                  const isCancelled = v.status === 'cancelled';

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors ${
                        isCancelled ? 'opacity-50 line-through' : ''
                      }`}
                    >
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
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.colorHex }} />
                          {style.nameEn}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {formatDateBD(v.date)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 max-w-xs truncate" title={v.narration}>
                        {v.narration}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {v.partyName ? (
                          <span className="font-medium text-slate-800 dark:text-slate-200">{v.partyName}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">
                        {v.entries.length} accounts
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatBDT(v.totalDebit)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatBDT(v.totalCredit)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase ${
                            v.status === 'posted'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingVoucher(v)}
                            title="View Voucher Document"
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPrintingVoucher(v)}
                            title="Printer Settings & Paper Size (Isolated Print)"
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEmailingVoucher(v)}
                            title="Email Voucher (Dispatch to Party / Audit)"
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAlteringVoucher(v)}
                            title="Alter / Edit Voucher (ভাউচার অল্টার ও ডাবল-এন্ট্রি সংশোধন)"
                            className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {v.status === 'posted' && (
                            <button
                              onClick={() => setReversingVoucherId(v.id)}
                              title="Reverse Voucher (Creates offsetting entry)"
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* CREATE NEW VOUCHER MODAL */}
      {isOpenCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Double-Entry Voucher
                </h2>
              </div>
              <button
                onClick={onCloseCreateModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Top Row: Type, Date, Ref No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as VoucherTypeCode)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  >
                    {(Object.keys(DEFAULT_VOUCHER_TYPES) as VoucherTypeCode[]).map((tCode) => (
                      <option key={tCode} value={tCode}>
                        {DEFAULT_VOUCHER_TYPES[tCode].nameEn} ({DEFAULT_VOUCHER_TYPES[tCode].prefix})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Cheque No
                  </label>
                  <input
                    type="text"
                    value={formRefNo}
                    onChange={(e) => setFormRefNo(e.target.value)}
                    placeholder="e.g. CHQ-82910 or MR-104"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* SPECIAL MODE SWITCHERS FOR RECEIPT & SALES VOUCHERS */}
              {formType === 'receipt' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      Receipt Voucher Operation Mode (রিসিট ভাউচার ধরণ):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReceiptMode('payment')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          receiptMode === 'payment'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        1. পেমেন্ট Receipt (General Party / Account)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptMode('order_receipt')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          receiptMode === 'order_receipt'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        2. অর্ডার Receipt by voucher number wise
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formType === 'sales' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      Sales Voucher Mode (সেলস ভাউচারে পণ্য যোগ ও স্টক ডেলিভারি):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSalesVoucherMode('inventory_items')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          salesVoucherMode === 'inventory_items'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        পণ্য তালিকা ভিত্তিক সেলস ভাউচার (Itemized Products)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesVoucherMode('journal')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          salesVoucherMode === 'journal'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        ম্যানুয়াল লেজার জার্নাল (Manual Account Entries)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OPTION A: ORDER RECEIPT BY VOUCHER NUMBER WISE */}
              {formType === 'receipt' && receiptMode === 'order_receipt' ? (
                <div className="space-y-4 pt-2">
                  {orderReceiptMsg && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                        orderReceiptMsg.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {orderReceiptMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{orderReceiptMsg.text}</span>
                    </div>
                  )}

                  {/* Order / Voucher Selector */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Select Sales Voucher / Invoice No (অর্ডার / সেলস ভাউচার নির্বাচন করুন):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <select
                          value={selectedSaleForReceipt?.id || ''}
                          onChange={(e) => {
                            const found = sales.find((s) => s.id === e.target.value) || null;
                            setSelectedSaleForReceipt(found);
                            if (found) {
                              setOrderReceiptAmount(found.dueAmount > 0 ? found.dueAmount : found.grandTotal);
                              setOrderReceiptNarration(
                                `Payment receipt against order #${found.invoiceNo} from ${found.customerName}`
                              );
                            }
                          }}
                          className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                        >
                          <option value="">-- Choose Sales Voucher / Invoice --</option>
                          {sales.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.invoiceNo} · {s.customerName} · Due: ৳{s.dueAmount.toLocaleString()} (Total: ৳{s.grandTotal.toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={orderVoucherQuery}
                          onChange={(e) => {
                            setOrderVoucherQuery(e.target.value);
                            const q = e.target.value.toLowerCase().trim();
                            if (q) {
                              const match = sales.find(
                                (s) =>
                                  s.invoiceNo.toLowerCase().includes(q) ||
                                  (s.voucherId && s.voucherId.toLowerCase().includes(q))
                              );
                              if (match) {
                                setSelectedSaleForReceipt(match);
                                setOrderReceiptAmount(match.dueAmount > 0 ? match.dueAmount : match.grandTotal);
                              }
                            }
                          }}
                          placeholder="Or type voucher no (e.g. SLS-2026-00001 / INV-2026-001)..."
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Selected Order Summary Card */}
                    {selectedSaleForReceipt && (
                      <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Voucher / Invoice No</p>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{selectedSaleForReceipt.invoiceNo}</p>
                            <p className="text-[10px] text-slate-400">{formatDateBD(selectedSaleForReceipt.date)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Customer (পার্টি)</p>
                            <p className="font-bold text-slate-900 dark:text-white">{selectedSaleForReceipt.customerName}</p>
                            <p className="text-[10px] text-slate-400">{selectedSaleForReceipt.customerPhone || 'Direct Client'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Bill Total / Paid</p>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">৳{selectedSaleForReceipt.grandTotal.toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-600 font-mono">Paid: ৳{selectedSaleForReceipt.paidAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/60">
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Current Due (বকেয়া)</p>
                            <p className="font-mono text-base font-extrabold text-rose-600 dark:text-rose-400">
                              ৳{selectedSaleForReceipt.dueAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Dispatch Godown Visibility */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                            <Warehouse className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>ডেলিভারি গোডাউন (Dispatched From):</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/40">
                              {selectedSaleForReceipt.godownName || 'Main Central Godown'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {selectedSaleForReceipt.items.map((it, idx) => (
                              <span key={idx} className="mr-2 inline-block">
                                • {it.productName} ({it.quantity} {it.uom})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Tender Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Receipt Amount (আদায়কৃত টাকা) <span className="text-rose-600">*</span>
                        </label>
                        {selectedSaleForReceipt && selectedSaleForReceipt.dueAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => setOrderReceiptAmount(selectedSaleForReceipt.dueAmount)}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            Full Due (৳{selectedSaleForReceipt.dueAmount.toLocaleString()})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={orderReceiptAmount}
                        onChange={(e) => setOrderReceiptAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0.00"
                        required
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Deposit To Account (জমা হিসাব)
                      </label>
                      <select
                        value={orderReceiptAccountId}
                        onChange={(e) => setOrderReceiptAccountId(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        {accounts
                          .filter((a) => a.subType === 'cash' || a.subType === 'bank')
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.code}) · ৳{acc.currentBalance.toLocaleString()}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Mode (পদ্ধতি)
                      </label>
                      <select
                        value={orderReceiptMethod}
                        onChange={(e) => setOrderReceiptMethod(e.target.value as any)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white uppercase font-bold"
                      >
                        <option value="cash">Cash in Hand (নগদ)</option>
                        <option value="bank">Bank Transfer / Cheque (ব্যাংক)</option>
                        <option value="bkash">bKash Merchant</option>
                        <option value="nagad">Nagad Enterprise</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Narration / Remarks (বিবরণ)
                    </label>
                    <input
                      type="text"
                      value={orderReceiptNarration}
                      onChange={(e) => setOrderReceiptNarration(e.target.value)}
                      placeholder="e.g. Cleared bill for Order SLS-2026-00001 via bKash"
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={onCloseCreateModal}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitOrderReceipt}
                      disabled={!selectedSaleForReceipt || !orderReceiptAmount}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      Post Order Receipt by Voucher No
                    </button>
                  </div>
                </div>
              ) : formType === 'sales' && salesVoucherMode === 'inventory_items' ? (
                /* OPTION B: ITEMIZED PRODUCTS SALES VOUCHER WITH INVENTORY & GODOWNS */
                <div className="space-y-4 pt-2">
                  {/* Customer Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Customer (গ্রাহক / পার্টি) <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={salesVoucherCustomerId}
                        onChange={(e) => setSalesVoucherCustomerId(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.currentBalance > 0 ? `(Due: ৳${c.currentBalance.toLocaleString()})` : ''} · {c.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Dispatch Godown / Warehouse (পণ্য কোন গুদাম থেকে যাবে)</span>
                        <span className="text-rose-600 font-bold">*</span>
                      </label>
                      <select
                        value={prodLineGodown}
                        onChange={(e) => setProdLineGodown(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        {godowns.map((g) => {
                          const stockInGdn = selectedProdForLine ? getGodownStock(selectedProdForLine, g.id) : null;
                          return (
                            <option key={g.id} value={g.id}>
                              {g.parentId ? '↳ Sub-Godown: ' : 'Main Godown: '} {g.name} ({g.code})
                              {stockInGdn !== null ? ` [মজুত: ${stockInGdn}]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Product Adder Box */}
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-600" />
                        Add Products to Sales Voucher (সেলস ভাউচারে পণ্য সংযোজন):
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Select Product (পণ্য নির্বাচন করুন)
                        </label>
                        <select
                          value={selectedProdForLine}
                          onChange={(e) => {
                            setSelectedProdForLine(e.target.value);
                            const p = products.find((prod) => prod.id === e.target.value);
                            if (p) setProdLinePrice(p.salesPrice);
                          }}
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">-- Choose Product / Merchandise --</option>
                          {products.map((p) => {
                            const stockInGdn = getGodownStock(p.id, prodLineGodown);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) · ৳{p.salesPrice.toLocaleString()} · [গোডাউনে মজুত: {stockInGdn} {p.uom}]
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Quantity (পরিমাণ)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={prodLineQty}
                          onChange={(e) => setProdLineQty(parseFloat(e.target.value) || 1)}
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-center font-bold"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Unit Rate ৳ (দর)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={prodLinePrice}
                          onChange={(e) => setProdLinePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="Price"
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-right font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={handleAddSalesProductLine}
                          disabled={!selectedProdForLine}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Godown Stock Status Bar */}
                    {selectedProdForLine && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Warehouse className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            ডেলিভারি গোডাউন:{' '}
                            <strong>{godowns.find((g) => g.id === prodLineGodown)?.name || 'Central Godown'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                              getGodownStock(selectedProdForLine, prodLineGodown) >= prodLineQty
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            ওই গোডাউনে বর্তমান মজুত: {getGodownStock(selectedProdForLine, prodLineGodown)}{' '}
                            {products.find((p) => p.id === selectedProdForLine)?.uom || 'pcs'}
                            {getGodownStock(selectedProdForLine, prodLineGodown) < prodLineQty && ' (⚠️ পর্যাপ্ত স্টক নেই!)'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Added Items Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3">Product Name</th>
                          <th className="py-2 px-3">Godown</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Total (৳)</th>
                          <th className="py-2 px-3 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {salesProductLines.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                              No products added to this Sales Voucher yet. Select product above and click "Add Item".
                            </td>
                          </tr>
                        ) : (
                          salesProductLines.map((line) => (
                            <tr key={line.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70">
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                                {line.productName}
                                <span className="ml-1 text-[10px] text-slate-400 font-mono">({line.productCode})</span>
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px] font-mono">
                                {line.godownName}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {line.quantity} {line.uom}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                ৳{line.unitPrice.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                ৳{line.total.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSalesProductLine(line.id)}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & Payment Tender for Sales Voucher */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal (আইটেম মোট):</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">৳{salesItemsSubtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Discount (ছাড় ৳):</span>
                      <input
                        type="number"
                        min="0"
                        value={salesVoucherDiscount === 0 ? '' : salesVoucherDiscount}
                        onChange={(e) => setSalesVoucherDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-28 text-right text-xs p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono"
                      />
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>VAT ({currentCompany.settings?.defaultVatPercent || 5}%):</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">৳{salesItemsVat.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                      <span>Grand Total (সর্বমোট বিল):</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums text-base">
                        ৳{salesItemsGrandTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Paid Tendered (পরিশোধিত টাকা)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={salesVoucherPaidAmount}
                          onChange={(e) => setSalesVoucherPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder={salesItemsGrandTotal.toString()}
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Payment Method (পেমেন্ট মাধ্যম)
                        </label>
                        <select
                          value={salesVoucherPaymentMethod}
                          onChange={(e) => setSalesVoucherPaymentMethod(e.target.value as any)}
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold uppercase"
                        >
                          <option value="cash">Cash (নগদ)</option>
                          <option value="bank">Bank (ব্যাংক)</option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={onCloseCreateModal}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitItemizedSalesVoucher}
                      disabled={salesProductLines.length === 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      Post Sales Voucher with Inventory
                    </button>
                  </div>
                </div>
              ) : (
                /* OPTION C: STANDARD DOUBLE-ENTRY JOURNAL LINES (For Payment, Contra, Journal, etc.) */
                <>
                  {/* Party Selection (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Party Type
                      </label>
                      <select
                        value={formPartyType}
                        onChange={(e) => {
                          const val = e.target.value as 'customer' | 'supplier' | 'none';
                          setFormPartyType(val);
                          setFormPartyId('');
                        }}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="none">None (General Accounting Entry)</option>
                        <option value="customer">Customer (Receivables / Dues)</option>
                        <option value="supplier">Supplier (Payables / Vendors)</option>
                      </select>
                    </div>

                    {formPartyType !== 'none' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Select {formPartyType === 'customer' ? 'Customer' : 'Supplier'}
                        </label>
                        <select
                          value={formPartyId}
                          onChange={(e) => setFormPartyId(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">-- Select Party --</option>
                          {formPartyType === 'customer'
                            ? customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (Due: ৳{c.currentBalance.toLocaleString()})
                                </option>
                              ))
                            : suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Payable: ৳{s.currentBalance.toLocaleString()})
                                </option>
                              ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Journal Entry Lines Table */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Double-Entry Account Breakdown (Total Debit = Total Credit)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2 px-3">Account Head</th>
                            <th className="py-2 px-3">Description / Sub-narration</th>
                            <th className="py-2 px-3 text-right w-32">Debit (Dr ৳)</th>
                            <th className="py-2 px-3 text-right w-32">Credit (Cr ৳)</th>
                            <th className="py-2 px-3 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {formEntries.map((entry, idx) => (
                            <tr key={entry.id}>
                              <td className="p-2">
                                <select
                                  value={entry.accountId}
                                  onChange={(e) => handleEntryChange(idx, 'accountId', e.target.value)}
                                  className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                                >
                                  {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.name} ({acc.type.toUpperCase()})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={entry.description || ''}
                                  onChange={(e) => handleEntryChange(idx, 'description', e.target.value)}
                                  placeholder="Line memo"
                                  className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={entry.debit === 0 ? '' : entry.debit}
                                  onChange={(e) => handleEntryChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full text-xs p-1.5 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={entry.credit === 0 ? '' : entry.credit}
                                  onChange={(e) => handleEntryChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full text-xs p-1.5 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                />
                              </td>
                              <td className="p-2 text-center">
                                {formEntries.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(idx)}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-700">
                          <tr>
                            <td colSpan={2} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                              Total Entry Amount:
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white tabular-nums">
                              ৳ {balanceCheck.totalDebit.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white tabular-nums">
                              ৳ {balanceCheck.totalCredit.toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Live Balance Status Indicator */}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      {balanceCheck.isValid ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          Journal is perfectly balanced (Total Dr = Total Cr)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                          <AlertCircle className="w-4 h-4" />
                          Unbalanced: Difference of ৳ {balanceCheck.difference.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Master Narration */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Narration / Purpose <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formNarration}
                      onChange={(e) => setFormNarration(e.target.value)}
                      placeholder="Explain the detailed purpose, invoice reference, or reason for this entry..."
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={onCloseCreateModal}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!balanceCheck.isValid}
                      className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all ${
                        balanceCheck.isValid ? 'bg-rose-600 hover:bg-rose-700 shadow-xs' : 'bg-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Post Voucher (Audit Secured)
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE VOUCHER PREVIEW MODAL */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Voucher Document
                </span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setViewingLayout('standard_report')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      viewingLayout === 'standard_report'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Standard Report
                  </button>
                  <button
                    onClick={() => setViewingLayout('journal')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      viewingLayout === 'journal'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Accounting Journal
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEmailingVoucher(viewingVoucher)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Email Voucher"
                >
                  <Mail className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Email Voucher</span>
                </button>
                <button
                  onClick={() => {
                    const v = viewingVoucher;
                    setViewingVoucher(null);
                    setPrintingVoucher(v);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Open Print Studio with Live Paper Preview"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Studio</span>
                </button>
                <button
                  onClick={() => setViewingVoucher(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 py-3">
              {viewingLayout === 'standard_report' ? (
                (() => {
                  const matchingSale = sales.find(
                    (s) => s.invoiceNo === viewingVoucher.refNo || s.invoiceNo === viewingVoucher.voucherNo
                  );
                  const items = matchingSale
                    ? matchingSale.items.map((it, idx) => ({
                        sl: idx + 1,
                        description: it.productName,
                        qty: it.quantity,
                        uom: it.uom,
                        unitPrice: it.unitPrice,
                        amount: it.total,
                      }))
                    : viewingVoucher.entries
                        .filter((e) => e.debit > 0 || e.credit > 0)
                        .map((e, idx) => ({
                          sl: idx + 1,
                          description: `${e.accountName}${e.description ? ` - ${e.description}` : ''}`,
                          qty: 1,
                          unitPrice: Math.max(e.debit, e.credit),
                          amount: Math.max(e.debit, e.credit),
                        }));

                  const voucherStyle = getVoucherTypeStyle(viewingVoucher.type, currentCompany.settings?.voucherColors);
                  const total = viewingVoucher.totalDebit || viewingVoucher.totalCredit;

                  return (
                    <StandardInvoiceReportView
                      companyName={currentCompany.name}
                      companyAddress={currentCompany.address}
                      companyPhone={currentCompany.phone}
                      voucherTitle={
                        viewingVoucher.type === 'sales'
                          ? 'SALES VOUCHER'
                          : `${voucherStyle.nameEn.toUpperCase()}`
                      }
                      voucherNo={viewingVoucher.voucherNo}
                      date={formatDateBD(viewingVoucher.date)}
                      partyName={viewingVoucher.partyName || 'Cash Party'}
                      refNo={viewingVoucher.refNo || 'N/A'}
                      items={items}
                      totalAmount={total}
                      inWords={amountToWordsBDT(total)}
                      preparedBy="Prepared By"
                      checkedBy="Checked By / Accountant"
                      authorizedBy="Authorized Director"
                      showActions={true}
                    />
                  );
                })()
              ) : (
                /* Classic Journal Voucher Paper */
                <div className="pt-2 space-y-4 print:p-0">
                  <div className="text-center border-b pb-3 border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      {currentCompany.name}
                    </h2>
                    <p className="text-xs text-slate-500">{currentCompany.address}</p>
                    <p className="text-xs text-slate-500">Phone: {currentCompany.phone} · TIN: {currentCompany.tin}</p>

                    <div className="mt-3 inline-block">
                      {(() => {
                        const style = getVoucherTypeStyle(viewingVoucher.type, currentCompany.settings?.voucherColors);
                        return (
                          <div
                            style={{
                              backgroundColor: style.bgHex,
                              color: style.textHex,
                              borderColor: style.borderHex,
                            }}
                            className="px-4 py-1 rounded-md border text-sm font-bold uppercase tracking-wider"
                          >
                            {style.nameEn} ({style.nameBn})
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-xs gap-2 py-1">
                    <div>
                      <p><span className="text-slate-400">Voucher No:</span> <strong className="font-mono text-slate-900 dark:text-white">{viewingVoucher.voucherNo}</strong></p>
                      <p><span className="text-slate-400">Date:</span> <strong className="font-mono text-slate-900 dark:text-white">{formatDateBD(viewingVoucher.date)}</strong></p>
                      {viewingVoucher.partyName && (
                        <p><span className="text-slate-400">Party:</span> <strong className="text-slate-900 dark:text-white">{viewingVoucher.partyName}</strong></p>
                      )}
                    </div>
                    <div className="text-right">
                      <p><span className="text-slate-400">Ref / Cheque No:</span> <strong className="font-mono">{viewingVoucher.refNo || 'N/A'}</strong></p>
                      <p><span className="text-slate-400">Created By:</span> <span>{viewingVoucher.createdBy}</span></p>
                      <p><span className="text-slate-400">Posting Status:</span> <span className="font-bold uppercase text-emerald-600">{viewingVoucher.status}</span></p>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3">Account Title</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Debit (Dr)</th>
                          <th className="py-2 px-3 text-right">Credit (Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {viewingVoucher.entries.map((e) => (
                          <tr key={e.id}>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{e.accountName}</td>
                            <td className="py-2 px-3 text-slate-500">{e.description || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{e.debit > 0 ? formatBDT(e.debit) : '-'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{e.credit > 0 ? formatBDT(e.credit) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                        <tr>
                          <td colSpan={2} className="py-2 px-3 text-right">Total:</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-900 dark:text-white">{formatBDT(viewingVoucher.totalDebit)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-900 dark:text-white">{formatBDT(viewingVoucher.totalCredit)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Narration: </span>
                    <span className="text-slate-600 dark:text-slate-400">{viewingVoucher.narration}</span>
                  </div>

                  <div className="grid grid-cols-3 pt-8 text-center text-xs text-slate-500">
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1 mx-2">Prepared By</div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1 mx-2">Checked By / Accountant</div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1 mx-2">Authorized Signatory</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVERSAL CONFIRMATION DIALOG */}
      {reversingVoucherId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Reverse Posted Voucher
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Per strict accounting audit standards, posted vouchers cannot be deleted. An authorized offsetting journal entry will be created.
            </p>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Reversal <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Duplicate entry posted / Incorrect account head selected..."
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setReversingVoucherId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReversal}
                disabled={!reversalReason.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER PRINTER SETTINGS MODAL */}
      {printingVoucher && (
        <VoucherPrintSettingsModal
          voucher={printingVoucher}
          company={currentCompany}
          isOpen={!!printingVoucher}
          onClose={() => setPrintingVoucher(null)}
        />
      )}

      {/* VOUCHER EMAIL MODAL (All 10 Voucher Types) */}
      {emailingVoucher && (
        <VoucherEmailModal
          voucher={emailingVoucher}
          company={currentCompany}
          isOpen={!!emailingVoucher}
          onClose={() => setEmailingVoucher(null)}
        />
      )}

      {/* VOUCHER ALTER / EDIT MODAL */}
      {alteringVoucher && (
        <VoucherAlterModal
          voucher={alteringVoucher}
          isOpen={!!alteringVoucher}
          onClose={() => setAlteringVoucher(null)}
        />
      )}
    </div>
  );
};
