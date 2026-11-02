import React, { useState } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Users2,
  Receipt,
  Wifi,
  Battery,
  Signal,
  Building2,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  Barcode,
  RefreshCw,
  Bell,
  Download,
  Sparkles,
  GitFork,
  Landmark,
  Coins,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { getVoucherTypeStyle } from '../../utils/voucherConfig';
import { generateAPKPackage, triggerAPKDownload } from '../../utils/apkGenerator';

export const AndroidSimulatorView: React.FC<{
  onOpenSaleModal: () => void;
  onOpenVoucherModal: () => void;
}> = ({ onOpenSaleModal, onOpenVoucherModal }) => {
  const {
    language,
    currentCompany,
    currentBranch,
    currentUser,
    sales,
    purchases,
    products,
    customers,
    vouchers,
    accounts,
    syncStatus,
    setAppMode,
    setActiveTab,
  } = useERP();

  const t = translations[language];
  const [mobileTab, setMobileTab] = useState<'home' | 'pos' | 'stock' | 'dues' | 'vouchers'>('home');
  const [stockSearch, setStockSearch] = useState('');

  const todaySales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);
  const [isGeneratingApk, setIsGeneratingApk] = useState(false);

  const handleDownloadAPK = async () => {
    setIsGeneratingApk(true);
    try {
      const apkBlob = await generateAPKPackage({
        appName: `${currentCompany.name} ERP`,
        packageName: 'com.apex.erp.management',
        versionName: '1.0.0',
        versionCode: 1,
        companyName: currentCompany.name,
        serverUrl: window.location.origin,
      });
      triggerAPKDownload(apkBlob, `ApexERP_${currentCompany.code.toLowerCase()}_v1.0.apk`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingApk(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 px-2">
      <div className="flex items-center justify-between w-full max-w-sm mb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Android Mobile App
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAPK}
            disabled={isGeneratingApk}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            title="Download Installable Android APK"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingApk ? 'Building...' : 'Download APK'}</span>
          </button>
          <button
            onClick={() => setAppMode('desktop')}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold ml-1"
          >
            Desktop →
          </button>
        </div>
      </div>

      {/* Android Device Shell (Pixel 8 / Galaxy S24 frame) */}
      <div className="w-full max-w-[390px] h-[780px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col overflow-hidden">
        {/* Dynamic Island / Camera Punch Hole */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
        </div>

        {/* Inner Phone Screen Container */}
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-[34px] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 select-none">
          {/* Android Status Bar */}
          <div className="h-9 px-6 pt-2 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 z-30">
            <span>10:45</span>
            <div className="flex items-center gap-2">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* Android App Bar */}
          <div className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[190px]">
                  {currentCompany.name}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500">
                {currentBranch ? currentBranch.name : 'All Branches'} · {currentUser.name.split(' ')[0]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold border border-emerald-200">
                CLOUD SYNC
              </span>
            </div>
          </div>

          {/* Android Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mobileTab === 'home' && (
              <>
                {/* Mobile KPI Cards */}
                <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[11px] font-medium opacity-90">Today's Sales Revenue</span>
                  <div className="text-2xl font-bold font-mono tabular-nums">
                    {formatBDT(todaySales)}
                  </div>
                  <div className="text-[10px] opacity-80 pt-1 flex justify-between">
                    <span>{sales.length} transactions</span>
                    <span>Live Cloud Feed</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Receivable</span>
                    <p className="text-sm font-bold font-mono text-rose-600 mt-0.5 tabular-nums">
                      {formatBDT(totalReceivables)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Catalog Items</span>
                    <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {products.length} SKUs
                    </p>
                  </div>
                </div>

                {/* Mobile Bank & Cash Funds Card */}
                <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <GitFork className="w-4 h-4" />
                      <span>Bank & Cash Funds</span>
                    </div>
                    <button
                      onClick={() => {
                        setAppMode('desktop');
                        setActiveTab('flowchart');
                      }}
                      className="text-[10px] text-rose-300 hover:text-white font-bold underline"
                    >
                      Flow Chart →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-400" />
                        Cash in Hand
                      </span>
                      <p className="font-mono font-bold text-emerald-400 text-xs mt-0.5">
                        {formatBDT(accounts.filter((a) => a.subType === 'cash').reduce((s, a) => s + (Number(a.currentBalance) || 0), 0))}
                      </p>
                    </div>

                    <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Landmark className="w-3 h-3 text-blue-400" />
                        Bank Accounts
                      </span>
                      <p className="font-mono font-bold text-blue-400 text-xs mt-0.5">
                        {formatBDT(accounts.filter((a) => a.subType === 'bank').reduce((s, a) => s + (Number(a.currentBalance) || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Touch Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={onOpenSaleModal}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-rose-500 transition-all flex flex-col justify-between"
                  >
                    <ShoppingCart className="w-5 h-5 text-rose-600 mb-1" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">New Sale</span>
                    <span className="text-[10px] text-slate-400">Barcode / Cash POS</span>
                  </button>

                  <button
                    onClick={onOpenVoucherModal}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-emerald-500 transition-all flex flex-col justify-between"
                  >
                    <Receipt className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Post Voucher</span>
                    <span className="text-[10px] text-slate-400">Payment / Receipt</span>
                  </button>
                </div>

                {/* Native Android APK Install Card */}
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl text-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase">
                      Android Native APK
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Install on Your Android Phone</h4>
                    <p className="text-[10px] text-emerald-100/90 leading-tight mt-0.5">
                      Get the standalone `.apk` package with mobile camera barcode scanner and offline billing.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadAPK}
                    disabled={isGeneratingApk}
                    className="w-full py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isGeneratingApk ? 'Generating Package...' : 'Download Android APK'}</span>
                  </button>
                </div>

                {/* Recent Vouchers on Mobile */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Recent Vouchers
                  </span>
                  <div className="space-y-1.5">
                    {vouchers.slice(0, 4).map((v) => {
                      const style = getVoucherTypeStyle(v.type, currentCompany.settings?.voucherColors);
                      return (
                        <div
                          key={v.id}
                          className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: style.colorHex }}
                              />
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {v.voucherNo}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {v.narration}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatBDT(v.totalDebit)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {mobileTab === 'stock' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Scan barcode or search SKU..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  {products
                    .filter((p) => p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.barcode.includes(stockSearch))
                    .map((p) => {
                      const totalStock = Object.values(p.branchStock).reduce((a, b) => a + b, 0);
                      return (
                        <div
                          key={p.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku} · Barcode: {p.barcode}
                            </p>
                            <p className="text-[11px] font-bold text-emerald-600 font-mono mt-0.5">
                              {formatBDT(p.salesPrice)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                              {totalStock} {p.uom}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {mobileTab === 'dues' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Customer Dues</span>
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.phone}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-600 tabular-nums">
                      {formatBDT(c.currentBalance)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {mobileTab === 'vouchers' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Voucher Feed</span>
                {vouchers.map((v) => {
                  const style = getVoucherTypeStyle(v.type, currentCompany.settings?.voucherColors);
                  return (
                    <div
                      key={v.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{v.voucherNo}</span>
                        <span
                          style={{ color: style.textHex, backgroundColor: style.bgHex }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        >
                          {style.nameEn}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{v.narration}</p>
                      <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <span className="text-slate-400">{formatDateBD(v.date)}</span>
                        <span className="font-bold">{formatBDT(v.totalDebit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Android Bottom Navigation Bar */}
          <div className="h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileTab('home')}
              className={`flex flex-col items-center gap-0.5 ${
                mobileTab === 'home' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px] font-medium">Home</span>
            </button>

            <button
              onClick={() => setMobileTab('stock')}
              className={`flex flex-col items-center gap-0.5 ${
                mobileTab === 'stock' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span className="text-[10px] font-medium">Stock</span>
            </button>

            <button
              onClick={onOpenSaleModal}
              className="w-10 h-10 -mt-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-700 transition-transform active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileTab('dues')}
              className={`flex flex-col items-center gap-0.5 ${
                mobileTab === 'dues' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span className="text-[10px] font-medium">Dues</span>
            </button>

            <button
              onClick={() => setMobileTab('vouchers')}
              className={`flex flex-col items-center gap-0.5 ${
                mobileTab === 'vouchers' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="text-[10px] font-medium">Vouchers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
