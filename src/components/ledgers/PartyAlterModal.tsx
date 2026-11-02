import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Customer, Supplier } from '../../types/erp';
import { formatBDT } from '../../utils/i18n';

interface PartyAlterModalProps {
  partyType: 'customer' | 'supplier';
  party: Customer | Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedData: any) => void;
  onDelete: (id: string) => boolean | { success: boolean; error?: string };
}

export const PartyAlterModal: React.FC<PartyAlterModalProps> = ({
  partyType,
  party,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const isCustomer = partyType === 'customer';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);
  const [category, setCategory] = useState<'Retail' | 'Wholesale' | 'Corporate'>('Retail');
  const [openingBalance, setOpeningBalance] = useState(0);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (party) {
      setName(party.name || '');
      setPhone(party.phone || '');
      setEmail(party.email || '');
      setAddress(party.address || '');
      setOpeningBalance(party.openingBalance || 0);
      if (isCustomer) {
        const cust = party as Customer;
        setCreditLimit(cust.creditLimit || 0);
        setCategory(cust.category || 'Retail');
      }
      setConfirmDelete(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [party, isCustomer, isOpen]);

  if (!isOpen || !party) return null;

  const currentBalance = party.currentBalance || 0;
  const hasOutstandingBalance = Math.abs(currentBalance) > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        openingBalance: Number(openingBalance) || 0,
      };

      if (isCustomer) {
        payload.creditLimit = Number(creditLimit) || 0;
        payload.category = category;
      }

      onUpdate(payload);
      setSuccessMsg(`${isCustomer ? 'Customer' : 'Supplier'} details updated successfully!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update party details');
    }
  };

  const handleDelete = () => {
    setError(null);
    const result = onDelete(party.id);
    if (typeof result === 'object' && !result.success) {
      setError(result.error || 'Cannot delete party with active transactions or balance');
      return;
    }
    if (result === false) {
      setError('Cannot delete party with active balance or transactions');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isCustomer ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600' : 'bg-teal-100 dark:bg-teal-950/50 text-teal-600'}`}>
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Alter {isCustomer ? 'Customer (কাস্টমার অল্টার)' : 'Supplier (সরবরাহকারী অল্টার)'}</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Code: {party.code} · ID: {party.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isCustomer ? 'Customer Name (কাস্টমার নাম)' : 'Supplier / Vendor Name (সরবরাহকারী নাম)'} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (মোবাইল নম্বর)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Address / Location (ঠিকানা)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Road, Area, District"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Customer specifics: Category & Credit Limit */}
            {isCustomer && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="Retail">Retail (খুচরা)</option>
                    <option value="Wholesale">Wholesale (পাইকারি)</option>
                    <option value="Corporate">Corporate (প্রাতিষ্ঠানিক)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Limit (বাকির সর্বোচ্চ সীমা)
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={0}
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Opening Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Opening Balance (প্রারম্ভিক জের)
              </label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Current Balance Display */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Balance (বর্তমান ব্যালেন্স)
              </label>
              <div className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatBDT(currentBalance)}
              </div>
            </div>
          </div>

          {/* Delete Danger Section */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            {!confirmDelete ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Danger zone: Remove this {isCustomer ? 'customer' : 'supplier'}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete {isCustomer ? 'Customer' : 'Supplier'}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                    Are you sure you want to permanently delete "{party.name}"?
                    {hasOutstandingBalance && (
                      <span className="block font-normal text-rose-700 dark:text-rose-300 mt-0.5">
                        Warning: This party has an outstanding balance of {formatBDT(currentBalance)}. Parties with active balance cannot be deleted.
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1 text-xs font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700 transition"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes (পরিবর্তন সংরক্ষণ)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
