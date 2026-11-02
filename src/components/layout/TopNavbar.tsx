import React, { useState } from 'react';
import {
  Building2,
  GitBranch,
  UserCheck,
  Languages,
  Monitor,
  Smartphone,
  Moon,
  Sun,
  ShieldCheck,
  CloudCheck,
  CloudOff,
  Keyboard,
  Check,
  ChevronDown,
  Download,
  LogOut,
  Lock,
  Plus,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { translations } from '../../utils/i18n';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface TopNavbarProps {
  onOpenShortcuts: () => void;
  onOpenDownloadCenter: () => void;
  onOpenRegisterCompany?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenShortcuts,
  onOpenDownloadCenter,
  onOpenRegisterCompany,
}) => {
  const {
    language,
    setLanguage,
    appMode,
    setAppMode,
    theme,
    setTheme,
    syncStatus,
    currentCompany,
    currentBranchId,
    currentBranch,
    currentUser,
    companies,
    userAccessibleCompanies,
    switchCompany,
    switchBranch,
    switchUser,
    users,
    logout,
    lockSession,
  } = useERP();

  const t = translations[language];
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* Zone 1: Brand wordmark & Company context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/src/assets/images/erp_company_logo_1792554853520.jpg"
            alt="Apex ERP Emblem"
            className="w-8 h-8 rounded-md object-contain border border-slate-200 dark:border-slate-700 bg-white p-0.5"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Apex ERP
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Multi-Tenant Cloud
            </span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />

        {/* Company Switcher Dropdown (Strictly filtered to authorized companies only) */}
        <div className="relative">
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="Switch company or register new company"
          >
            <Building2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate">{currentCompany?.name || 'Company'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showCompanyMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-76 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{t.switchCompany}</span>
                <span className="text-[10px] text-emerald-500 font-normal">
                  {userAccessibleCompanies.length} authorized
                </span>
              </div>
              {userAccessibleCompanies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => {
                    switchCompany(comp.id);
                    setShowCompanyMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                    comp.id === currentCompany?.id ? 'font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate font-semibold">{comp.name}</p>
                    <p className="text-[10px] text-slate-400">{comp.code} · {comp.branches?.length || 0} Branches · {comp.settings?.currency || 'BDT'}</p>
                  </div>
                  {comp.id === currentCompany?.id && <Check className="w-4 h-4 text-rose-600 shrink-0 ml-2" />}
                </button>
              ))}

              {onOpenRegisterCompany && (
                <div className="pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-700/80 px-2">
                  <button
                    onClick={() => {
                      setShowCompanyMenu(false);
                      onOpenRegisterCompany();
                    }}
                    className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-900/60 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '+ নতুন কোম্পানি নিবন্ধন করুন' : '+ Register New Company'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Branch Selector */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <GitBranch className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <select
            value={currentBranchId}
            onChange={(e) => switchBranch(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
          >
            <option value="all" className="dark:bg-slate-800">
              {t.allBranches}
            </option>
            {(currentCompany?.branches || []).map((b) => (
              <option key={b.id} value={b.id} className="dark:bg-slate-800">
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zone 2: System Status & Quick Indicators */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          {syncStatus === 'synced' ? (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
              <CloudCheck className="w-3.5 h-3.5" />
              <span>{t.syncStatus}</span>
            </span>
          ) : syncStatus === 'syncing' ? (
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-800">
              <span>Syncing...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200 dark:border-amber-800">
              <CloudOff className="w-3.5 h-3.5" />
              <span>{t.offlineStatus}</span>
            </span>
          )}
        </div>
      </div>

      {/* Zone 3: Actions, Device Toggle, Language, User Role Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 1-Click PWA Install Desktop App Button */}
        <PWAInstallButton className="hidden md:inline-flex" />

        {/* Download Center & APK Button */}
        <button
          onClick={onOpenDownloadCenter}
          title="Download Android APK, Desktop App & SQL Database Dump"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Download</span>
          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono font-bold">
            APK
          </span>
        </button>

        {/* Keyboard Shortcuts Trigger */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (F1)"
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span className="text-[11px]">F1</span>
        </button>

        {/* Desktop / Android Mobile App Simulator Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setAppMode('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              appMode === 'desktop'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Desktop ERP Interface"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setAppMode('android')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              appMode === 'android'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Android Mobile Application Simulator"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Android</span>
          </button>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          title="Switch Language (English / বাংলা)"
        >
          <Languages className="w-3.5 h-3.5 text-slate-500" />
          <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User Role Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser?.name ? currentUser.name.charAt(0) : 'A'}
            </div>
            <div className="hidden xl:flex flex-col">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser?.name ? currentUser.name.split(' ')[0] : 'Admin'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {currentUser?.role || 'Super Administrator'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser?.name || 'Administrator'}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{currentUser?.email || 'admin@company.com'}</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  {currentUser?.role || 'Super Administrator'}
                </div>
              </div>

              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Role / User
              </div>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setShowUserMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    u.id === currentUser.id ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-xs">{u.name}</p>
                    <p className="text-[10px] text-slate-400">{u.role}</p>
                  </div>
                  {u.id === currentUser.id && <Check className="w-3.5 h-3.5 text-rose-600" />}
                </button>
              ))}

              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-700 px-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    lockSession();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Session (Require Password)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
