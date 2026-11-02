import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Banknote,
  Landmark,
  Coins,
  FileCheck,
  Check,
  RotateCcw,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginScreen: React.FC = () => {
  const { login, registerCompany, resetUserPassword, users } = useERP();
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('info.rahman1@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password form state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [matchedUser, setMatchedUser] = useState<any | null>(null);
  const [securityCode, setSecurityCode] = useState('');
  const [enteredSecurityCode, setEnteredSecurityCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Register company form state
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [tin, setTin] = useState('');

  // Admin credentials (pre-filled with valid defaults so user can launch directly without re-typing)
  const [adminName, setAdminName] = useState('Mahmudur Rahman');
  const [adminEmail, setAdminEmail] = useState('info.rahman1@gmail.com');
  const [adminPhone, setAdminPhone] = useState('+880 1711-998877');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Initial Liquid Funds (Bank & Cash)
  const [openingCash, setOpeningCash] = useState<number | ''>('');
  const [openingBank, setOpeningBank] = useState<number | ''>('');
  const [bankName, setBankName] = useState('Standard Chartered Bank');
  const [bankAccountNo, setBankAccountNo] = useState('');

  // Currency options
  const CURRENCY_OPTIONS = [
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (BDT ৳)' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD $)' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR €)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP £)' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal (SAR ﷼)' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED د.إ)' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR ₹)' },
  ];

  const handleCurrencyChange = (code: string) => {
    setBaseCurrency(code);
    const found = CURRENCY_OPTIONS.find((c) => c.code === code);
    if (found) setCurrencySymbol(found.symbol);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = login(identifier, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Authentication failed. Please verify credentials.');
        setIsSubmitting(false);
      }
    }, 200);
  };

  // Forgot password - Step 1: Find user
  const handleFindAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = forgotIdentifier.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.name.toLowerCase() === clean ||
        u.phone.replace(/[\s-]/g, '') === clean.replace(/[\s-]/g, '')
    );

    if (!found) {
      setErrorMsg('No user account found matching this email or username. Please check and try again.');
      return;
    }

    // Generate random 6-digit OTP security code
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    setMatchedUser(found);
    setSecurityCode(generatedCode);
    setForgotStep(2);
    setSuccessMsg(`Account verified for ${found.name}. Security code generated.`);
  };

  // Forgot password - Step 2: Reset password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (enteredSecurityCode.trim() !== securityCode) {
      setErrorMsg('Invalid security verification code. Please check the 6-digit code.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters in length.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match. Please re-enter.');
      return;
    }

    const res = resetUserPassword(matchedUser.email, newPassword);
    if (res.success) {
      setSuccessMsg('Password has been successfully updated! You can now log in.');
      setIdentifier(matchedUser.email);
      setPassword(newPassword);
      setTimeout(() => {
        setAuthMode('login');
        setForgotStep(1);
        setMatchedUser(null);
        setSecurityCode('');
        setEnteredSecurityCode('');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Password reset failed.');
    }
  };

  // Direct Launch helper: Launches company immediately with default/custom credentials
  const handleDirectLaunch = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const name = companyName.trim();
    if (!name) {
      setErrorMsg('Please enter your Company Name to launch.');
      setRegStep(1);
      return;
    }

    setIsSubmitting(true);

    const effectiveName = adminName.trim() || 'Mahmudur Rahman';
    const effectiveEmail = (adminEmail.trim() || 'info.rahman1@gmail.com').toLowerCase();
    const effectivePass = adminPassword && adminPassword.length >= 4 ? adminPassword : 'admin123';
    const cleanCode = companyCode.trim() || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CMP';

    try {
      const res = registerCompany({
        companyName: name,
        code: cleanCode,
        tradeLicense: tradeLicense.trim(),
        tin: tin.trim(),
        address: companyAddress.trim() || 'Central Business Hub, Dhaka',
        phone: companyPhone.trim() || '+880 1711-998877',
        email: companyEmail.trim() || effectiveEmail,
        baseCurrency,
        currencySymbol,
        adminName: effectiveName,
        adminEmail: effectiveEmail,
        adminPhone: adminPhone.trim() || '',
        adminPassword: effectivePass,
        openingCash: openingCash === '' ? 0 : Number(openingCash),
        openingBank: openingBank === '' ? 0 : Number(openingBank),
        bankName: bankName.trim(),
        bankAccountNo: bankAccountNo.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to initialize company workspace.');
        setIsSubmitting(false);
      } else {
        setSuccessMsg(`Workspace opened for "${name}"! Launching ERP...`);
      }
    } catch (err) {
      console.error('Launch failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch ERP workspace.');
      setIsSubmitting(false);
    }
  };

  // Register Company standard form submission
  const handleRegisterCompany = (e: React.FormEvent) => {
    e.preventDefault();
    handleDirectLaunch();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-y-auto font-sans py-8">
      {/* Decorative backdrop glow elements */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className={`w-full z-10 space-y-6 transition-all duration-300 ${authMode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Brand Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 shadow-xl shadow-rose-950/40 p-2 mb-1 border border-rose-400/30">
            <img
              src="/src/assets/images/erp_company_logo_1792554853520.jpg"
              alt="Apex ERP"
              className="w-full h-full object-contain filter brightness-110"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Apex ERP Suite
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              v2.5
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise Multi-Tenant Accounting, Funds Flow & Multi-Company Resource Planning
          </p>
        </div>

        {/* Primary Container Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Top Mode Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                authMode === 'login'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                authMode === 'register'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Register New Company</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Credentials Verification
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Double-Entry Encrypted</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. name@company.com or username"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white placeholder-slate-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setForgotStep(1);
                      setForgotIdentifier(identifier);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter system password"
                    className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white placeholder-slate-500 outline-hidden font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-hidden"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Verify Credentials & Enter ERP</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Need a new organization?</span>
                  <span className="text-rose-400 font-bold underline underline-offset-2">Register Company</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: FORGOT PASSWORD */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Reset Account Password</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleFindAccount} className="space-y-3.5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter your registered work email address or username. We will verify your account and provide a security verification code to reset your password.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Work Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. info.rahman1@gmail.com"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white placeholder-slate-500 outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Find & Verify Account</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {matchedUser && (
                    <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-semibold">
                        <span>Account Holder:</span>
                        <span className="text-white font-bold">{matchedUser.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Assigned Role:</span>
                        <span className="text-rose-300 font-medium">{matchedUser.role}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-amber-300">Security Verification Code:</span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono font-bold text-xs tracking-widest">
                          {securityCode}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Enter 6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setEnteredSecurityCode(securityCode)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={enteredSecurityCode}
                      onChange={(e) => setEnteredSecurityCode(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full text-xs px-3 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-white font-mono text-center tracking-widest outline-hidden transition-all"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 4 characters"
                        className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white font-mono outline-hidden transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white font-mono outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save New Password & Continue</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* VIEW 3: REGISTER NEW COMPANY */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterCompany} className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-rose-500" />
                    New Enterprise Registration
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Creates complete isolated chart of accounts, godown & initial fund balances
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      regStep === 1 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">Step {regStep} of 2</span>
                </div>
              </div>

              {regStep === 1 ? (
                /* Step 1: Enterprise Information & Administrator */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Company / Business Legal Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (!companyCode) {
                            setCompanyCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase());
                          }
                        }}
                        placeholder="e.g. Apex Global Logistics Ltd."
                        className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Company Code / Short Prefix
                      </label>
                      <input
                        type="text"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                        placeholder="e.g. AGL"
                        maxLength={6}
                        className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white font-mono uppercase outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Base Operating Currency
                      </label>
                      <select
                        value={baseCurrency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl text-white outline-hidden cursor-pointer"
                      >
                        {CURRENCY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code} className="bg-slate-900">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Company Phone Number
                      </label>
                      <input
                        type="text"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+880 1700-112233"
                        className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Head Office Address
                      </label>
                      <input
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="e.g. Motijheel, Dhaka-1000"
                        className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Administrator Credentials Section */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 mb-2.5">
                      <User className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Primary System Administrator Credentials
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Admin Full Name
                        </label>
                        <input
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="e.g. Mahmudur Rahman"
                          className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Admin Work Email (Login ID)
                        </label>
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@yourcompany.com"
                          className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Master Password
                        </label>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? 'text' : 'password'}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Default: admin123"
                            className="w-full text-xs px-3 pr-8 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white font-mono outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Confirm Password
                        </label>
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          placeholder="Default: admin123"
                          className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white font-mono outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Already have an account? Sign in
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDirectLaunch}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Direct Launch: Initialize company and open dashboard immediately"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Direct Launch</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!companyName.trim()) {
                            setErrorMsg('Please specify the company name.');
                            return;
                          }
                          if (!adminName.trim() || !adminEmail.trim()) {
                            setErrorMsg('Administrator name and email are required.');
                            return;
                          }
                          const cleanEmail = adminEmail.trim().toLowerCase();
                          const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
                          if (!existing) {
                            if (!adminPassword || adminPassword.length < 4) {
                              setErrorMsg('Master password must be at least 4 characters.');
                              return;
                            }
                            if (adminPassword !== confirmAdminPassword) {
                              setErrorMsg('Passwords do not match.');
                              return;
                            }
                          }
                          setErrorMsg(null);
                          setRegStep(2);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-rose-950/50"
                      >
                        <span>Next: Funds & Banking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Initial Liquid Funds & Banking Setup */
                <div className="space-y-4">
                  <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                      <Banknote className="w-4 h-4 text-rose-400" />
                      <span>Liquid Funds Initialization (Cash & Bank)</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Enter opening funds for this company. These will be automatically reflected in your <strong>Flow Chart</strong>, Cash Book, Bank Ledger, and Opening Capital. (You can also leave at 0 and fund later).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Cash in hand opening */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <Coins className="w-4 h-4" />
                        <span>Opening Cash in Hand</span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Amount in Vault / Main Drawer ({currencySymbol})
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
                            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-white font-mono outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Primary Bank opening */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                        <Landmark className="w-4 h-4" />
                        <span>Opening Bank Account</span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Opening Balance ({currencySymbol})
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
                            placeholder="e.g. 250000"
                            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg text-white font-mono outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Primary Bank Name
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. Standard Chartered Bank"
                          className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Bank Account Number / IBAN
                        </label>
                        <input
                          type="text"
                          value={bankAccountNo}
                          onChange={(e) => setBankAccountNo(e.target.value)}
                          placeholder="e.g. 01-928374-01"
                          className="w-full text-xs px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded-xl text-white font-mono outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary of Opening Funds */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Total Registered Liquid Capital:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {currencySymbol}{' '}
                      {((openingCash === '' ? 0 : Number(openingCash)) +
                        (openingBank === '' ? 0 : Number(openingBank))).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Profile</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Register Company & Launch ERP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Security & Multi-Company Isolation Footer Note */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Strict Company Isolation: Users cannot view or access unauthorized company data.</span>
          </p>
          <p>Protected by cryptographic session validation, automated funds flow, and double-entry accounting.</p>
        </div>
      </div>
    </div>
  );
};
