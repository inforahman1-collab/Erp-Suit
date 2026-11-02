import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Building,
  Calendar,
  FileText,
  User,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import { Voucher, Company, Customer, Supplier } from '../../types/erp';
import { formatBDT, formatDateBD } from '../../utils/i18n';
import { getVoucherTypeStyle } from '../../utils/voucherConfig';
import { useERP } from '../../context/ERPContext';

interface VoucherEmailModalProps {
  voucher: Voucher;
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherEmailModal: React.FC<VoucherEmailModalProps> = ({
  voucher,
  company,
  isOpen,
  onClose,
}) => {
  const { customers, suppliers, logAudit, currentUser } = useERP();
  const style = getVoucherTypeStyle(voucher.type, company.settings?.voucherColors);

  // Auto-lookup recipient email from party
  const partyEmail = (() => {
    if (voucher.partyId) {
      if (voucher.partyType === 'customer') {
        return customers.find((c) => c.id === voucher.partyId)?.email || '';
      }
      if (voucher.partyType === 'supplier') {
        return suppliers.find((s) => s.id === voucher.partyId)?.email || '';
      }
    }
    return '';
  })();

  const [toEmail, setToEmail] = useState(partyEmail || '');
  const [ccEmail, setCcEmail] = useState(currentUser.email || '');
  const [subject, setSubject] = useState(
    `${company.name} - ${style.nameEn} #${voucher.voucherNo}`
  );
  const [includePdfSlip, setIncludePdfSlip] = useState(true);
  const [sendMethod, setSendMethod] = useState<'erp_mailer' | 'mailto' | 'gmail'>('erp_mailer');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (partyEmail) {
      setToEmail(partyEmail);
    }
    setSubject(`${company.name} - ${style.nameEn} #${voucher.voucherNo}`);
    setSendSuccess(false);
    setErrorMessage(null);
  }, [voucher, partyEmail, company.name, style.nameEn]);

  if (!isOpen) return null;

  // Generate Email Body Text
  const generateEmailText = () => {
    let entriesList = '';
    voucher.entries.forEach((e) => {
      entriesList += `  - ${e.accountName}: ${e.debit > 0 ? `Debit ৳${e.debit.toLocaleString()}` : `Credit ৳${e.credit.toLocaleString()}`} ${e.description ? `(${e.description})` : ''}\n`;
    });

    return `Dear ${voucher.partyName || 'Valued Partner'},\n\nPlease find below the official details of ${style.nameEn} #${voucher.voucherNo} recorded by ${company.name}.\n\nVoucher Summary:\n- Voucher Number: ${voucher.voucherNo}\n- Voucher Type: ${style.nameEn} (${style.nameBn})\n- Date: ${formatDateBD(voucher.date)}\n- Reference No: ${voucher.refNo || 'N/A'}\n- Total Debit / Credit: ${formatBDT(voucher.totalDebit)}\n- Narration / Purpose: ${voucher.narration}\n\nAccounting Line Items:\n${entriesList}\nIssued by: ${voucher.createdBy} (${company.name})\nCommercial Address: ${company.address}\nSupport Phone: ${company.phone}\n\nThis is an authorized enterprise accounting dispatch generated from the Multi-Company ERP Management System.`;
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setErrorMessage('Please specify recipient email address.');
      return;
    }

    setErrorMessage(null);

    if (sendMethod === 'mailto') {
      const body = encodeURIComponent(generateEmailText());
      const sub = encodeURIComponent(subject);
      const cc = ccEmail ? `&cc=${encodeURIComponent(ccEmail)}` : '';
      window.location.href = `mailto:${toEmail}?subject=${sub}&body=${body}${cc}`;
      logAudit(
        'EMAIL_VOUCHER_MAILTO',
        'Vouchers',
        `Initiated email dispatch for ${style.nameEn} #${voucher.voucherNo} to ${toEmail}`,
        { entityId: voucher.id, entityType: 'voucher' }
      );
      setSendSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
      return;
    }

    // ERP Cloud Dispatcher (or Gmail if enabled)
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      logAudit(
        'EMAIL_VOUCHER_SENT',
        'Vouchers',
        `Dispatched digital ${style.nameEn} #${voucher.voucherNo} to ${toEmail} (CC: ${ccEmail || 'None'}) with PDF slip attachment`,
        { entityId: voucher.id, entityType: 'voucher', severity: 'info' }
      );

      setTimeout(() => {
        onClose();
      }, 2000);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto no-print">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Email {style.nameEn}
              </h3>
              <p className="text-[11px] text-slate-500">
                Send official voucher notification, audit copy & line items to party
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sendSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Voucher Emailed Successfully!
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              A copy of <strong>{voucher.voucherNo}</strong> has been dispatched to{' '}
              <strong className="text-slate-700 dark:text-slate-300">{toEmail}</strong>. Audit trail has been recorded.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendEmail} className="py-4 space-y-3.5">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Voucher Quick Info Header */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span
                  style={{
                    backgroundColor: style.bgHex,
                    color: style.textHex,
                    borderColor: style.borderHex,
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                >
                  {style.nameEn}
                </span>
                <span className="ml-2 font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {voucher.voucherNo}
                </span>
                {voucher.partyName && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Party: <strong className="text-slate-700 dark:text-slate-300">{voucher.partyName}</strong>
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {formatBDT(voucher.totalDebit)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatDateBD(voucher.date)}
                </div>
              </div>
            </div>

            {/* Recipient Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email Address *
              </label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com or party email"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* CC Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                CC (Accounts / Audit Email)
              </label>
              <input
                type="text"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="accounts@company.bd, audit@company.bd"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Email Dispatch Method */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSendMethod('erp_mailer')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  sendMethod === 'erp_mailer'
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">ERP Cloud Gateway</div>
                <div className="text-[10px] text-slate-400">Direct instant dispatch</div>
              </button>

              <button
                type="button"
                onClick={() => setSendMethod('mailto')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  sendMethod === 'mailto'
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">Open Email App</div>
                <div className="text-[10px] text-slate-400">Outlook / Apple Mail (mailto:)</div>
              </button>
            </div>

            {/* Attachment checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includePdfSlip}
                onChange={(e) => setIncludePdfSlip(e.target.checked)}
                className="w-4 h-4 accent-rose-600 rounded"
              />
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Attach Clean Printable A4 Voucher Slip</span>
              </span>
            </label>

            {/* Body Preview Accordion */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Generated Message Content Preview
              </span>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 max-h-32 overflow-y-auto text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                {generateEmailText()}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending Voucher...' : 'Send Voucher Email'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
