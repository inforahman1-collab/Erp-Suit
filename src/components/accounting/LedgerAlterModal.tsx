import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Building,
  Layers,
  Coins,
  ShieldAlert,
  Edit3,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { Account, AccountType, AccountSubType } from '../../types/erp';
import { useERP } from '../../context/ERPContext';
import { formatBDT } from '../../utils/i18n';

interface LedgerAlterModalProps {
  account: Account | null; // null means creating a new ledger
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, { en: string; bn: string; color: string }> = {
  asset: { en: 'Asset', bn: 'সম্পদ', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800' },
  liability: { en: 'Liability', bn: 'দায়', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' },
  equity: { en: 'Equity', bn: 'মালিকানাস্বত্ব', color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800' },
  revenue: { en: 'Revenue / Income', bn: 'আয় / রাজস্ব', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' },
  expense: { en: 'Expense', bn: 'ব্যয় / খরচ', color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800' },
};

const SUBTYPE_OPTIONS: Record<AccountType, { value: AccountSubType; label: string }[]> = {
  asset: [
    { value: 'cash', label: 'Cash in Hand (নগদ টাকা)' },
    { value: 'bank', label: 'Bank Account (ব্যাংক হিসাব)' },
    { value: 'receivable', label: 'Accounts Receivable / Sundry Debtors (দেনাদার)' },
    { value: 'inventory', label: 'Stock & Inventory (মজুদ পণ্য)' },
    { value: 'fixed_asset', label: 'Fixed Assets / Property (স্থায়ী সম্পদ)' },
  ],
  liability: [
    { value: 'payable', label: 'Accounts Payable / Sundry Creditors (পাওনাদার)' },
    { value: 'tax_payable', label: 'VAT / Tax Payable (ভ্যাট ও কর দেয়)' },
  ],
  equity: [
    { value: 'equity_capital', label: 'Owners Capital & Reserves (মূলধন ও তহবিল)' },
  ],
  revenue: [
    { value: 'sales_revenue', label: 'Sales Revenue (বিক্রয় আয়)' },
    { value: 'other_income', label: 'Other Operating Income (অন্যান্য আয়)' },
  ],
  expense: [
    { value: 'cost_of_sales', label: 'Cost of Goods Sold - COGS (বিক্রীত পণ্যের ব্যয়)' },
    { value: 'operating_expense', label: 'Operating / Admin Expense (পরিচালন ও সাধারণ ব্যয়)' },
  ],
};

export const LedgerAlterModal: React.FC<LedgerAlterModalProps> = ({
  account,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const {
    currentCompany,
    accounts,
    vouchers,
    addAccount,
    updateAccount,
    deleteAccount,
  } = useERP();

  const isAlterMode = account !== null;

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [type, setType] = useState<AccountType>('asset');
  const [subType, setSubType] = useState<AccountSubType>('cash');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [currency, setCurrency] = useState('BDT');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Ledger discontinued / deleted by administrator');

  useEffect(() => {
    if (account) {
      setCode(account.code);
      setName(account.name);
      setNameBn(account.nameBn || '');
      setType(account.type);
      setSubType(account.subType);
      setOpeningBalance(account.openingBalance || 0);
      setCurrency(account.currency || 'BDT');
      setErrorMessage('');
      setShowDeleteConfirm(false);
    } else {
      // Create new ledger default
      const nextCode = (1000 + accounts.length + 1).toString();
      setCode(nextCode);
      setName('');
      setNameBn('');
      setType('expense');
      setSubType('operating_expense');
      setOpeningBalance(0);
      setCurrency(currentCompany?.settings?.currency || 'BDT');
      setErrorMessage('');
      setShowDeleteConfirm(false);
    }
  }, [account, accounts, currentCompany]);

  if (!isOpen) return null;

  // Check how many vouchers reference this ledger
  const voucherCount = account
    ? vouchers.filter((v) => v.entries.some((e) => e.accountId === account.id)).length
    : 0;

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    const availableSubtypes = SUBTYPE_OPTIONS[newType];
    if (availableSubtypes && availableSubtypes.length > 0) {
      setSubType(availableSubtypes[0].value);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!code.trim()) {
      setErrorMessage('Please enter an account / ledger code.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter a ledger title in English.');
      return;
    }

    setIsSubmitting(true);

    if (isAlterMode && account) {
      const res = updateAccount(account.id, {
        code: code.trim(),
        name: name.trim(),
        nameBn: nameBn.trim(),
        type,
        subType,
        openingBalance: Number(openingBalance) || 0,
        currency,
      });

      setIsSubmitting(false);

      if (res.success) {
        if (onSaved) onSaved();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to alter ledger.');
      }
    } else {
      // Add new ledger
      const res = addAccount({
        code: code.trim(),
        name: name.trim(),
        nameBn: nameBn.trim(),
        type,
        subType,
        openingBalance: Number(openingBalance) || 0,
        currency,
      });

      setIsSubmitting(false);

      if (res.success) {
        if (onSaved) onSaved();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to create ledger.');
      }
    }
  };

  const handleDeleteExecute = () => {
    if (!account) return;
    setIsSubmitting(true);
    const res = deleteAccount(account.id, deleteReason);
    setIsSubmitting(false);

    if (res.success) {
      if (onDeleted) onDeleted();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to delete ledger.');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              {isAlterMode ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {isAlterMode
                    ? 'Alter Ledger Head (খতিয়ান পরিবর্তন ও সংশোধন)'
                    : 'Create New Ledger Head (নতুন খতিয়ান তৈরি)'}
                </h2>
                {isAlterMode && account?.isSystem && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                    System Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isAlterMode
                  ? `Modify account head title, Bengali name, classification, or delete safely.`
                  : 'Add a new general ledger account head to the Chart of Accounts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAlterMode && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={account?.isSystem}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-600"
                title={
                  account?.isSystem
                    ? 'System standard accounts cannot be deleted'
                    : 'Delete or remove this ledger head'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ledger Usage Pill (if in alter mode) */}
          {isAlterMode && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Current Running Balance: </span>
                <strong className="font-mono text-sm text-slate-900 dark:text-white">
                  {formatBDT(account?.currentBalance || 0)}
                </strong>
              </div>
              <div className="text-right text-slate-500">
                <span>Referenced in: </span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {voucherCount} voucher(s)
                </strong>
              </div>
            </div>
          )}

          {/* Code & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ledger Code (খতিয়ান কোড) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 1010 or 2050"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency (মুদ্রা)
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="BDT"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono uppercase"
              />
            </div>
          </div>

          {/* Ledger Name English & Bengali (Rename feature) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ledger Name (খতিয়ানের নাম - English) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dutch Bangla Bank Ltd / Factory Electricity"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Renaming this account will automatically synchronize the updated title across all existing voucher line items.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bengali Title (বাংলা নাম - ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমনঃ ডাচ বাংলা ব্যাংক লিঃ / কারখানা বিদ্যুৎ খরচ"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Account Classification Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Account Classification (শ্রেণিবিভাগ)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => {
                const isSelected = type === t;
                const meta = ACCOUNT_TYPE_LABELS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${meta.color} font-bold ring-2 ring-rose-500/30`
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs block font-bold capitalize">{meta.en}</span>
                    <span className="text-[10px] opacity-80">{meta.bn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SubType Group */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ledger Sub-Group (উপ-শ্রেণি)
            </label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value as AccountSubType)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
            >
              {(SUBTYPE_OPTIONS[type] || []).map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Opening Balance (প্রারম্ভিক জের ৳)
            </label>
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Positive amount represents normal balance (Debit for Assets/Expenses, Credit for Liabilities/Equity/Income).
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : isAlterMode
                  ? 'Save Alterations (খতিয়ান পরিবর্তন সংরক্ষণ)'
                  : 'Create Ledger Head (খতিয়ান সংরক্ষণ)'}
              </span>
            </button>
          </div>
        </form>

        {/* DELETE CONFIRMATION MODAL OVERLAY */}
        {showDeleteConfirm && account && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Confirm Ledger Head Deletion
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete ledger "{account.name}" ({account.code})?
                  </p>
                </div>
              </div>

              {voucherCount > 0 ? (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Deletion Blocked: Ledger is Active in Vouchers</span>
                  </div>
                  <p>
                    This ledger is currently used in <strong>{voucherCount} voucher(s)</strong>.
                    To preserve double-entry audit compliance, please alter or reassign those vouchers first before deleting this ledger.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <p>
                    <span className="text-slate-400">Ledger Code: </span>
                    <strong className="font-mono">{account.code}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Classification: </span>
                    <strong className="uppercase">{account.type} - {account.subType}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Current Balance: </span>
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {formatBDT(account.currentBalance)}
                    </strong>
                  </p>
                </div>
              )}

              {voucherCount === 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Deletion (Audit Trail Record)
                  </label>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g. Account head merged or obsolete"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                {voucherCount === 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteExecute}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Deleting...' : 'Confirm & Delete Ledger'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
