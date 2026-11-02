import { VoucherTypeCode, VoucherTypeConfig } from '../types/erp';

export const DEFAULT_VOUCHER_TYPES: Record<VoucherTypeCode, VoucherTypeConfig> = {
  payment: {
    code: 'payment',
    nameEn: 'Payment Voucher',
    nameBn: 'পেমেন্ট ভাউচার (পরিশোধ)',
    prefix: 'PV',
    colorHex: '#DC2626', // Red
    bgHex: '#FEF2F2',
    borderHex: '#FECACA',
    textHex: '#991B1B',
    description: 'Payments made for expenses, vendor dues, or assets via cash or bank',
  },
  receipt: {
    code: 'receipt',
    nameEn: 'Receipt Voucher',
    nameBn: 'রিসিপ্ট ভাউচার (আদায়)',
    prefix: 'RV',
    colorHex: '#16A34A', // Green
    bgHex: '#F0FDF4',
    borderHex: '#BBF7D0',
    textHex: '#166534',
    description: 'Cash or bank receipts from customers, debtors, or other revenues',
  },
  contra: {
    code: 'contra',
    nameEn: 'Contra Voucher',
    nameBn: 'কন্ট্রা ভাউচার (স্থানান্তর)',
    prefix: 'CV',
    colorHex: '#2563EB', // Blue
    bgHex: '#EFF6FF',
    borderHex: '#BFDBFE',
    textHex: '#1E40AF',
    description: 'Internal cash-to-bank, bank-to-cash, or bank-to-bank transfers',
  },
  journal: {
    code: 'journal',
    nameEn: 'Journal Voucher',
    nameBn: 'জার্নাল ভাউচার (সমন্বয়)',
    prefix: 'JV',
    colorHex: '#9333EA', // Purple
    bgHex: '#FAF5FF',
    borderHex: '#E9D5FF',
    textHex: '#6B21A8',
    description: 'Non-cash accounting adjustments, depreciation, accrued expenses & provisions',
  },
  sales: {
    code: 'sales',
    nameEn: 'Sales Voucher',
    nameBn: 'বিক্রয় ভাউচার',
    prefix: 'SV',
    colorHex: '#EA580C', // Orange
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#9A3412',
    description: 'Sales of merchandise on cash, credit, or digital mobile banking',
  },
  purchase: {
    code: 'purchase',
    nameEn: 'Purchase Voucher',
    nameBn: 'ক্রয় ভাউচার',
    prefix: 'PV-B',
    colorHex: '#0D9488', // Teal
    bgHex: '#F0FDFA',
    borderHex: '#99F6E4',
    textHex: '#115E59',
    description: 'Procurement of inventory goods or raw materials from suppliers',
  },
  debit_note: {
    code: 'debit_note',
    nameEn: 'Debit Note',
    nameBn: 'ডেবিট নোট',
    prefix: 'DN',
    colorHex: '#C2410C', // Deep Orange
    bgHex: '#FFF1EE',
    borderHex: '#FFD0C7',
    textHex: '#7C2D12',
    description: 'Debit adjustment to supplier or customer accounts for claims or undercharging',
  },
  credit_note: {
    code: 'credit_note',
    nameEn: 'Credit Note',
    nameBn: 'ক্রেডিট নোট',
    prefix: 'CN',
    colorHex: '#4F46E5', // Indigo
    bgHex: '#EEF2FF',
    borderHex: '#C7D2FE',
    textHex: '#3730A3',
    description: 'Credit allowance granted to customer for allowances, rebates or adjustments',
  },
  sales_return: {
    code: 'sales_return',
    nameEn: 'Sales Return Voucher',
    nameBn: 'বিক্রয় ফেরত ভাউচার',
    prefix: 'SR',
    colorHex: '#DB2777', // Pink
    bgHex: '#FDF2F8',
    borderHex: '#FBCFE8',
    textHex: '#9D174D',
    description: 'Merchandise returned by customers reducing receivables and restoring inventory',
  },
  purchase_return: {
    code: 'purchase_return',
    nameEn: 'Purchase Return Voucher',
    nameBn: 'ক্রয় ফেরত ভাউচার',
    prefix: 'PR',
    colorHex: '#78350F', // Brown
    bgHex: '#FEF3C7',
    borderHex: '#FDE68A',
    textHex: '#451A03',
    description: 'Defective or excess merchandise returned to suppliers reducing payables',
  },
};

export function getVoucherTypeStyle(type: VoucherTypeCode, customColors?: Record<string, string>) {
  const base = DEFAULT_VOUCHER_TYPES[type] || DEFAULT_VOUCHER_TYPES.journal;
  const customHex = customColors?.[type];

  if (customHex && customHex !== base.colorHex) {
    return {
      ...base,
      colorHex: customHex,
      bgHex: `${customHex}15`,
      borderHex: `${customHex}40`,
      textHex: customHex,
    };
  }

  return base;
}
