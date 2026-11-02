import React, { useState } from 'react';
import {
  Building2,
  X,
  Coins,
  Landmark,
  Banknote,
  ShieldCheck,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileCheck2,
  Lock,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { translations } from '../../utils/i18n';

interface RegisterCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated?: (companyId: string, companyName: string) => void;
}

export const RegisterCompanyModal: React.FC<RegisterCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated,
}) => {
  const { registerCompany, currentUser, language, setActiveTab } = useERP();
  const isBn = language === 'bn';

  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [tin, setTin] = useState('');

  // Liquid funds
  const [openingCash, setOpeningCash] = useState<number | ''>('');
  const [openingBank, setOpeningBank] = useState<number | ''>('');
  const [bankName, setBankName] = useState('Standard Chartered Bank');
  const [bankAccountNo, setBankAccountNo] = useState('');

  // Administrator details (defaults to current logged in user)
  const [adminName, setAdminName] = useState(currentUser?.name || 'Administrator');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'admin@company.com');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '');

  const CURRENCY_OPTIONS = [
    { code: 'BDT', symbol: '৳', name: isBn ? 'বাংলাদেশী টাকা (BDT ৳)' : 'Bangladeshi Taka (BDT ৳)' },
    { code: 'USD', symbol: '$', name: isBn ? 'ইউএস ডলার (USD $)' : 'US Dollar (USD $)' },
    { code: 'EUR', symbol: '€', name: isBn ? 'ইউরো (EUR €)' : 'Euro (EUR €)' },
    { code: 'GBP', symbol: '£', name: isBn ? 'ব্রিটিশ পাউন্ড (GBP £)' : 'British Pound (GBP £)' },
    { code: 'SAR', symbol: '﷼', name: isBn ? 'সৌদি রিয়াল (SAR ﷼)' : 'Saudi Riyal (SAR ﷼)' },
    { code: 'AED', symbol: 'د.إ', name: isBn ? 'ইউএই দিরহাম (AED د.إ)' : 'UAE Dirham (AED د.إ)' },
    { code: 'INR', symbol: '₹', name: isBn ? 'ভারতীয় রুপি (INR ₹)' : 'Indian Rupee (INR ₹)' },
  ];

  if (!isOpen) return null;

  const handleCurrencyChange = (code: string) => {
    setBaseCurrency(code);
    const found = CURRENCY_OPTIONS.find((c) => c.code === code);
    if (found) setCurrencySymbol(found.symbol);
  };

  const handleAutoFillCode = (name: string) => {
    setCompanyName(name);
    if (!companyCode) {
      const generated = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      setCompanyCode(generated || 'CO');
    }
  };

  const handleDirectLaunch = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!companyName.trim()) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে কোম্পানির নাম প্রদান করুন।' : 'Please enter the Company Name.');
      setStep(1);
      return;
    }

    const res = registerCompany({
      companyName: companyName.trim(),
      code: companyCode.trim() || companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CMP',
      tradeLicense: tradeLicense.trim(),
      tin: tin.trim(),
      address: companyAddress.trim() || (isBn ? 'ঢাকা, বাংলাদেশ' : 'Dhaka, Bangladesh'),
      phone: companyPhone.trim() || currentUser?.phone || '+880 1700-000000',
      email: companyEmail.trim() || currentUser?.email || 'admin@company.bd',
      baseCurrency,
      currencySymbol,
      adminName: currentUser?.name || 'Administrator',
      adminEmail: currentUser?.email || 'admin@company.bd',
      adminPhone: currentUser?.phone || '',
      adminPassword: currentUser?.password || 'admin123',
      openingCash: 0,
      openingBank: 0,
      bankName: bankName.trim(),
      bankAccountNo: bankAccountNo.trim(),
    });

    if (res.success && res.company) {
      if (onCompanyCreated) {
        onCompanyCreated(res.company.id, res.company.name);
      }
      setActiveTab('dashboard');
      onClose();
    } else {
      setErrorMsg(res.error || (isBn ? 'কোম্পানি তৈরিতে ত্রুটি হয়েছে।' : 'Failed to register company.'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!companyName.trim()) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে কোম্পানির নাম প্রদান করুন।' : 'Please enter the Company Name.');
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    const cashAmt = openingCash === '' ? 0 : Number(openingCash);
    const bankAmt = openingBank === '' ? 0 : Number(openingBank);

    const res = registerCompany({
      companyName: companyName.trim(),
      code: companyCode.trim() || companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CMP',
      tradeLicense: tradeLicense.trim(),
      tin: tin.trim(),
      address: companyAddress.trim() || (isBn ? 'ঢাকা, বাংলাদেশ' : 'Dhaka, Bangladesh'),
      phone: companyPhone.trim() || currentUser?.phone || '+880 1700-000000',
      email: companyEmail.trim() || currentUser?.email || 'admin@company.bd',
      baseCurrency,
      currencySymbol,
      adminName: adminName.trim() || currentUser?.name || 'Administrator',
      adminEmail: adminEmail.trim() || currentUser?.email || 'admin@company.bd',
      adminPhone: adminPhone.trim() || currentUser?.phone || '',
      adminPassword: currentUser?.password || 'admin123',
      openingCash: cashAmt,
      openingBank: bankAmt,
      bankName: bankName.trim(),
      bankAccountNo: bankAccountNo.trim(),
    });

    if (res.success && res.company) {
      if (onCompanyCreated) {
        onCompanyCreated(res.company.id, res.company.name);
      }
      setActiveTab('dashboard');
      setIsSubmitting(false);
      onClose();
    } else {
      setErrorMsg(res.error || (isBn ? 'কোম্পানি তৈরিতে ত্রুটি হয়েছে।' : 'Failed to register company.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50 to-white dark:from-slate-900 dark:to-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-950/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isBn ? 'নতুন কোম্পানি নিবন্ধন ও ওপেন' : 'Register New Company Tenant'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Step {step} of 2
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'নতুন কোম্পানির জন্য স্বয়ংক্রিয় চার্ট অফ একাউন্টস, প্রধান গুদাম ও ওপেনিং তহবিল তৈরি হবে'
                  : 'Automated double-entry chart of accounts, central godown & opening liquid capital'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs Indicator */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              step === 1
                ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 text-[11px] flex items-center justify-center font-bold">
              1
            </span>
            <span>{isBn ? '১. প্রতিষ্ঠানের তথ্য' : '1. Company Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!companyName.trim()) {
                setErrorMsg(isBn ? 'কোম্পানির নাম লিখুন।' : 'Please enter company name first.');
                return;
              }
              setErrorMsg(null);
              setStep(2);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              step === 2
                ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-[11px] flex items-center justify-center font-bold">
              2
            </span>
            <span>{isBn ? '২. প্রারম্ভিক তহবিল ও ব্যাংক' : '2. Liquid Funds & Banking'}</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="m-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {step === 1 ? (
            /* STEP 1: COMPANY PROFILE */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'কোম্পানির অফিসিয়াল নাম' : 'Company / Business Legal Name'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={companyName}
                  onChange={(e) => handleAutoFillCode(e.target.value)}
                  placeholder={isBn ? 'যেমন: মেঘনা ট্রেডিং কর্পোরেশন' : 'e.g. Meghna Trading Corporation Ltd.'}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-slate-900 dark:text-white font-medium outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'কোম্পানি কোড / প্রিফিক্স' : 'Company Code / Prefix'}
                  </label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MTC"
                    maxLength={6}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white font-mono uppercase outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'মূল লেনদেন কারেন্সি' : 'Base Operating Currency'}
                  </label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white outline-hidden cursor-pointer"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code} className="dark:bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'মোবাইল / হেল্পলাইন' : 'Helpline / Phone'}
                  </label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+880 1700-112233"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'ব্যবসার ইমেইল' : 'Business Email'}
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="info@yourcompany.bd"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'বাণিজ্যিক প্রধান কার্যালয়ের ঠিকানা' : 'Head Office Commercial Address'}
                </label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder={isBn ? 'দিলকুশা বাণিজ্যিক এলাকা, মতিঝিল, ঢাকা' : 'e.g. 42 Motijheel C/A, Dhaka-1000'}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'ট্রেড লাইসেন্স নং (ঐচ্ছিক)' : 'Trade License No (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={tradeLicense}
                    onChange={(e) => setTradeLicense(e.target.value)}
                    placeholder="TRAD/2026/0129"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'TIN / ই-টিন নং (ঐচ্ছিক)' : 'Taxpayer TIN No (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="8392019481"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white font-mono outline-hidden"
                  />
                </div>
              </div>

              {/* Admin Link Badge */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center justify-between text-xs border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">
                    {isBn ? 'কোম্পানি অ্যাডমিন দায়িত্বে:' : 'Assigned Administrator:'}{' '}
                    <strong className="text-slate-900 dark:text-white">{currentUser?.name || 'Mahmudur Rahman'}</strong> ({currentUser?.email || 'info.rahman1@gmail.com'})
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Full Access
                </span>
              </div>
            </div>
          ) : (
            /* STEP 2: LIQUID FUNDS & BANKING */
            <div className="space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                  <Banknote className="w-4 h-4 text-rose-600" />
                  <span>{isBn ? 'কোম্পানির নগদ ও ব্যাংক তহবিল নির্ধারণ' : 'Liquid Funds Initialization (Cash & Bank)'}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  {isBn
                    ? 'এখানে উল্লেখিত প্রারম্ভিক নগদ ও ব্যাংক ব্যালেন্স সরাসরি আপনার ফান্ড ফ্লো চার্ট, ক্যাশ বুক ও ওনার্স ইকুইটিতে অন্তর্ভুক্ত হবে। (চাইলে ০ রেখে পরেও তহবিল যোগ করতে পারেন)।'
                    : 'Opening cash and bank balances entered here are automatically booked into your Flow Chart, Cash Drawer, Bank Ledger, and Opening Capital Voucher.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Cash in hand opening */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Coins className="w-4 h-4" />
                    <span>{isBn ? 'প্রারম্ভিক নগদ তহবিল (ক্যাশ)' : 'Opening Cash in Hand'}</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      {isBn ? `ভল্ট/ড্রয়ারে নগদ অর্থ (${currencySymbol})` : `Amount in Vault / Cash Drawer (${currencySymbol})`}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 50000"
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-lg text-slate-900 dark:text-white font-mono outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Bank opening */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                    <Landmark className="w-4 h-4" />
                    <span>{isBn ? 'ব্যাংক অ্যাকাউন্টে স্থিতি' : 'Opening Bank Account'}</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      {isBn ? `প্রাথমিক ব্যালেন্স (${currencySymbol})` : `Opening Balance (${currencySymbol})`}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={openingBank}
                        onChange={(e) => setOpeningBank(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 200000"
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg text-slate-900 dark:text-white font-mono outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'প্রাথমিক ব্যাংকের নাম' : 'Primary Operating Bank Name'}
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Standard Chartered Bank / Islami Bank"
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'ব্যাংক হিসাব নম্বর / IBAN' : 'Bank Account No / IBAN'}
                    </label>
                    <input
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="e.g. 01-928374-01"
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl text-slate-900 dark:text-white font-mono outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  {isBn ? 'মোট প্রারম্ভিক তরল তহবিল (ক্যাপিটাল):' : 'Total Registered Opening Liquid Capital:'}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {currencySymbol}{' '}
                  {((openingCash === '' ? 0 : Number(openingCash)) +
                    (openingBank === '' ? 0 : Number(openingBank))).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            {step === 1 ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isBn ? 'পূর্ববর্তী' : 'Back to Profile'}</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={handleDirectLaunch}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer"
                  title="Direct Launch: Open company immediately without extra steps"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isBn ? 'সরাসরি ওপেন করুন' : 'Launch Directly'}</span>
                </button>
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!companyName.trim()) {
                      setErrorMsg(isBn ? 'অনুগ্রহ করে কোম্পানির নাম প্রদান করুন।' : 'Please enter the Company Name.');
                      return;
                    }
                    setErrorMsg(null);
                    setStep(2);
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/20 cursor-pointer"
                >
                  <span>{isBn ? 'পরবর্তী: তহবিল সেটআপ' : 'Next: Funds & Banking'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isBn ? 'কোম্পানি তৈরি ও ওপেন করুন' : 'Register & Open Company Workspace'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
