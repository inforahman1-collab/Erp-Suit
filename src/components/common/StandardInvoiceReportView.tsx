import React from 'react';
import { Printer, Download, Copy, Check } from 'lucide-react';
import { formatBDT, formatDateBD } from '../../utils/i18n';
import { amountToWordsBDT } from '../../utils/numberToWords';
import { openPrintPreviewTab, defaultPrintSettings } from '../../utils/printEngine';

export interface ReportItem {
  sl?: number;
  description: string;
  qty: number;
  uom?: string;
  unitPrice: number;
  amount: number;
}

export interface StandardInvoiceReportProps {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  voucherTitle?: string;
  voucherNo?: string;
  date?: string;
  partyName?: string;
  refNo?: string;
  items?: ReportItem[];
  totalAmount?: number;
  inWords?: string;
  preparedBy?: string;
  checkedBy?: string;
  authorizedBy?: string;
  showActions?: boolean;
}

export const StandardInvoiceReportView: React.FC<StandardInvoiceReportProps> = ({
  companyName = 'ARROW JEANS PVT LTD',
  companyAddress = 'P.C Road, Chittagong',
  companyPhone = '01826106110',
  voucherTitle = 'SALES VOUCHER',
  voucherNo = 'SV-2026-00001',
  date = '02/11/2026',
  partyName = 'Nadim',
  refNo = 'INV-2026-00001',
  items = [
    {
      sl: 1,
      description: 'Arrow Denim Jeans (Standard)',
      qty: 100,
      unitPrice: 1600,
      amount: 160000,
    },
  ],
  totalAmount,
  inWords,
  preparedBy = 'Prepared By',
  checkedBy = 'Checked By / Accountant',
  authorizedBy = 'Authorized Director',
  showActions = true,
}) => {
  const calculatedTotal =
    totalAmount !== undefined
      ? totalAmount
      : items.reduce((sum, item) => sum + (item.amount || item.qty * item.unitPrice), 0);

  const finalInWords = inWords || amountToWordsBDT(calculatedTotal);

  const handlePrintDocument = () => {
    const printHtml = `
      <div class="invoice-report-container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #ffffff; color: #1f2937; max-width: 800px; margin: 0 auto;">
        <!-- Header Info -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: #1f2937; margin: 0; text-transform: uppercase; letter-spacing: -0.01em;">${companyName}</h2>
            <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">${companyAddress} | Phone: ${companyPhone}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="font-size: 15px; font-weight: 700; color: #374151; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">${voucherTitle}</h3>
            <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">Voucher No: <strong>${voucherNo}</strong></p>
            <p style="font-size: 13px; color: #6b7280; margin: 2px 0 0 0;">Date: <strong>${date}</strong></p>
          </div>
        </div>

        <!-- Party / Client Info -->
        <div style="margin-bottom: 16px; font-size: 13px; color: #374151; line-height: 1.6;">
          <p style="margin: 0;"><strong>Party / Account:</strong> ${partyName}</p>
          <p style="margin: 2px 0 0 0;"><strong>Ref No:</strong> ${refNo || 'N/A'}</p>
        </div>

        <!-- Main Report Table -->
        <div style="overflow-x: auto; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #f3f4f6; color: #374151;">
                <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: center; width: 50px;">SL</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 12px;">Product</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: center; width: 90px;">Quantity</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; width: 130px;">Value</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; width: 140px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, idx) => `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: center;">${item.sl ?? idx + 1}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px 12px; font-weight: 500;">${item.description}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: center; font-family: monospace;">${item.qty} ${item.uom || ''}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-family: monospace;">${formatBDT(item.unitPrice)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-family: monospace; font-weight: 600;">${formatBDT(item.amount)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold; color: #111827;">
                <td colspan="4" style="border: 1px solid #d1d5db; padding: 10px 12px; text-align: right;">Total Amount:</td>
                <td style="border: 1px solid #d1d5db; padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700;">${formatBDT(calculatedTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- In-Words Section -->
        <div style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; color: #374151;">
          <p style="margin: 0;"><strong>In Words:</strong> ${finalInWords}</p>
        </div>

        <!-- Footer Signatures -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 48px; text-align: center; font-size: 13px; color: #4b5563;">
          <div style="border-top: 1px solid #9ca3af; padding-top: 8px;">${preparedBy}</div>
          <div style="border-top: 1px solid #9ca3af; padding-top: 8px;">${checkedBy}</div>
          <div style="border-top: 1px solid #9ca3af; padding-top: 8px;">${authorizedBy}</div>
        </div>
      </div>
    `;

    openPrintPreviewTab(
      printHtml,
      `${voucherTitle} - ${voucherNo}`,
      {
        ...defaultPrintSettings,
        paperSize: 'a4',
        showCompanyHeader: false,
        copies: 1,
        autoPrint: true,
      },
      true
    );
  };

  return (
    <div className="space-y-3">
      {showActions && (
        <div className="flex items-center justify-between no-print bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Standard Report & Voucher Format</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDocument}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Print Document or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* The Exact User Requested Template Structure */}
      <div className="invoice-report-container p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-800">
        {/* Header Info */}
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{companyName}</h2>
            <p className="text-sm text-gray-500">
              {companyAddress} | Phone: {companyPhone}
            </p>
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-gray-700">{voucherTitle}</h3>
            <p className="text-sm text-gray-500">Voucher No: {voucherNo}</p>
            <p className="text-sm text-gray-500">Date: {date}</p>
          </div>
        </div>

        {/* Party / Client Info */}
        <div className="mb-4 text-sm text-gray-700">
          <p>
            <strong>Party / Account:</strong> {partyName}
          </p>
          <p>
            <strong>Ref No:</strong> {refNo || 'N/A'}
          </p>
        </div>

        {/* Main Report Table (SL, Product, Quantity, Value, Amount) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-left text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="border border-gray-300 px-4 py-2 text-center w-14">SL</th>
                <th className="border border-gray-300 px-4 py-2">Product</th>
                <th className="border border-gray-300 px-4 py-2 text-center w-24">Quantity</th>
                <th className="border border-gray-300 px-4 py-2 text-right w-28">Value</th>
                <th className="border border-gray-300 px-4 py-2 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {item.sl ?? idx + 1}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {item.description}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center font-mono">
                    {item.qty} {item.uom || ''}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                    {formatBDT(item.unitPrice)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-medium font-mono">
                    {formatBDT(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Down Side Total Row */}
              <tr className="bg-gray-100 font-bold text-gray-900">
                <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right">
                  Total Amount:
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right font-mono">
                  {formatBDT(calculatedTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* In-Words Section */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          <p>
            <strong>In Words:</strong> {finalInWords}
          </p>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-4 mt-12 text-center text-sm">
          <div className="border-t border-gray-400 pt-2">{preparedBy}</div>
          <div className="border-t border-gray-400 pt-2">{checkedBy}</div>
          <div className="border-t border-gray-400 pt-2">{authorizedBy}</div>
        </div>
      </div>
    </div>
  );
};
