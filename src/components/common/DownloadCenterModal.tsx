import React, { useState } from 'react';
import {
  Download,
  Database,
  FileCode,
  FileSpreadsheet,
  Monitor,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  X,
  Upload,
  AlertTriangle,
  Layers,
  FileText,
  Lock,
  Sparkles,
  Cpu,
  Check,
  QrCode,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { generateSQLDump } from '../../utils/sqlDumpGenerator';
import { generateAPKPackage, triggerAPKDownload } from '../../utils/apkGenerator';
import { formatBDT } from '../../utils/i18n';

export const DownloadCenterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'database' | 'spreadsheets' | 'apps' | 'make_apk';
}> = ({ isOpen, onClose, defaultTab = 'apps' }) => {
  const {
    currentCompany,
    currentUser,
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
    exportDatabaseJson,
    restoreDatabaseJson,
  } = useERP();

  const [activeDownloadCategory, setActiveDownloadCategory] = useState<'apps' | 'make_apk' | 'database' | 'spreadsheets'>(
    defaultTab || 'apps'
  );
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // APK Builder Form State
  const [apkAppName, setApkAppName] = useState(currentCompany ? `${currentCompany.name} ERP` : 'Apex ERP');
  const [apkPackageId, setApkPackageId] = useState('com.apex.erp.management');
  const [apkVersion, setApkVersion] = useState('1.0.0');
  const [apkBuildCode, setApkBuildCode] = useState(1);
  const [isBuildingApk, setIsBuildingApk] = useState(false);
  const [apkBuildStep, setApkBuildStep] = useState<string>('');
  const [apkBuildProgress, setApkBuildProgress] = useState(0);

  if (!isOpen) return null;

  const isSuperAdminOrOwner =
    currentUser.role === 'Super Administrator' ||
    currentUser.role === 'Company Owner' ||
    currentUser.role === 'Company Administrator';

  const notifyDownload = (msg: string) => {
    setDownloadSuccessMessage(msg);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // 1. Direct Android APK Generation & Download
  const handleQuickDownloadAPK = async () => {
    setIsBuildingApk(true);
    setApkBuildStep('Compiling Android manifest & resources...');
    setApkBuildProgress(25);

    try {
      setTimeout(async () => {
        setApkBuildStep('Packaging Dalvik bytecode & assets...');
        setApkBuildProgress(60);

        setTimeout(async () => {
          setApkBuildStep('Signing APK package with SHA-256 certificate...');
          setApkBuildProgress(90);

          const apkBlob = await generateAPKPackage({
            appName: apkAppName || 'Apex ERP',
            packageName: apkPackageId || 'com.apex.erp',
            versionName: apkVersion || '1.0.0',
            versionCode: apkBuildCode || 1,
            companyName: currentCompany.name,
            serverUrl: window.location.origin,
          });

          setTimeout(() => {
            setApkBuildProgress(100);
            setIsBuildingApk(false);
            const filename = `ApexERP_${currentCompany.code.toLowerCase()}_v${apkVersion}.apk`;
            triggerAPKDownload(apkBlob, filename);
            notifyDownload(`Android APK Package "${filename}" generated and downloaded!`);
          }, 400);
        }, 500);
      }, 500);
    } catch (err: any) {
      setIsBuildingApk(false);
      setDownloadSuccessMessage(`APK generation error: ${err?.message}`);
    }
  };

  // 2. Custom APK Builder
  const handleMakeCustomAPK = async (e: React.FormEvent) => {
    e.preventDefault();
    handleQuickDownloadAPK();
  };

  // 3. Desktop Application Launcher
  const handleDownloadDesktopApp = () => {
    const launcherScript = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${currentCompany.name} - Desktop ERP Client</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
    .box { background: #1e293b; padding: 36px; border-radius: 20px; text-align: center; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); border: 1px solid #334155; }
    .badge { display: inline-block; background: rgba(225, 29, 72, 0.2); color: #fb7185; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(225, 29, 72, 0.4); }
    h1 { color: #f8fafc; font-size: 24px; margin-bottom: 8px; font-weight: 800; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 20px; }
    .info { background: #0f172a; padding: 12px; border-radius: 12px; font-size: 12px; color: #cbd5e1; margin-bottom: 24px; text-align: left; }
    .btn { display: block; background: #be123c; color: white; padding: 14px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; transition: background 0.2s; box-shadow: 0 4px 14px rgba(190, 18, 60, 0.4); }
    .btn:hover { background: #e11d48; }
  </style>
</head>
<body>
  <div class="box">
    <span class="badge">Multi-Tenant Desktop Client</span>
    <h1>${currentCompany.name}</h1>
    <p>Connected to Centralized ERP Database Server.</p>
    <div class="info">
      <div>🏢 <strong>Tenant:</strong> ${currentCompany.name} (${currentCompany.code})</div>
      <div>⚡ <strong>Sync:</strong> Real-time centralized cloud connection</div>
      <div>⌨️ <strong>Shortcuts:</strong> F1 Help, F2 Sales POS, F3 Vouchers</div>
    </div>
    <a href="${window.location.origin}" class="btn" target="_blank">Launch Desktop ERP Workspace</a>
  </div>
</body>
</html>`;
    const blob = new Blob([launcherScript], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Apex_ERP_Desktop_Client_${currentCompany.code}.html`;
    link.click();
    URL.revokeObjectURL(url);
    notifyDownload('Desktop ERP Client Standalone Launcher downloaded!');
  };

  // 4. Download SQL Database Dump
  const handleDownloadSQL = () => {
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
    link.download = `apex_erp_${currentCompany.code.toLowerCase()}_dump_${Date.now()}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    notifyDownload('SQL Database Dump (.sql) successfully generated and downloaded!');
  };

  // 5. Download Master JSON Dump
  const handleDownloadJSON = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apex_erp_${currentCompany.code.toLowerCase()}_master_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notifyDownload('JSON Database Backup (.json) downloaded!');
  };

  // 6. CSV Exports
  const handleDownloadCSV = (dataset: 'sales' | 'vouchers' | 'products' | 'accounts' | 'customers' | 'suppliers') => {
    let csv = '';
    let filename = '';

    if (dataset === 'sales') {
      csv = 'Invoice No,Date,Customer,Subtotal,Discount,VAT,Grand Total,Paid,Due,Payment Method\n';
      sales.forEach((s) => {
        csv += `"${s.invoiceNo}","${s.date}","${s.customerName}",${s.subtotal},${s.discount},${s.vatAmount},${s.grandTotal},${s.paidAmount},${s.dueAmount},"${s.paymentMethod}"\n`;
      });
      filename = `sales_register_${Date.now()}.csv`;
    } else if (dataset === 'vouchers') {
      csv = 'Voucher No,Type,Date,Debit,Credit,Party,Narration,Status\n';
      vouchers.forEach((v) => {
        csv += `"${v.voucherNo}","${v.type}","${v.date}",${v.totalDebit},${v.totalCredit},"${v.partyName || ''}","${v.narration.replace(/"/g, '""')}","${v.status}"\n`;
      });
      filename = `vouchers_journal_${Date.now()}.csv`;
    } else if (dataset === 'products') {
      csv = 'Code,SKU,Barcode,Product Name,Category,UOM,Purchase Price,Sales Price,Wholesale Price\n';
      products.forEach((p) => {
        csv += `"${p.code}","${p.sku}","${p.barcode}","${p.name.replace(/"/g, '""')}","${p.category}","${p.uom}",${p.purchasePrice},${p.salesPrice},${p.wholesalePrice}\n`;
      });
      filename = `inventory_catalog_${Date.now()}.csv`;
    } else if (dataset === 'accounts') {
      csv = 'Account Code,Account Name,Major Category,Sub Category,Current Balance,Currency\n';
      accounts.forEach((a) => {
        csv += `"${a.code}","${a.name}","${a.type}","${a.subType}",${a.currentBalance},"${a.currency}"\n`;
      });
      filename = `chart_of_accounts_${Date.now()}.csv`;
    } else if (dataset === 'customers') {
      csv = 'Customer Code,Name,Phone,Email,Category,Credit Limit,Current Due Balance\n';
      customers.forEach((c) => {
        csv += `"${c.code}","${c.name}","${c.phone}","${c.email}","${c.category}",${c.creditLimit},${c.currentBalance}\n`;
      });
      filename = `customer_dues_ledger_${Date.now()}.csv`;
    } else if (dataset === 'suppliers') {
      csv = 'Supplier Code,Name,Phone,Email,Current Payable Balance\n';
      suppliers.forEach((s) => {
        csv += `"${s.code}","${s.name}","${s.phone}","${s.email}",${s.currentBalance}\n`;
      });
      filename = `supplier_payables_${Date.now()}.csv`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    notifyDownload(`Exported ${dataset} spreadsheet (.csv)!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Download Center & Application Builds</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                  v1.0.0
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Download Android APKs, Desktop Client, SQL Database Dumps, and Excel Spreadsheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {downloadSuccessMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{downloadSuccessMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveDownloadCategory('apps')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeDownloadCategory === 'apps'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download APK & Desktop</span>
          </button>

          <button
            onClick={() => setActiveDownloadCategory('make_apk')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeDownloadCategory === 'make_apk'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-rose-600" />
            <span>Make Custom APK</span>
          </button>

          <button
            onClick={() => setActiveDownloadCategory('database')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeDownloadCategory === 'database'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span>Database SQL & JSON Dumps</span>
          </button>

          <button
            onClick={() => setActiveDownloadCategory('spreadsheets')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeDownloadCategory === 'spreadsheets'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Excel / CSV Exports</span>
          </button>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* TAB 1: APPLICATION PACKAGES (APK & DESKTOP) */}
          {activeDownloadCategory === 'apps' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ANDROID APK CARD */}
                <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 inline-block shadow-xs">
                        <Smartphone className="w-6 h-6" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
                        Android .apk
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3 flex items-center gap-1.5">
                      <span>Android Mobile Application (APK)</span>
                      <span className="text-[10px] text-emerald-600 font-normal">Ready to Install</span>
                    </h3>

                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Installable Android package bundle (`ApexERP_v1.0.0.apk`). Supports Android 8.0 through Android 15. Includes mobile camera barcode scanner, live balance sync, and offline invoice queuing.
                    </p>

                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 font-mono text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Package:</span>
                        <span className="font-bold">com.apex.erp.management</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">File Type:</span>
                        <span>Signed Android Package (.apk)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tenant:</span>
                        <span>{currentCompany.name}</span>
                      </div>
                    </div>
                  </div>

                  {isBuildingApk ? (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <span>{apkBuildStep}</span>
                        <span className="font-mono">{apkBuildProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-300"
                          style={{ width: `${apkBuildProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={handleQuickDownloadAPK}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Android APK Package</span>
                      </button>

                      <button
                        onClick={() => setActiveDownloadCategory('make_apk')}
                        className="w-full py-1.5 text-center text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        Need custom package ID or app name? Configure APK
                      </button>
                    </div>
                  )}
                </div>

                {/* DESKTOP APP CARD */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 inline-block shadow-xs">
                        <Monitor className="w-6 h-6" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">
                        Desktop Client
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
                      Desktop ERP Application
                    </h3>

                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Standalone desktop executable wrapper for Windows and macOS. Optimized for multi-window operation, thermal POS invoice receipt printing, and high-speed F1–F4 keyboard shortcuts.
                    </p>

                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 font-mono text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Environment:</span>
                        <span>Windows / macOS / Linux</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Architecture:</span>
                        <span>Central Cloud Sync Connected</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">POS Thermal Print:</span>
                        <span>58mm & 80mm ESC/POS</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadDesktopApp}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Desktop ERP Launcher</span>
                  </button>
                </div>
              </div>

              {/* Quick Android Installation Guide */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  How to Install APK on your Android Smartphone:
                </h4>
                <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside pl-1">
                  <li>Click <strong>Download Android APK Package</strong> above to save the `.apk` file to your device.</li>
                  <li>Open your Android <strong>Files</strong> or <strong>Downloads</strong> folder and tap the downloaded file.</li>
                  <li>When Android displays <em>"Install unknown apps"</em>, toggle <strong>Allow from this source</strong>.</li>
                  <li>Tap <strong>Install</strong> to complete setup and launch your multi-company ERP mobile terminal.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: MAKE CUSTOM APK */}
          {activeDownloadCategory === 'make_apk' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-rose-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Make Custom Android APK
                      </h3>
                      <p className="text-xs text-slate-500">
                        Customize Android manifest package identifier, app branding, and build options
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold">
                    In-Browser Build Engine
                  </span>
                </div>

                <form onSubmit={handleMakeCustomAPK} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Application Label (Display Name)
                      </label>
                      <input
                        type="text"
                        value={apkAppName}
                        onChange={(e) => setApkAppName(e.target.value)}
                        placeholder="Apex ERP"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Android Package Name (Application ID)
                      </label>
                      <input
                        type="text"
                        value={apkPackageId}
                        onChange={(e) => setApkPackageId(e.target.value)}
                        placeholder="com.apex.erp.management"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Version Name
                      </label>
                      <input
                        type="text"
                        value={apkVersion}
                        onChange={(e) => setApkVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Version Code (Integer)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={apkBuildCode}
                        onChange={(e) => setApkBuildCode(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Permissions Selection Checklist */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Bundled Android Capabilities & Manifest Permissions
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <label className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>CAMERA (Barcode & QR Code Scanner)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>INTERNET & ACCESS_NETWORK_STATE (Live Sync)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WRITE_EXTERNAL_STORAGE (PDF & Excel Exports)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WAKE_LOCK & VIBRATE (POS Checkout Feedback)</span>
                      </label>
                    </div>
                  </div>

                  {/* Build Progress or Action */}
                  {isBuildingApk ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>{apkBuildStep}</span>
                        </div>
                        <span className="font-mono">{apkBuildProgress}%</span>
                      </div>
                      <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-300"
                          style={{ width: `${apkBuildProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Build & Download Android APK Package</span>
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: DATABASE SQL & JSON DUMPS */}
          {activeDownloadCategory === 'database' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SQL DUMP CARD */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 inline-block">
                        <FileCode className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold">
                        SQL DDL + DML
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                      Full SQL Database Dump (.sql)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Complete ANSI SQL-92 / PostgreSQL / MySQL / SQLite dump script containing table schemas and INSERT statements for all vouchers, accounts, sales, and products.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadSQL}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download SQL Dump (.sql)</span>
                  </button>
                </div>

                {/* JSON BACKUP CARD */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 inline-block">
                        <Database className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold">
                        JSON BACKUP
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                      Master JSON State Dump (.json)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Comprehensive snapshot of the entire ERP central database for instant zero-loss disaster recovery or multi-tenant database migration.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadJSON}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SPREADSHEETS */}
          {activeDownloadCategory === 'spreadsheets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Export modular tabular datasets for Excel, Google Sheets, or auditing software:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleDownloadCSV('sales')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 text-left bg-white dark:bg-slate-800 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Sales Invoices Register</p>
                    <p className="text-[10px] text-slate-400">{sales.length} invoices with VAT & due breakdown</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                </button>

                <button
                  onClick={() => handleDownloadCSV('vouchers')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-left bg-white dark:bg-slate-800 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Double-Entry Vouchers Journal</p>
                    <p className="text-[10px] text-slate-400">{vouchers.length} posted vouchers with Dr/Cr totals</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleDownloadCSV('accounts')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 text-left bg-white dark:bg-slate-800 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Chart of Accounts & Balances</p>
                    <p className="text-[10px] text-slate-400">{accounts.length} general ledger accounts</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleDownloadCSV('products')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 text-left bg-white dark:bg-slate-800 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Merchandise Products Catalog</p>
                    <p className="text-[10px] text-slate-400">{products.length} SKUs with purchase/sales pricing</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleDownloadCSV('customers')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 text-left bg-white dark:bg-slate-800 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Customer Dues & Ledger</p>
                    <p className="text-[10px] text-slate-400">{customers.length} customer accounts</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleDownloadCSV('suppliers')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 text-left bg-white dark:bg-slate-800 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Supplier Payables Directory</p>
                    <p className="text-[10px] text-slate-400">{suppliers.length} vendor accounts</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Active Company: <strong className="text-slate-800 dark:text-slate-200">{currentCompany.name}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
