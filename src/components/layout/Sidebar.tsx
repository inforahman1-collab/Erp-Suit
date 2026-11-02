import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PackageCheck,
  ShoppingCart,
  Truck,
  Users2,
  Building,
  Scale,
  FileBarChart2,
  TrendingUp,
  Settings,
  Receipt,
  Layers,
  Download,
  Target,
  GitFork,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { translations } from '../../utils/i18n';

interface SidebarProps {
  onOpenDownloadCenter?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDownloadCenter }) => {
  const { language, activeTab, setActiveTab, vouchers, budgets, currentUser } = useERP();
  const t = translations[language];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    {
      id: 'flowchart',
      label: (t as any).flowchart || 'Flow Chart (Funds)',
      icon: GitFork,
    },
    {
      id: 'vouchers',
      label: t.vouchers,
      icon: Receipt,
      badge: vouchers.length,
    },
    { id: 'inventory', label: t.inventory, icon: PackageCheck },
    { id: 'sales', label: t.sales, icon: ShoppingCart },
    { id: 'purchases', label: t.purchases, icon: Truck },
    { id: 'customers', label: t.customers, icon: Users2 },
    { id: 'suppliers', label: t.suppliers, icon: Building },
    { id: 'accounting', label: t.accounting, icon: Scale },
    {
      id: 'budgets',
      label: t.budgets || 'Budgets & Targets',
      icon: Target,
      badge: budgets.length,
    },
    { id: 'reports', label: t.reports, icon: FileBarChart2 },
    { id: 'analytics', label: t.analytics, icon: TrendingUp },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (currentUser.role === 'Super Administrator') return true;
    if (!currentUser.allowedModules || currentUser.allowedModules.length === 0) return true;
    return currentUser.allowedModules.includes(item.id);
  });

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Core Modules</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Download App & APK Button */}
      {onOpenDownloadCenter && (
        <div className="px-3 py-2">
          <button
            onClick={onOpenDownloadCenter}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Download & APK</p>
                <p className="text-[10px] text-emerald-100/80 leading-tight">Android & Desktop Client</p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">
              APK
            </span>
          </button>
        </div>
      )}

      {/* Voucher Color Reference Legend in bottom sidebar */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Voucher Color Codes
        </p>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-xs bg-red-600" />
            Payment (PV)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-xs bg-emerald-600" />
            Receipt (RV)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-xs bg-blue-600" />
            Contra (CV)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-xs bg-purple-600" />
            Journal (JV)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-xs bg-orange-600" />
            Sales (SV)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-xs bg-teal-600" />
            Purchase (PV-B)
          </span>
        </div>
      </div>
    </aside>
  );
};
