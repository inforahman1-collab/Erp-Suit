export type Language = 'en' | 'bn';
export type AppMode = 'desktop' | 'android';
export type ThemeMode = 'light' | 'dark';

export type UserRole =
  | 'Super Administrator'
  | 'Company Owner'
  | 'Company Administrator'
  | 'Accountant'
  | 'Sales Manager'
  | 'Salesperson'
  | 'Purchase Manager'
  | 'Inventory Manager'
  | 'Cashier'
  | 'Auditor'
  | 'Read-only User';

export type VoucherTypeCode =
  | 'payment'
  | 'receipt'
  | 'contra'
  | 'journal'
  | 'sales'
  | 'purchase'
  | 'debit_note'
  | 'credit_note'
  | 'sales_return'
  | 'purchase_return';

export interface VoucherTypeConfig {
  code: VoucherTypeCode;
  nameEn: string;
  nameBn: string;
  prefix: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  description: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  phone: string;
  address: string;
  isMain: boolean;
}

export interface CurrencyRate {
  code: string; // e.g. 'BDT', 'USD', 'EUR', 'GBP', 'SAR', 'AED'
  symbol: string; // e.g. '৳', '$', '€', '£', '﷼', 'د.إ'
  name: string; // e.g. 'Bangladeshi Taka', 'US Dollar'
  rateToBase: number; // 1 unit of foreign currency = X units of base currency (e.g. 1 USD = 121.50 BDT)
  isBase: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface BudgetSettings {
  enforceBudgetLimits: boolean;
  warningThreshold: number; // e.g. 80%
  autoNotifyExceeded: boolean;
  defaultPeriod: 'monthly' | 'quarterly' | 'annual';
}

export interface CompanySettings {
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  defaultVatPercent: number;
  financialYearStart: string; // e.g. "2026-01-01"
  voucherColors: Record<VoucherTypeCode, string>;
  voucherPrefixes: Record<VoucherTypeCode, string>;
  allowNegativeStock: boolean;
  autoPostLedgers: boolean;
  baseCurrency?: string;
  currencies?: CurrencyRate[];
  autoConvertSalesFx?: boolean;
  autoConvertPurchasesFx?: boolean;
  defaultTransactionCurrency?: string;
  budgetSettings?: BudgetSettings;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  tradeLicense: string;
  tin: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  branches: Branch[];
  settings: CompanySettings;
}

export interface RegisterCompanyInput {
  companyName: string;
  code?: string;
  tradeLicense?: string;
  tin?: string;
  address?: string;
  phone?: string;
  email?: string;
  baseCurrency?: string;
  currencySymbol?: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword?: string;
  openingCash?: number;
  openingBank?: number;
  bankName?: string;
  bankAccountNo?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  allowedCompanyIds: string[];
  allowedBranchIds: string[];
  allowedModules?: string[]; // e.g. ['dashboard', 'vouchers', 'inventory', 'sales', 'purchases', 'customers', 'suppliers', 'accounting', 'reports', 'analytics', 'settings']
  status: 'active' | 'inactive';
  avatar?: string;
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type AccountSubType =
  | 'cash'
  | 'bank'
  | 'receivable'
  | 'payable'
  | 'inventory'
  | 'fixed_asset'
  | 'cost_of_sales'
  | 'operating_expense'
  | 'tax_payable'
  | 'sales_revenue'
  | 'other_income'
  | 'equity_capital';

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  nameBn?: string;
  type: AccountType;
  subType: AccountSubType;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  isSystem?: boolean;
}

export interface VoucherEntry {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface Voucher {
  id: string;
  voucherNo: string;
  type: VoucherTypeCode;
  date: string;
  companyId: string;
  branchId: string;
  entries: VoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  narration: string;
  refNo?: string;
  partyType?: 'customer' | 'supplier' | 'none';
  partyId?: string;
  partyName?: string;
  status: 'posted' | 'draft' | 'cancelled';
  createdBy: string;
  createdAt: string;
}

export interface Godown {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  nameBn?: string;
  code: string;
  parentId?: string | null; // null/undefined for Main Godown, parentId for Sub-Godown
  location: string;
  capacity?: string;
  manager?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  code: string;
  sku: string;
  barcode: string;
  name: string;
  nameBn?: string;
  category: string;
  uom: string; // Pcs, Kg, Box, Roll, Liter, Bag
  purchasePrice: number;
  salesPrice: number;
  wholesalePrice: number;
  openingStock: number;
  minStockAlert: number;
  branchStock: Record<string, number>; // branchId -> quantity
  godownStock?: Record<string, number>; // godownId -> quantity
  defaultGodownId?: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  companyId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: 'Retail' | 'Wholesale' | 'Corporate';
  creditLimit: number;
  openingBalance: number;
  currentBalance: number; // positive = customer owes us (receivable)
}

export interface Supplier {
  id: string;
  companyId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  openingBalance: number;
  currentBalance: number; // positive = we owe supplier (payable)
}

export interface SaleItem {
  productId: string;
  productName: string;
  productCode: string;
  uom: string;
  quantity: number;
  unitPrice: number;
  total: number;
  godownId?: string;
  godownName?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  companyId: string;
  branchId: string;
  godownId?: string;
  godownName?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad';
  status: 'completed' | 'cancelled' | 'returned';
  salesperson: string;
  voucherId?: string;
  createdAt: string;
  currency?: string;
  exchangeRate?: number;
  baseCurrencyTotal?: number;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  productCode: string;
  uom: string;
  quantity: number;
  unitPrice: number;
  total: number;
  godownId?: string;
  godownName?: string;
}

export interface Purchase {
  id: string;
  billNo: string;
  date: string;
  companyId: string;
  branchId: string;
  godownId?: string;
  godownName?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'cash' | 'bank' | 'cheque';
  status: 'received' | 'pending' | 'returned';
  voucherId?: string;
  createdAt: string;
  currency?: string;
  exchangeRate?: number;
  baseCurrencyTotal?: number;
}

export interface Budget {
  id: string;
  companyId: string;
  branchId?: string;
  name: string;
  category: 'expense' | 'sales_target' | 'procurement' | 'capex';
  accountId?: string;
  accountName?: string;
  period: 'monthly' | 'quarterly' | 'annual';
  periodName: string; // e.g. "2026-Q1", "2026-Q2", "FY-2026", "2026-10"
  startDate: string;
  endDate: string;
  currency: string;
  budgetAmount: number;
  exchangeRate: number;
  baseCurrencyAmount: number;
  actualAmount: number;
  warningThresholdPercent: number;
  status: 'active' | 'exceeded' | 'closed';
  notes?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  date: string;
  companyId: string;
  branchId: string;
  productId: string;
  productName: string;
  type: 'sale' | 'purchase' | 'adjustment_in' | 'adjustment_out' | 'transfer_in' | 'transfer_out' | 'sales_return';
  quantity: number;
  godownId?: string;
  godownName?: string;
  refNo: string;
  note?: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  companyId: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  module: string;
  details: string;
  entityId?: string;
  entityType?: 'voucher' | 'product' | 'sale' | 'purchase' | 'customer' | 'supplier' | 'settings' | 'security' | 'database' | 'account' | 'budget' | 'godown';
  severity?: 'info' | 'warning' | 'critical';
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}

export interface CustomReportConfig {
  id: string;
  title: string;
  module: 'sales' | 'purchases' | 'inventory' | 'vouchers' | 'customers' | 'suppliers' | 'accounts';
  fields: string[];
  startDate: string;
  endDate: string;
  branchId?: string;
  groupBy?: string;
  chartType?: 'bar' | 'line' | 'table';
}
