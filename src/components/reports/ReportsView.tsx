import React, { useState, useMemo } from 'react';
import {
  FileBarChart2,
  Calendar,
  Download,
  Printer,
  Sliders,
  Filter,
  CheckSquare,
  Square,
  BarChart2,
  Table as TableIcon,
  Layers,
  ArrowRight,
  ShieldAlert,
  Coins,
  Globe,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { AuditLogViewer } from './AuditLogViewer';
import { printElementContent } from '../../utils/printEngine';
import { StandardInvoiceReportView } from '../common/StandardInvoiceReportView';
import { amountToWordsBDT } from '../../utils/numberToWords';

export const ReportsView: React.FC = () => {
  const {
    language,
    currentCompany,
    currentBranchId,
    sales,
    purchases,
    vouchers,
    products,
    customers,
    suppliers,
    accounts,
    convertCurrency,
  } = useERP();

  const t = translations[language];
  const [reportTab, setReportTab] = useState<'automated' | 'builder' | 'audit'>('automated');
  const [reportCurrency, setReportCurrency] = useState<string>(
    currentCompany.settings.baseCurrency || currentCompany.settings.currency || 'BDT'
  );

  // Available currencies from company settings
  const availableCurrencies = currentCompany.settings.currencies || [
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rateToBase: 1.0 },
    { code: 'USD', symbol: '$', name: 'US Dollar', rateToBase: 121.50 },
  ];

  // Automated Reports Selection
  const [selectedAutomatedType, setSelectedAutomatedType] = useState<
    'daily_sales' | 'daily_purchase' | 'cash_bank' | 'customer_due' | 'supplier_payable' | 'stock_valuation' | 'invoice_voucher_report'
  >('invoice_voucher_report');

  // Custom Report Builder States
  const [builderModule, setBuilderModule] = useState<'sales' | 'purchases' | 'products' | 'customers' | 'suppliers' | 'vouchers'>('sales');
  const [selectedFields, setSelectedFields] = useState<string[]>(['invoiceNo', 'date', 'customerName', 'grandTotal', 'paidAmount', 'dueAmount']);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Module field definitions
  const MODULE_FIELDS: Record<string, { key: string; label: string }[]> = {
    sales: [
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'date', label: 'Date' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'discount', label: 'Discount' },
      { key: 'vatAmount', label: 'VAT Amount' },
      { key: 'grandTotal', label: 'Grand Total' },
      { key: 'paidAmount', label: 'Paid Amount' },
      { key: 'dueAmount', label: 'Due Amount' },
      { key: 'paymentMethod', label: 'Payment Method' },
    ],
    purchases: [
      { key: 'billNo', label: 'Bill No' },
      { key: 'date', label: 'Date' },
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'discount', label: 'Discount' },
      { key: 'grandTotal', label: 'Grand Total' },
      { key: 'paidAmount', label: 'Paid Amount' },
      { key: 'dueAmount', label: 'Due Amount' },
      { key: 'paymentMethod', label: 'Payment Method' },
    ],
    products: [
      { key: 'code', label: 'Product Code' },
      { key: 'name', label: 'Product Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category' },
      { key: 'purchasePrice', label: 'Cost Price' },
      { key: 'salesPrice', label: 'Sales Price' },
      { key: 'uom', label: 'UOM' },
    ],
    customers: [
      { key: 'code', label: 'Customer Code' },
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'category', label: 'Category' },
      { key: 'creditLimit', label: 'Credit Limit' },
      { key: 'currentBalance', label: 'Current Due' },
    ],
    suppliers: [
      { key: 'code', label: 'Supplier Code' },
      { key: 'name', label: 'Supplier Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'currentBalance', label: 'Current Payable' },
    ],
    vouchers: [
      { key: 'voucherNo', label: 'Voucher No' },
      { key: 'type', label: 'Voucher Type' },
      { key: 'date', label: 'Date' },
      { key: 'totalDebit', label: 'Debit (৳)' },
      { key: 'totalCredit', label: 'Credit (৳)' },
      { key: 'narration', label: 'Narration' },
      { key: 'status', label: 'Status' },
    ],
  };

  // Toggle field selection in custom report
  const toggleField = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
      }
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const handleModuleChange = (newModule: any) => {
    setBuilderModule(newModule);
    setSelectedFields(MODULE_FIELDS[newModule].slice(0, 5).map((f) => f.key));
  };

  // Retrieve matching data for custom report
  const builderData = useMemo(() => {
    let source: any[] = [];
    if (builderModule === 'sales') source = sales;
    else if (builderModule === 'purchases') source = purchases;
    else if (builderModule === 'products') source = products;
    else if (builderModule === 'customers') source = customers;
    else if (builderModule === 'suppliers') source = suppliers;
    else if (builderModule === 'vouchers') source = vouchers;

    return source.filter((item) => {
      if (item.date) {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
      }
      return true;
    });
  }, [builderModule, sales, purchases, products, customers, suppliers, vouchers, startDate, endDate]);

  // Export to CSV Function
  const exportToCSV = () => {
    const fields = MODULE_FIELDS[builderModule].filter((f) => selectedFields.includes(f.key));
    const headerRow = fields.map((f) => `"${f.label}"`).join(',');

    const rows = builderData.map((row) =>
      fields
        .map((f) => {
          const val = row[f.key];
          return `"${val !== undefined ? String(val).replace(/"/g, '""') : ''}"`;
        })
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `erp_report_${builderModule}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.reports}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated scheduled daily digests and interactive dynamic custom report engine
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Global Currency Conversion Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <Coins className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="text-[11px] font-semibold text-slate-500">Report FX:</span>
            <select
              value={reportCurrency}
              onChange={(e) => setReportCurrency(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-hidden cursor-pointer"
            >
              {availableCurrencies.map((c) => (
                <option key={c.code} value={c.code} className="dark:bg-slate-800">
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Segmented Mode: Automated Reports vs Custom Report Builder vs Audit Trail */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setReportTab('automated')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                reportTab === 'automated'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Automated Reports
            </button>
            <button
              onClick={() => setReportTab('builder')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                reportTab === 'builder'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Report Builder
            </button>
            <button
              onClick={() => setReportTab('audit')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                reportTab === 'audit'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Audit Log & Trail</span>
            </button>
          </div>
        </div>
      </div>

      {reportTab === 'automated' && (
        /* AUTOMATED DAILY REPORTS */
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { id: 'invoice_voucher_report', label: '★ Standard Voucher / Invoice Report' },
              { id: 'daily_sales', label: 'Daily Sales Report' },
              { id: 'daily_purchase', label: 'Daily Purchase Report' },
              { id: 'cash_bank', label: 'Daily Cash & Bank' },
              { id: 'customer_due', label: 'Customer Due Report' },
              { id: 'supplier_payable', label: 'Supplier Payable Report' },
              { id: 'stock_valuation', label: 'Inventory Valuation' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedAutomatedType(preset.id as any)}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  selectedAutomatedType === preset.id
                    ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Report Paper Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {currentCompany.name} - Automated Report Engine
                </h2>
                <p className="text-xs text-slate-500">
                  Standard enterprise format with double signatures & in-words conversion · {formatDateBD(new Date().toISOString())}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    printElementContent(
                      'automated-digest-content',
                      `${selectedAutomatedType.replace(/_/g, ' ').toUpperCase()}`,
                      currentCompany.name
                    )
                  }
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>
            </div>

            <div id="automated-digest-content" className="space-y-4">
            {selectedAutomatedType === 'invoice_voucher_report' && (
              <StandardInvoiceReportView
                companyName="ARROW JEANS PVT LTD"
                companyAddress="P.C Road, Chittagong"
                companyPhone="01826106110"
                voucherTitle="SALES VOUCHER"
                voucherNo="SV-2026-00001"
                date="02/11/2026"
                partyName="Nadim"
                refNo="INV-2026-00001"
                items={[
                  {
                    sl: 1,
                    description: 'Arrow Denim Jeans (Standard)',
                    qty: 100,
                    unitPrice: 1600,
                    amount: 160000,
                  },
                ]}
                totalAmount={160000}
                inWords="One Lakh Sixty Thousand Taka Only."
                preparedBy="Prepared By"
                checkedBy="Checked By / Accountant"
                authorizedBy="Authorized Director"
                showActions={true}
              />
            )}

            {selectedAutomatedType === 'daily_sales' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Today Invoices</span>
                    <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">{sales.length}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Gross Sales</span>
                    <p className="text-lg font-bold font-mono text-rose-600">
                      {formatBDT(sales.reduce((acc, s) => acc + s.grandTotal, 0))}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Cash / Bank Received</span>
                    <p className="text-lg font-bold font-mono text-emerald-600">
                      {formatBDT(sales.reduce((acc, s) => acc + s.paidAmount, 0))}
                    </p>
                  </div>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Invoice No</th>
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-right">VAT</th>
                      <th className="py-2 px-3 text-right">Grand Total</th>
                      <th className="py-2 px-3 text-right">Collected</th>
                      <th className="py-2 px-3 text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sales.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 px-3 font-mono font-bold">{s.invoiceNo}</td>
                        <td className="py-2 px-3 font-medium">{s.customerName}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatBDT(s.subtotal)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatBDT(s.vatAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatBDT(s.grandTotal)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold tabular-nums">{formatBDT(s.paidAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 font-semibold tabular-nums">{formatBDT(s.dueAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedAutomatedType === 'customer_due' && (
              <div className="space-y-4">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Customer Code</th>
                      <th className="py-2 px-3">Customer Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Credit Limit</th>
                      <th className="py-2 px-3 text-right">Outstanding Due (Receivable)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 px-3 font-mono font-bold">{c.code}</td>
                        <td className="py-2 px-3 font-medium">{c.name}</td>
                        <td className="py-2 px-3 text-slate-500">{c.phone}</td>
                        <td className="py-2 px-3">{c.category}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatBDT(c.creditLimit)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                          {formatBDT(c.currentBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedAutomatedType === 'cash_bank' && (
              <div className="space-y-4">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Account Code</th>
                      <th className="py-2 px-3">Account Title</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3 text-right">Current Available Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {accounts
                      .filter((a) => a.subType === 'cash' || a.subType === 'bank')
                      .map((a) => (
                        <tr key={a.id}>
                          <td className="py-2 px-3 font-mono font-bold">{a.code}</td>
                          <td className="py-2 px-3 font-medium">{a.name}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-500">{a.subType}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatBDT(a.currentBalance)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {reportTab === 'builder' && (
        /* CUSTOM REPORT BUILDER */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              Configure Custom Report Dimensions & Metrics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Data Module
                </label>
                <select
                  value={builderModule}
                  onChange={(e) => handleModuleChange(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                >
                  <option value="sales">Sales & Invoicing</option>
                  <option value="purchases">Purchase Bills</option>
                  <option value="products">Inventory & Products</option>
                  <option value="customers">Customers Directory</option>
                  <option value="suppliers">Suppliers Directory</option>
                  <option value="vouchers">Financial Vouchers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3. End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Field Pickers */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Columns to Include in Output ({selectedFields.length} selected):
              </label>
              <div className="flex flex-wrap gap-2">
                {MODULE_FIELDS[builderModule].map((f) => {
                  const isChecked = selectedFields.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleField(f.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isChecked
                          ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-mono">
                Matching records: <strong className="text-slate-900 dark:text-white">{builderData.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel/CSV</span>
                </button>
                <button
                  onClick={() =>
                    printElementContent(
                      'custom-report-table-area',
                      `Custom Report (${builderModule.toUpperCase()})`,
                      currentCompany.name
                    )
                  }
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Custom Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Custom Report Data Grid */}
          <div id="custom-report-table-area" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    {MODULE_FIELDS[builderModule]
                      .filter((f) => selectedFields.includes(f.key))
                      .map((f) => (
                        <th key={f.key} className="py-2.5 px-4 whitespace-nowrap">
                          {f.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {builderData.length === 0 ? (
                    <tr>
                      <td colSpan={selectedFields.length} className="py-8 text-center text-slate-400">
                        No records match the selected date range and filters.
                      </td>
                    </tr>
                  ) : (
                    builderData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                        {MODULE_FIELDS[builderModule]
                          .filter((f) => selectedFields.includes(f.key))
                          .map((f) => {
                            const val = row[f.key];
                            const isNumeric = typeof val === 'number';

                            return (
                              <td
                                key={f.key}
                                className={`py-2 px-4 whitespace-nowrap ${
                                  isNumeric ? 'font-mono text-right tabular-nums' : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {isNumeric && (f.key.toLowerCase().includes('total') || f.key.toLowerCase().includes('amount') || f.key.toLowerCase().includes('price') || f.key.toLowerCase().includes('balance'))
                                  ? formatBDT(val)
                                  : val !== undefined
                                  ? String(val)
                                  : '-'}
                              </td>
                            );
                          })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. AUDIT TRAIL & ACTIVITY LOG VIEWER */}
      {reportTab === 'audit' && <AuditLogViewer />}
    </div>
  );
};
