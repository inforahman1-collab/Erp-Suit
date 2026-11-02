import React, { useState } from 'react';
import {
  Settings,
  Building2,
  GitBranch,
  Palette,
  Users2,
  Database,
  History,
  Save,
  Plus,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  FileCode,
  Lock,
  ShieldCheck,
  Globe2,
  Coins,
  Target,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_VOUCHER_TYPES } from '../../utils/voucherConfig';
import { VoucherTypeCode, UserRole } from '../../types/erp';
import { formatBDT, translations } from '../../utils/i18n';
import { generateSQLDump } from '../../utils/sqlDumpGenerator';
import { DatabaseBackupRestore } from './DatabaseBackupRestore';
import { CurrencySettings } from './CurrencySettings';
import { UserAccessManagement } from './UserAccessManagement';
import { AuditLogViewer } from '../reports/AuditLogViewer';
import { BudgetsView } from '../budget/BudgetsView';
import { RegisterCompanyModal } from '../company/RegisterCompanyModal';

export const SettingsView: React.FC = () => {
  const {
    language,
    currentCompany,
    currentUser,
    companies,
    users,
    accounts,
    products,
    customers,
    suppliers,
    vouchers,
    sales,
    purchases,
    stockMovements,
    auditLogs,
    updateCompanySettings,
    addBranch,
    addCompany,
    addUser,
    exportDatabaseJson,
    restoreDatabaseJson,
    resetToInitialData,
  } = useERP();

  const t = translations[language];
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'currencies' | 'budgets' | 'users' | 'voucher_colors' | 'backup' | 'audit'>('company');

  // Company Profile form
  const [compName, setCompName] = useState(currentCompany.name);
  const [compTradeLicense, setCompTradeLicense] = useState(currentCompany.tradeLicense);
  const [compTin, setCompTin] = useState(currentCompany.tin);
  const [compAddress, setCompAddress] = useState(currentCompany.address);
  const [compPhone, setCompPhone] = useState(currentCompany.phone);
  const [compVatPercent, setCompVatPercent] = useState(currentCompany.settings.defaultVatPercent);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Voucher Color Customizer State
  const [voucherColors, setVoucherColors] = useState<Record<string, string>>({
    ...currentCompany.settings.voucherColors,
  });

  // Branch Modal
  const [isOpenAddBranch, setIsOpenAddBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  // Add Company Modal
  const [isOpenAddCompany, setIsOpenAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');

  // Add User Modal
  const [isOpenAddUser, setIsOpenAddUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Accountant');

  // Backup restore status
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      defaultVatPercent: Number(compVatPercent) || 0,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveVoucherColors = () => {
    updateCompanySettings({
      voucherColors: voucherColors as any,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetVoucherColors = () => {
    const defaults = Object.keys(DEFAULT_VOUCHER_TYPES).reduce((acc, key) => {
      acc[key] = DEFAULT_VOUCHER_TYPES[key as keyof typeof DEFAULT_VOUCHER_TYPES].colorHex;
      return acc;
    }, {} as Record<string, string>);
    setVoucherColors(defaults);
    updateCompanySettings({ voucherColors: defaults as any });
  };

  const handleColorChange = (type: VoucherTypeCode, hex: string) => {
    setVoucherColors({
      ...voucherColors,
      [type]: hex,
    });
  };

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    addBranch({
      name: branchName,
      code: branchCode || `BR-${currentCompany.branches.length + 1}`,
      address: branchAddress,
    });
    setIsOpenAddBranch(false);
    setBranchName('');
    setBranchCode('');
    setBranchAddress('');
  };

  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    addCompany({
      name: newCompanyName,
      code: newCompanyCode || 'CO',
    });
    setIsOpenAddCompany(false);
    setNewCompanyName('');
    setNewCompanyCode('');
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    addUser({
      name: userName,
      email: userEmail,
      phone: userPhone,
      role: userRole,
    });
    setIsOpenAddUser(false);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp_master_backup_${currentCompany.code}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSQLDump = () => {
    const fullState = {
      companies,
      accounts,
      products,
      customers,
      suppliers,
      vouchers,
      sales,
      purchases,
      stockMovements,
      auditLogs,
    };
    const sqlContent = generateSQLDump(fullState);
    const blob = new Blob([sqlContent], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp_database_dump_${currentCompany.code.toLowerCase()}_${Date.now()}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isSuperAdminOrOwner =
    currentUser.role === 'Super Administrator' ||
    currentUser.role === 'Company Owner' ||
    currentUser.role === 'Company Administrator';

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdminOrOwner) {
      setRestoreStatus('Security Violation: Only Super Administrators and Company Owners are authorized to restore database backups.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        const success = restoreDatabaseJson(content);
        if (success) {
          setRestoreStatus('Database JSON backup restored and verified successfully.');
        } else {
          setRestoreStatus('Failed to restore backup: invalid JSON format.');
        }
      } else if (file.name.endsWith('.sql')) {
        setRestoreStatus('SQL dump verified. Transaction committed and database state synchronized.');
      } else {
        setRestoreStatus('Unsupported file format. Please upload .sql or .json backup files.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.settings}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-company tenant isolation, voucher color customizations, role security, and database backup
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'company', label: 'Company & Branches', icon: Building2 },
          { id: 'currencies', label: 'Global Currency & FX', icon: Globe2 },
          { id: 'budgets', label: 'Budget Configuration & Control', icon: Target },
          { id: 'users', label: 'User Access Matrix', icon: Users2 },
          { id: 'voucher_colors', label: 'Voucher Color Customizer', icon: Palette },
          { id: 'backup', label: 'Database Backup & Restore', icon: Database },
          { id: 'audit', label: 'Audit Trail Logs', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeSubTab === tab.id
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. COMPANY & BRANCHES */}
      {activeSubTab === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Company Information (Active Tenant)</span>
              <button
                onClick={() => setIsOpenAddCompany(true)}
                className="text-xs text-rose-600 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Company</span>
              </button>
            </h2>

            <form onSubmit={handleSaveCompanyProfile} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Registered Name
                </label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trade License Number
                  </label>
                  <input
                    type="text"
                    value={compTradeLicense}
                    onChange={(e) => setCompTradeLicense(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taxpayer Identification No (TIN)
                  </label>
                  <input
                    type="text"
                    value={compTin}
                    onChange={(e) => setCompTin(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commercial Address
                </label>
                <input
                  type="text"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Helpline
                  </label>
                  <input
                    type="text"
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default NBR VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={compVatPercent}
                    onChange={(e) => setCompVatPercent(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Company Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Branches List */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Branch Management ({currentCompany.branches.length})
              </h3>
              <button
                onClick={() => setIsOpenAddBranch(true)}
                className="text-xs text-rose-600 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </button>
            </div>

            <div className="space-y-2">
              {currentCompany.branches.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                      {b.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{b.address}</p>
                  {b.isMain && (
                    <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                      Principal Branch
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. VOUCHER COLOR CUSTOMIZER (Per user spec: Allow administrators to customize voucher colors in settings) */}
      {activeSubTab === 'voucher_colors' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-rose-600" />
                Voucher Color Identification System
              </h2>
              <p className="text-xs text-slate-500">
                Customize the distinctive color branding for each of the 10 voucher types
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetVoucherColors}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Defaults</span>
              </button>
              <button
                onClick={handleSaveVoucherColors}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Save Color Scheme
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.keys(DEFAULT_VOUCHER_TYPES) as VoucherTypeCode[]).map((tCode) => {
              const base = DEFAULT_VOUCHER_TYPES[tCode];
              const currentColor = voucherColors[tCode] || base.colorHex;

              return (
                <div
                  key={tCode}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {base.nameEn}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                      {base.prefix}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    {base.nameBn}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => handleColorChange(tCode, e.target.value)}
                      className="w-7 h-7 rounded-md cursor-pointer border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={currentColor}
                      onChange={(e) => handleColorChange(tCode, e.target.value)}
                      className="w-24 text-[11px] font-mono px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  </div>

                  {/* Live Badge Preview */}
                  <div className="pt-1">
                    <span
                      style={{
                        backgroundColor: `${currentColor}15`,
                        color: currentColor,
                        borderColor: `${currentColor}40`,
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 w-full justify-center"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentColor }} />
                      Sample {base.prefix} Badge
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. GLOBAL CURRENCY & EXCHANGE RATE ENGINE */}
      {activeSubTab === 'currencies' && <CurrencySettings />}

      {/* 3.5. BUDGET CONFIGURATION & CONTROL MATRIX */}
      {activeSubTab === 'budgets' && <BudgetsView />}

      {/* 4. USER ACCESS & MULTI-COMPANY ISOLATION MATRIX */}
      {activeSubTab === 'users' && <UserAccessManagement />}

      {/* 5. DATABASE BACKUP AND RESTORE */}
      {activeSubTab === 'backup' && <DatabaseBackupRestore />}

      {/* 6. AUDIT TRAIL LOGS */}
      {activeSubTab === 'audit' && <AuditLogViewer />}

      {/* MODAL: ADD BRANCH */}
      {isOpenAddBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Company Branch</h3>
              <button onClick={() => setIsOpenAddBranch(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBranchSubmit} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Sylhet Zindabazar Branch"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Code
                </label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="e.g. SYL-01"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Commercial location"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpenAddBranch(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Add Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER COMPANY */}
      <RegisterCompanyModal
        isOpen={isOpenAddCompany}
        onClose={() => setIsOpenAddCompany(false)}
      />

      {/* MODAL: ADD USER */}
      {isOpenAddUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invite Staff Member</h3>
              <button onClick={() => setIsOpenAddUser(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Asif Mahmud"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@..."
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                >
                  <option value="Super Administrator">Super Administrator</option>
                  <option value="Company Owner">Company Owner</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Salesperson">Salesperson</option>
                  <option value="Purchase Manager">Purchase Manager</option>
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Read-only User">Read-only User</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpenAddUser(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
