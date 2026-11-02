import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Coins,
  FileText,
} from 'lucide-react';
import { Voucher, VoucherTypeCode, VoucherEntry } from '../../types/erp';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_VOUCHER_TYPES, getVoucherTypeStyle } from '../../utils/voucherConfig';
import { formatBDT, formatDateBD } from '../../utils/i18n';
import { validateJournalBalance } from '../../services/accountingEngine';

interface VoucherAlterModalProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export const VoucherAlterModal: React.FC<VoucherAlterModalProps> = ({
  voucher,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const {
    currentCompany,
    accounts,
    customers,
    suppliers,
    updateVoucher,
    deleteVoucher,
    branches,
  } = useERP();

  // Form states
  const [formType, setFormType] = useState<VoucherTypeCode>('payment');
  const [formDate, setFormDate] = useState<string>('');
  const [formRefNo, setFormRefNo] = useState<string>('');
  const [formNarration, setFormNarration] = useState<string>('');
  const [formPartyType, setFormPartyType] = useState<'customer' | 'supplier' | 'none'>('none');
  const [formPartyId, setFormPartyId] = useState<string>('');
  const [formEntries, setFormEntries] = useState<VoucherEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteReason, setDeleteReason] = useState<string>('Altered or cancelled by administrator');

  useEffect(() => {
    if (voucher) {
      setFormType(voucher.type);
      setFormDate(voucher.date);
      setFormRefNo(voucher.refNo || '');
      setFormNarration(voucher.narration || '');
      setFormPartyType(voucher.partyType || 'none');
      setFormPartyId(voucher.partyId || '');
      setFormEntries(
        voucher.entries && voucher.entries.length > 0
          ? voucher.entries.map((e) => ({ ...e }))
          : [
              {
                id: `ve_${Date.now()}_1`,
                accountId: accounts[0]?.id || '',
                accountName: accounts[0]?.name || '',
                debit: 0,
                credit: 0,
                description: '',
              },
              {
                id: `ve_${Date.now()}_2`,
                accountId: accounts[1]?.id || '',
                accountName: accounts[1]?.name || '',
                debit: 0,
                credit: 0,
                description: '',
              },
            ]
      );
      setErrorMessage('');
      setShowDeleteConfirm(false);
    }
  }, [voucher, accounts]);

  if (!isOpen || !voucher) return null;

  const currentStyle = getVoucherTypeStyle(formType, currentCompany.settings?.voucherColors);

  // Totals & Double-entry validation
  const totalDebit = formEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
  const totalCredit = formEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
  const discrepancy = Math.abs(Number((totalDebit - totalCredit).toFixed(2)));
  const isBalanced = discrepancy < 0.01 && totalDebit > 0;

  const handleEntryChange = (
    index: number,
    field: keyof VoucherEntry,
    value: string | number
  ) => {
    setFormEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index] };

      if (field === 'accountId') {
        const found = accounts.find((a) => a.id === value);
        entry.accountId = value as string;
        entry.accountName = found ? found.name : '';
      } else if (field === 'debit' || field === 'credit') {
        const num = parseFloat(value as string) || 0;
        entry[field] = Math.max(0, num);
        // Clear opposite column to maintain strict line discipline
        if (field === 'debit' && num > 0) entry.credit = 0;
        if (field === 'credit' && num > 0) entry.debit = 0;
      } else {
        (entry as any)[field] = value;
      }

      updated[index] = entry;
      return updated;
    });
  };

  const handleAddLine = () => {
    const defaultAcc = accounts[0];
    setFormEntries((prev) => [
      ...prev,
      {
        id: `ve_alt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        accountId: defaultAcc ? defaultAcc.id : '',
        accountName: defaultAcc ? defaultAcc.name : '',
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (formEntries.length <= 2) {
      setErrorMessage('A double-entry voucher must have at least 2 account lines.');
      return;
    }
    setFormEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveAlteration = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formNarration.trim()) {
      setErrorMessage('Please enter a narration explaining this voucher.');
      return;
    }

    if (!isBalanced) {
      setErrorMessage(
        `Voucher is not balanced! Total Debit (৳${totalDebit.toLocaleString()}) must match Total Credit (৳${totalCredit.toLocaleString()}). Discrepancy: ৳${discrepancy.toLocaleString()}`
      );
      return;
    }

    let partyName: string | undefined;
    if (formPartyType === 'customer') {
      partyName = customers.find((c) => c.id === formPartyId)?.name;
    } else if (formPartyType === 'supplier') {
      partyName = suppliers.find((s) => s.id === formPartyId)?.name;
    }

    setIsSubmitting(true);
    const result = updateVoucher(voucher.id, {
      type: formType,
      date: formDate,
      refNo: formRefNo.trim(),
      narration: formNarration.trim(),
      partyType: formPartyType,
      partyId: formPartyId || undefined,
      partyName,
      entries: formEntries,
      totalDebit,
      totalCredit,
    });

    setIsSubmitting(false);

    if (result.success) {
      if (onSaved) onSaved();
      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to alter voucher.');
    }
  };

  const handleDeleteExecute = () => {
    setIsSubmitting(true);
    const res = deleteVoucher(voucher.id, deleteReason);
    setIsSubmitting(false);

    if (res.success) {
      if (onDeleted) onDeleted();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to delete voucher.');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: currentStyle.bgHex,
                borderColor: currentStyle.borderHex,
                color: currentStyle.textHex,
              }}
              className="p-2.5 rounded-xl border flex items-center justify-center"
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Alter Voucher (ভাউচার পরিবর্তন ও সংশোধন)
                </h2>
                <span
                  style={{
                    backgroundColor: currentStyle.bgHex,
                    color: currentStyle.textHex,
                    borderColor: currentStyle.borderHex,
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-bold uppercase border"
                >
                  {currentStyle.nameEn}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  #{voucher.voucherNo}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Modify voucher accounts, amounts, narration, or delete permanently with automatic double-entry balance recalibration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900 rounded-xl transition-all flex items-center gap-1.5"
              title="Delete or Void Voucher"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAlteration} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Voucher Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Voucher Type (ধরণ)
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as VoucherTypeCode)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              >
                {Object.values(DEFAULT_VOUCHER_TYPES).map((vt) => (
                  <option key={vt.code} value={vt.code}>
                    {vt.nameEn} ({vt.nameBn})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Posting Date (তারিখ)
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Ref / Cheque No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ref / Cheque No (রেফারেন্স)
              </label>
              <input
                type="text"
                value={formRefNo}
                onChange={(e) => setFormRefNo(e.target.value)}
                placeholder="e.g. CHQ-9901 or INV-440"
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Party Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Party Type & Link
              </label>
              <div className="flex gap-1.5">
                <select
                  value={formPartyType}
                  onChange={(e) => {
                    const next = e.target.value as 'customer' | 'supplier' | 'none';
                    setFormPartyType(next);
                    setFormPartyId('');
                  }}
                  className="w-1/2 text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="none">Direct</option>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                </select>

                {formPartyType !== 'none' && (
                  <select
                    value={formPartyId}
                    onChange={(e) => setFormPartyId(e.target.value)}
                    className="w-1/2 text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Pick --</option>
                    {formPartyType === 'customer'
                      ? customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      : suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Journal Entries Table (Double Entry Lines) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Double-Entry Account Breakdown (Debit = Credit)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  · Alter line accounts, amounts, or sub-narration
                </span>
              </label>

              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Account Line</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Account Head (খতিয়ান শিরোনাম)</th>
                    <th className="py-2.5 px-3">Sub-Narration / Memo</th>
                    <th className="py-2.5 px-3 text-right w-36">Debit (Dr ৳)</th>
                    <th className="py-2.5 px-3 text-right w-36">Credit (Cr ৳)</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {formEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-2">
                        <select
                          value={entry.accountId}
                          onChange={(e) => handleEntryChange(idx, 'accountId', e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
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
                          placeholder="Line description / reference"
                          className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.debit || ''}
                          onChange={(e) => handleEntryChange(idx, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-xs p-2 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.credit || ''}
                          onChange={(e) => handleEntryChange(idx, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-xs p-2 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={formEntries.length <= 2}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                          title="Remove Row"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700 text-xs">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      Total Balanced Sum:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                      {formatBDT(totalDebit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                      {formatBDT(totalCredit)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Live Balance Status Bar */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                isBalanced
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">
                  {isBalanced
                    ? 'Double-Entry Balanced: Total Debit equals Total Credit.'
                    : `Double-Entry Discrepancy: Difference of ${formatBDT(discrepancy)}. Total Debit must equal Total Credit.`}
                </span>
              </div>
              <div className="font-mono font-bold text-[11px]">
                Dr: {formatBDT(totalDebit)} | Cr: {formatBDT(totalCredit)}
              </div>
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              General Voucher Narration (বিবরণ / ব্যাখ্যা)
            </label>
            <textarea
              required
              rows={2}
              value={formNarration}
              onChange={(e) => setFormNarration(e.target.value)}
              placeholder="Explain the purpose, transaction context, or party invoice of this altered voucher..."
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Voucher No: <strong className="font-mono text-slate-800 dark:text-slate-200">{voucher.voucherNo}</strong> · Created by: {voucher.createdBy}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isBalanced || isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Alterations...' : 'Save Alterations (সংশোধন সংরক্ষণ)'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* DELETE CONFIRMATION MODAL OVERLAY */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Confirm Permanent Voucher Deletion
                  </h3>
                  <p className="text-xs text-slate-500">
                    This action will remove Voucher #{voucher.voucherNo} and reverse all affected account balances.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <p>
                  <span className="text-slate-400">Voucher Type: </span>
                  <strong className="uppercase">{voucher.type}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Amount to Reverse: </span>
                  <strong className="font-mono text-rose-600 dark:text-rose-400">
                    {formatBDT(voucher.totalDebit)}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-400">Date: </span>
                  <strong className="font-mono">{formatDateBD(voucher.date)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Deletion (Audit Trail Record)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicated voucher / Voided by management"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteExecute}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Deleting...' : 'Confirm & Delete Voucher'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
