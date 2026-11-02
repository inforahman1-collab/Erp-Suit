import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Company,
  Branch,
  User,
  Account,
  Product,
  Customer,
  Supplier,
  Voucher,
  Sale,
  Purchase,
  StockMovement,
  AuditLog,
  Language,
  AppMode,
  ThemeMode,
  VoucherTypeCode,
  CurrencyRate,
  Budget,
  Godown,
  RegisterCompanyInput,
} from '../types/erp';
import {
  initialCompanies,
  initialUsers,
  initialAccounts,
  initialProducts,
  initialCustomers,
  initialSuppliers,
  initialVouchers,
  initialSales,
  initialPurchases,
  initialAuditLogs,
  defaultCurrencies,
  initialBudgets,
  initialGodowns,
} from '../data/seedData';
import { validateJournalBalance } from '../services/accountingEngine';

interface ERPContextType {
  // Authentication & Security
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  lockSession: () => void;
  registerCompany: (input: RegisterCompanyInput) => { success: boolean; error?: string; company?: Company; user?: User };
  resetUserPassword: (identifier: string, newPass: string) => { success: boolean; error?: string; user?: User };

  // Navigation & Environment
  language: Language;
  setLanguage: (lang: Language) => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';

  // Current Selections & Multi-Company Isolation
  currentCompany: Company;
  currentBranchId: string; // 'all' or branchId
  currentBranch?: Branch;
  currentUser: User;
  userAccessibleCompanies: Company[];
  switchCompany: (companyId: string) => boolean;
  switchBranch: (branchId: string) => void;
  switchUser: (userId: string) => void;
  updateUserPermissions: (userId: string, data: Partial<User>) => void;

  // Data Collections (Scoped to current company)
  companies: Company[];
  branches: Branch[];
  users: User[];
  accounts: Account[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  vouchers: Voucher[];
  sales: Sale[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  budgets: Budget[];
  godowns: Godown[];

  // Mutations
  createVoucher: (voucherData: Partial<Voucher>) => { success: boolean; error?: string; voucher?: Voucher };
  reverseVoucher: (voucherId: string, reason: string) => { success: boolean; error?: string };
  updateVoucher: (voucherId: string, updates: Partial<Voucher>) => { success: boolean; error?: string };
  deleteVoucher: (voucherId: string, reason?: string) => { success: boolean; error?: string };
  addAccount: (accountData: Partial<Account>) => { success: boolean; error?: string; account?: Account };
  updateAccount: (accountId: string, updates: Partial<Account>) => { success: boolean; error?: string };
  deleteAccount: (accountId: string, reason?: string) => { success: boolean; error?: string };
  createSale: (saleData: Partial<Sale>) => { success: boolean; error?: string; sale?: Sale };
  deleteSale: (saleId: string, reason?: string) => { success: boolean; error?: string };
  createPurchase: (purchaseData: Partial<Purchase>) => { success: boolean; error?: string; purchase?: Purchase };
  adjustStock: (productId: string, branchId: string, deltaQty: number, type: 'adjustment_in' | 'adjustment_out', note: string) => boolean;
  transferStock: (productId: string, fromBranchId: string, toBranchId: string, qty: number, note: string) => boolean;
  addProduct: (product: Partial<Product>) => boolean;
  updateProduct: (productId: string, updates: Partial<Product>) => boolean;
  deleteProduct: (productId: string, reason?: string) => boolean;
  addGodown: (godownData: Partial<Godown>) => { success: boolean; error?: string; godown?: Godown };
  updateGodown: (godownId: string, updates: Partial<Godown>) => { success: boolean; error?: string };
  deleteGodown: (godownId: string, reason?: string) => { success: boolean; error?: string };
  getGodownStock: (productId: string, godownId?: string) => number;
  addCustomer: (customer: Partial<Customer>) => boolean;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => { success: boolean; error?: string };
  deleteCustomer: (customerId: string, reason?: string) => { success: boolean; error?: string };
  addSupplier: (supplier: Partial<Supplier>) => boolean;
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => { success: boolean; error?: string };
  deleteSupplier: (supplierId: string, reason?: string) => { success: boolean; error?: string };
  recordCustomerReceipt: (customerId: string, amount: number, paymentMethod: 'cash' | 'bank', refNo: string, narration: string) => boolean;
  recordOrderReceipt: (saleIdOrVoucherNo: string, amount: number, paymentMethod: 'cash' | 'bank' | 'bkash' | 'nagad', refNo: string, narration: string, depositAccountId?: string) => { success: boolean; error?: string; voucher?: Voucher };
  recordSupplierPayment: (supplierId: string, amount: number, paymentMethod: 'cash' | 'bank', refNo: string, narration: string) => boolean;
  updateCompanySettings: (settings: Partial<Company['settings']>) => void;
  updateCurrencies: (currencies: CurrencyRate[], baseCurrency?: string) => void;
  convertCurrency: (amount: number, fromCode: string, toCode: string) => number;
  addBudget: (budget: Partial<Budget>) => boolean;
  updateBudget: (id: string, updates: Partial<Budget>) => boolean;
  deleteBudget: (id: string, reason?: string) => boolean;
  addCompany: (comp: Partial<Company>) => void;
  addBranch: (branch: Partial<Branch>) => void;
  addUser: (user: Partial<User>) => void;
  logAudit: (action: string, module: string, details: string, meta?: Partial<AuditLog>) => void;
  exportDatabaseJson: () => string;
  restoreDatabaseJson: (json: string) => boolean;
  resetToInitialData: () => void;
}

// Safe Storage helpers for iframe sandbox environments
const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn('sessionStorage getItem error', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('sessionStorage setItem error', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('sessionStorage removeItem error', e);
    }
  },
};

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage getItem error', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage setItem error', e);
    }
  },
};

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'apextrading_erp_v1';

export const ERPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if session token exists in safeSessionStorage for page refreshes
    return safeSessionStorage.getItem('apex_erp_session') === 'active';
  });

  const [language, setLanguage] = useState<Language>('en');
  const [appMode, setAppMode] = useState<AppMode>('desktop');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Master collections
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [currentCompanyId, setCurrentCompanyId] = useState<string>('comp_apex');
  const [currentBranchId, setCurrentBranchId] = useState<string>('branch_dhaka_main');
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState<string>('user_admin');

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [godowns, setGodowns] = useState<Godown[]>(initialGodowns);

  // Initialize and load from local storage or backend
  useEffect(() => {
    const saved = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.companies) setCompanies(parsed.companies);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.vouchers) setVouchers(parsed.vouchers);
        if (parsed.sales) setSales(parsed.sales);
        if (parsed.purchases) setPurchases(parsed.purchases);
        if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.budgets) setBudgets(parsed.budgets);
        if (parsed.godowns) setGodowns(parsed.godowns);
      } catch (err) {
        console.error('Failed to parse local ERP cache', err);
      }
    }

    // Try fetching from backend API to ensure central sync
    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.data && data.data.companies) {
          const d = data.data;
          setCompanies(d.companies || initialCompanies);
          if (d.users) setUsers(d.users);
          setAccounts(d.accounts || initialAccounts);
          setProducts(d.products || initialProducts);
          setCustomers(d.customers || initialCustomers);
          setSuppliers(d.suppliers || initialSuppliers);
          setVouchers(d.vouchers || initialVouchers);
          setSales(d.sales || initialSales);
          setPurchases(d.purchases || initialPurchases);
          if (d.stockMovements) setStockMovements(d.stockMovements);
          if (d.auditLogs) setAuditLogs(d.auditLogs);
          if (d.budgets) setBudgets(d.budgets);
          setGodowns(d.godowns || initialGodowns);
          setSyncStatus('synced');
        } else {
          // Push initial data to backend
          syncWithServer();
        }
      })
      .catch(() => {
        setSyncStatus('offline');
      });
  }, []);

  // Save to local storage and sync to server
  const syncWithServer = useCallback(() => {
    setSyncStatus('syncing');
    const fullState = {
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
      budgets,
      godowns,
    };

    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fullState));

    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullState),
    })
      .then(() => setSyncStatus('synced'))
      .catch(() => setSyncStatus('offline'));
  }, [companies, users, accounts, products, customers, suppliers, vouchers, sales, purchases, stockMovements, auditLogs, budgets, godowns]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncWithServer();
    }, 600);
    return () => clearTimeout(timer);
  }, [companies, users, accounts, products, customers, suppliers, vouchers, sales, purchases, stockMovements, auditLogs, budgets, godowns, syncWithServer]);

  // Derived current references
  const currentCompany = companies.find((c) => c.id === currentCompanyId) || companies[0] || initialCompanies[0];
  const branches = currentCompany?.branches || [];
  const currentBranch =
    branches.find((b) => b.id === currentBranchId) ||
    branches[0] ||
    initialCompanies[0]?.branches?.[0] ||
    ({
      id: 'branch_dhaka_main',
      companyId: currentCompany?.id || 'comp_apex',
      name: 'Head Office',
      code: 'HQ-01',
      isMain: true,
      address: 'Central Business District',
      phone: '+880 1700-000000',
    } as Branch);
  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || initialUsers[0];

  // User Accessible Companies (Enforces strict tenant isolation per user)
  const userAccessibleCompanies = companies.filter((c) => {
    if (!currentUser || currentUser.role === 'Super Administrator') return true;
    return currentUser.allowedCompanyIds && currentUser.allowedCompanyIds.includes(c.id);
  });

  // Authentication operations
  const login = (identifier: string, passwordInput: string): { success: boolean; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const targetUser = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.name.toLowerCase() === cleanId ||
        u.phone.replace(/[\s-]/g, '') === cleanId.replace(/[\s-]/g, '')
    );

    if (!targetUser) {
      logAudit(
        'LOGIN_FAILED',
        'Auth',
        `Failed authentication attempt for unknown username/email: "${identifier}"`,
        { severity: 'warning', entityType: 'security' }
      );
      return { success: false, error: 'User account not found. Please verify username or email.' };
    }

    if (targetUser.status === 'inactive') {
      return { success: false, error: 'This user account is currently deactivated. Contact Super Administrator.' };
    }

    // Verify password (default fallback for demo users: admin123, accounts123, sales123, cashier123)
    const expectedPassword = targetUser.password || 'admin123';
    if (passwordInput !== expectedPassword) {
      logAudit(
        'LOGIN_FAILED',
        'Auth',
        `Password mismatch for user "${targetUser.name}" (${targetUser.email})`,
        { severity: 'warning', entityType: 'security', userId: targetUser.id, userName: targetUser.name, userRole: targetUser.role }
      );
      return { success: false, error: 'Incorrect password entered. Please try again.' };
    }

    // Login successful
    setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);
    safeSessionStorage.setItem('apex_erp_session', 'active');

    // Multi-company access check: Ensure current company is in user's allowed list!
    const isSuperAdmin = targetUser.role === 'Super Administrator';
    const canAccessCurrent = isSuperAdmin || (targetUser.allowedCompanyIds && targetUser.allowedCompanyIds.includes(currentCompanyId));
    if (!canAccessCurrent && targetUser.allowedCompanyIds && targetUser.allowedCompanyIds.length > 0) {
      setCurrentCompanyId(targetUser.allowedCompanyIds[0]);
    }

    logAudit(
      'LOGIN_SUCCESS',
      'Auth',
      `User ${targetUser.name} (${targetUser.role}) logged in successfully with password verification`,
      { severity: 'info', entityType: 'security', userId: targetUser.id, userName: targetUser.name, userRole: targetUser.role }
    );

    return { success: true };
  };

  const logout = () => {
    safeSessionStorage.removeItem('apex_erp_session');
    setIsAuthenticated(false);
    logAudit('LOGOUT', 'Auth', `User ${currentUser?.name || 'User'} signed out of session`, {
      severity: 'info',
      entityType: 'security',
    });
  };

  const lockSession = () => {
    safeSessionStorage.removeItem('apex_erp_session');
    setIsAuthenticated(false);
  };

  const resetUserPassword = (identifier: string, newPass: string): { success: boolean; error?: string; user?: User } => {
    const cleanId = identifier.trim().toLowerCase();
    const target = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.name.toLowerCase() === cleanId ||
        u.phone.replace(/[\s-]/g, '') === cleanId.replace(/[\s-]/g, '')
    );

    if (!target) {
      return { success: false, error: 'No user account found matching this identifier.' };
    }

    if (!newPass || newPass.trim().length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const updatedUser: User = {
      ...target,
      password: newPass.trim(),
    };

    setUsers((prev) => prev.map((u) => (u.id === target.id ? updatedUser : u)));

    logAudit(
      'PASSWORD_RESET',
      'Auth',
      `Password successfully reset for user "${target.name}" (${target.email})`,
      { severity: 'info', entityType: 'security', userId: target.id, userName: target.name, userRole: target.role }
    );

    return { success: true, user: updatedUser };
  };

  const registerCompany = (input: RegisterCompanyInput): { success: boolean; error?: string; company?: Company; user?: User } => {
    try {
      if (!input.companyName?.trim()) {
        return { success: false, error: 'Company Name is required.' };
      }

      const cleanCompName = input.companyName.trim();
      const cleanCode = (input.code?.trim() || cleanCompName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()) || 'CMP';
      const effectiveAdminEmail = (input.adminEmail?.trim() || currentUser?.email || 'info.rahman1@gmail.com').toLowerCase();
      const effectiveAdminName = input.adminName?.trim() || currentUser?.name || 'Mahmudur Rahman';
      const effectivePassword = input.adminPassword && input.adminPassword.length >= 4 ? input.adminPassword : 'admin123';

      // Check if user email already exists
      const existingUser = users.find((u) => u.email.toLowerCase() === effectiveAdminEmail);

      const compId = `comp_${Date.now()}`;
      const branchId = `branch_${Date.now()}_main`;
      const godownId = `godown_${Date.now()}_main`;
      const userId = `user_${Date.now()}`;
      const baseCur = input.baseCurrency || 'BDT';
      const curSymbol = input.currencySymbol || (baseCur === 'USD' ? '$' : baseCur === 'EUR' ? '€' : baseCur === 'GBP' ? '£' : '৳');

      const newBranch: Branch = {
        id: branchId,
        companyId: compId,
        name: 'Head Office & Central Branch',
        code: `${cleanCode}-01`,
        phone: input.phone || '+880 1700-000000',
        address: input.address || 'Central Business District',
        isMain: true,
      };

      const newCompany: Company = {
        id: compId,
        name: input.companyName.trim(),
        code: cleanCode,
        tradeLicense: input.tradeLicense || 'TRAD/REG/2026/001',
        tin: input.tin || '000000000000',
        address: input.address || 'Head Office Address',
        phone: input.phone || '+880 1700-000000',
        email: input.email?.trim() || effectiveAdminEmail,
        branches: [newBranch],
        settings: {
          currency: baseCur,
          currencySymbol: curSymbol,
          baseCurrency: baseCur,
          currencies: defaultCurrencies.map((c) => (c.code === baseCur ? { ...c, isBase: true, rateToBase: 1.0 } : c)),
          dateFormat: 'DD/MM/YYYY',
          defaultVatPercent: 5.0,
          financialYearStart: '2026-01-01',
          budgetSettings: {
            enforceBudgetLimits: false,
            warningThreshold: 80,
            autoNotifyExceeded: true,
            defaultPeriod: 'quarterly',
          },
          voucherColors: currentCompany?.settings?.voucherColors || {
            payment: '#DC2626',
            receipt: '#16A34A',
            contra: '#2563EB',
            journal: '#9333EA',
            sales: '#EA580C',
            purchase: '#0D9488',
            debit_note: '#C2410C',
            credit_note: '#4F46E5',
            sales_return: '#DB2777',
            purchase_return: '#78350F',
          },
          voucherPrefixes: currentCompany?.settings?.voucherPrefixes || {
            payment: 'PV',
            receipt: 'RV',
            contra: 'CV',
            journal: 'JV',
            sales: 'SV',
            purchase: 'PV-B',
            debit_note: 'DN',
            credit_note: 'CN',
            sales_return: 'SR',
            purchase_return: 'PR',
          },
          allowNegativeStock: false,
          autoPostLedgers: true,
        },
      };

      // Create Standard Chart of Accounts with Opening Balances
      const openingCash = Number(input.openingCash) || 0;
      const openingBank = Number(input.openingBank) || 0;
      const totalOpeningFunds = openingCash + openingBank;

      const accCashId = `acc_${compId}_cash`;
      const accBankId = `acc_${compId}_bank`;
      const accArId = `acc_${compId}_ar`;
      const accInvId = `acc_${compId}_inv`;
      const accApId = `acc_${compId}_ap`;
      const accTaxId = `acc_${compId}_tax`;
      const accCapId = `acc_${compId}_cap`;
      const accSalesId = `acc_${compId}_sales`;
      const accCogsId = `acc_${compId}_cogs`;
      const accExpId = `acc_${compId}_exp`;

      // Set openingBalance to 0 because initialVoucher establishes the double-entry opening ledger entry,
      // preventing double-counting in computeAccountBalances.
      const newAccounts: Account[] = [
        {
          id: accCashId,
          companyId: compId,
          code: '1010',
          name: 'Cash in Hand (Main Drawer)',
          nameBn: 'নগদ তহবিল',
          type: 'asset',
          subType: 'cash',
          openingBalance: 0,
          currentBalance: openingCash,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accBankId,
          companyId: compId,
          code: '1020',
          name: input.bankName ? `${input.bankName} ${input.bankAccountNo ? `(A/C ${input.bankAccountNo})` : ''}` : 'Primary Operating Bank A/C',
          nameBn: 'ব্যাংক হিসাব',
          type: 'asset',
          subType: 'bank',
          openingBalance: 0,
          currentBalance: openingBank,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accArId,
          companyId: compId,
          code: '1030',
          name: 'Accounts Receivable (Trade Debtors)',
          nameBn: 'প্রাপ্য হিসাব',
          type: 'asset',
          subType: 'receivable',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accInvId,
          companyId: compId,
          code: '1040',
          name: 'Merchandise Stock & Inventory Asset',
          nameBn: 'মজুদ পণ্য সম্পদ',
          type: 'asset',
          subType: 'inventory',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accApId,
          companyId: compId,
          code: '2010',
          name: 'Accounts Payable (Trade Creditors)',
          nameBn: 'প্রদেয় হিসাব',
          type: 'liability',
          subType: 'payable',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accTaxId,
          companyId: compId,
          code: '2020',
          name: 'VAT / Tax Payable Account',
          nameBn: 'ভ্যাট প্রদেয় হিসাব',
          type: 'liability',
          subType: 'tax_payable',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accCapId,
          companyId: compId,
          code: '3010',
          name: "Owner's Equity Capital",
          nameBn: 'মালিকানা মূলধন',
          type: 'equity',
          subType: 'equity_capital',
          openingBalance: 0,
          currentBalance: totalOpeningFunds,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accSalesId,
          companyId: compId,
          code: '4010',
          name: 'Sales Revenue',
          nameBn: 'বিক্রয় আয়',
          type: 'revenue',
          subType: 'sales_revenue',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accCogsId,
          companyId: compId,
          code: '5010',
          name: 'Cost of Goods Sold',
          nameBn: 'বিক্রিত পণ্যের ব্যয়',
          type: 'expense',
          subType: 'cost_of_sales',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
        {
          id: accExpId,
          companyId: compId,
          code: '5020',
          name: 'General & Administrative Expenses',
          nameBn: 'সাধারণ ও পরিচালন ব্যয়',
          type: 'expense',
          subType: 'operating_expense',
          openingBalance: 0,
          currentBalance: 0,
          currency: baseCur,
          isSystem: true,
        },
      ];

      // Default Godown
      const newGodown: Godown = {
        id: godownId,
        companyId: compId,
        branchId: branchId,
        name: 'Main Central Godown',
        code: 'GDW-01',
        location: input.address || 'Central Facility',
        manager: effectiveAdminName,
        phone: input.phone || '+880 1700-000000',
        capacity: '5000 m³',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // If initial funds exist, create opening balance journal voucher
      let initialVoucher: Voucher | null = null;
      if (totalOpeningFunds > 0) {
        const entries = [];
        if (openingCash > 0) {
          entries.push({
            id: `ve_${Date.now()}_1`,
            accountId: accCashId,
            accountName: 'Cash in Hand (Main Drawer)',
            accountCode: '1010',
            debit: openingCash,
            credit: 0,
            partyType: 'none' as const,
            partyId: '',
            partyName: '',
            description: 'Initial Opening Cash Fund',
          });
        }
        if (openingBank > 0) {
          entries.push({
            id: `ve_${Date.now()}_2`,
            accountId: accBankId,
            accountName: input.bankName || 'Primary Operating Bank A/C',
            accountCode: '1020',
            debit: openingBank,
            credit: 0,
            partyType: 'none' as const,
            partyId: '',
            partyName: '',
            description: `Initial Opening Bank Fund (${input.bankAccountNo || 'Operating'})`,
          });
        }
        entries.push({
          id: `ve_${Date.now()}_3`,
          accountId: accCapId,
          accountName: "Owner's Equity Capital",
          accountCode: '3010',
          debit: 0,
          credit: totalOpeningFunds,
          partyType: 'none' as const,
          partyId: '',
          partyName: '',
          description: "Owner's initial subscribed opening funds & paid-in capital",
        });

        initialVoucher = {
          id: `vch_${Date.now()}_ob`,
          companyId: compId,
          branchId: branchId,
          voucherNo: 'OB-0001',
          type: 'journal',
          date: new Date().toISOString().split('T')[0],
          narration: `Company registration opening liquid funds balance for ${newCompany.name}`,
          refNo: 'REG-CAPITAL-01',
          entries,
          totalDebit: totalOpeningFunds,
          totalCredit: totalOpeningFunds,
          status: 'posted',
          createdBy: effectiveAdminName,
          createdAt: new Date().toISOString(),
        };
      }

      // Determine active admin user: Link to existing user if found, or create new user
      let activeUser: User;
      if (existingUser) {
        activeUser = {
          ...existingUser,
          allowedCompanyIds: Array.from(new Set([...(existingUser.allowedCompanyIds || []), compId])),
          allowedBranchIds: Array.from(new Set([...(existingUser.allowedBranchIds || []), branchId, 'all'])),
          allowedModules: existingUser.allowedModules || [
            'dashboard', 'flowchart', 'vouchers', 'inventory', 'sales', 'purchases',
            'customers', 'suppliers', 'accounting', 'budgets', 'reports', 'analytics', 'settings'
          ],
          password: input.adminPassword && input.adminPassword.length >= 4 ? input.adminPassword : existingUser.password || 'admin123',
        };
      } else {
        activeUser = {
          id: userId,
          name: effectiveAdminName,
          email: effectiveAdminEmail,
          phone: input.adminPhone || input.phone || '+880 1711-998877',
          password: effectivePassword,
          role: 'Super Administrator',
          allowedCompanyIds: [compId],
          allowedBranchIds: [branchId, 'all'],
          allowedModules: [
            'dashboard', 'flowchart', 'vouchers', 'inventory', 'sales', 'purchases',
            'customers', 'suppliers', 'accounting', 'budgets', 'reports', 'analytics', 'settings'
          ],
          status: 'active',
        };
      }

      // Also ensure current active user has access if different
      const currentActiveUserId = currentUser?.id;

      // Commit to state
      setCompanies((prev) => [...prev, newCompany]);
      setAccounts((prev) => [...prev, ...newAccounts]);
      setGodowns((prev) => [...prev, newGodown]);
      setUsers((prev) => {
        const exists = prev.some((u) => u.id === activeUser.id);
        let updatedList = exists
          ? prev.map((u) => (u.id === activeUser.id ? activeUser : u))
          : [...prev, activeUser];

        // If current logged-in user is different from activeUser, also grant them access
        if (currentActiveUserId && currentActiveUserId !== activeUser.id) {
          updatedList = updatedList.map((u) =>
            u.id === currentActiveUserId
              ? {
                  ...u,
                  allowedCompanyIds: Array.from(new Set([...(u.allowedCompanyIds || []), compId])),
                  allowedBranchIds: Array.from(new Set([...(u.allowedBranchIds || []), branchId, 'all'])),
                }
              : u
          );
        }
        return updatedList;
      });

      if (initialVoucher) {
        setVouchers((prev) => [initialVoucher!, ...prev]);
      }

      // Switch context IMMEDIATELY to newly registered company and active branch
      setCurrentCompanyId(compId);
      setCurrentBranchId(branchId);
      setCurrentUserId(activeUser.id);
      setIsAuthenticated(true);
      safeSessionStorage.setItem('apex_erp_session', 'active');
      setActiveTab('dashboard');

      logAudit(
        'COMPANY_REGISTERED',
        'Company',
        `Registered new company "${newCompany.name}" (${cleanCode}) under admin "${activeUser.name}". Opening Funds: Cash ${openingCash}, Bank ${openingBank}`,
        { entityId: compId, entityType: 'settings', severity: 'info', userId: activeUser.id, userName: activeUser.name }
      );

      return { success: true, company: newCompany, user: activeUser };
    } catch (err) {
      console.error('Registration exception:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Company registration encountered an error.' };
    }
  };

  // Company Switching with strict RBAC security enforcement
  const switchCompany = (companyId: string): boolean => {
    const isSuperAdmin = currentUser.role === 'Super Administrator';
    const isAllowed = isSuperAdmin || (currentUser.allowedCompanyIds && currentUser.allowedCompanyIds.includes(companyId));

    if (!isAllowed) {
      logAudit(
        'UNAUTHORIZED_COMPANY_ACCESS_DENIED',
        'Security',
        `SECURITY VIOLATION: User ${currentUser.name} (${currentUser.role}) attempted to access unauthorized company ${companyId}`,
        { severity: 'critical', entityType: 'security' }
      );
      return false;
    }

    const comp = companies.find((c) => c.id === companyId);
    if (comp) {
      setCurrentCompanyId(companyId);
      const validBranch = comp.branches.find((b) => currentUser.allowedBranchIds?.includes(b.id)) || comp.branches[0];
      setCurrentBranchId(validBranch?.id || 'all');
      logAudit('SWITCH_COMPANY', 'Navigation', `Switched company context to ${comp.name}`);
      return true;
    }
    return false;
  };

  const switchBranch = (branchId: string) => {
    setCurrentBranchId(branchId);
  };

  const switchUser = (userId: string) => {
    const u = users.find((item) => item.id === userId);
    if (u) {
      setCurrentUserId(userId);
      // Auto-switch company if new user doesn't have access to current company
      if (u.role !== 'Super Administrator' && u.allowedCompanyIds && !u.allowedCompanyIds.includes(currentCompanyId)) {
        if (u.allowedCompanyIds.length > 0) {
          setCurrentCompanyId(u.allowedCompanyIds[0]);
        }
      }
      logAudit('SWITCH_USER', 'Auth', `Switched active user context to ${u.name} (${u.role})`);
    }
  };

  const updateUserPermissions = (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          ...data,
        };
      })
    );

    logAudit(
      'UPDATE_USER_PERMISSIONS',
      'Settings',
      `Updated company & module access permissions for user ${userId}`,
      {
        entityId: userId,
        entityType: 'settings',
        severity: 'info',
        newValue: JSON.stringify(data),
      }
    );
  };

  // Global Currency Management & Automated Exchange Rate Conversion
  const updateCurrencies = (newCurrencies: CurrencyRate[], baseCurrency?: string) => {
    const base = baseCurrency || currentCompany.settings.baseCurrency || 'BDT';
    const baseCur = newCurrencies.find((c) => c.code === base) || newCurrencies[0];

    updateCompanySettings({
      currencies: newCurrencies,
      baseCurrency: base,
      currency: baseCur?.code || 'BDT',
      currencySymbol: baseCur?.symbol || '৳',
    });

    logAudit(
      'UPDATE_CURRENCIES',
      'Settings',
      `Updated global currency settings with Base Currency: ${base} and ${newCurrencies.length} transaction currencies`,
      { entityType: 'settings', severity: 'info' }
    );
  };

  const convertCurrency = (amount: number, fromCode: string, toCode: string): number => {
    if (fromCode === toCode || !amount) return amount;
    const currencyList = currentCompany.settings.currencies || defaultCurrencies;
    const fromCur = currencyList.find((c) => c.code.toUpperCase() === fromCode.toUpperCase()) || { rateToBase: 1 };
    const toCur = currencyList.find((c) => c.code.toUpperCase() === toCode.toUpperCase()) || { rateToBase: 1 };

    // Amount in base currency = amount * fromCur.rateToBase
    // Target amount = amountInBase / toCur.rateToBase
    const amountInBase = amount * fromCur.rateToBase;
    const targetAmount = amountInBase / toCur.rateToBase;
    return Number(targetAmount.toFixed(2));
  };

  const logAudit = (action: string, module: string, details: string, meta?: Partial<AuditLog>) => {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('en-US', { hour12: false }),
      companyId: currentCompanyId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      details,
      severity: meta?.severity || 'info',
      ...meta,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };


  // Helper to generate voucher number
  const generateVoucherNumber = (type: VoucherTypeCode): string => {
    const prefix = currentCompany.settings?.voucherPrefixes?.[type] || type.toUpperCase().substring(0, 2);
    const year = new Date().getFullYear();
    const count = vouchers.filter((v) => v.companyId === currentCompanyId && v.type === type).length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  // Create Voucher with Double-Entry Balance Verification
  const createVoucher = (voucherData: Partial<Voucher>) => {
    if (!voucherData.entries || voucherData.entries.length < 2) {
      return { success: false, error: 'A voucher must contain at least 2 entry lines.' };
    }

    const val = validateJournalBalance(voucherData.entries);
    if (!val.isValid) {
      return {
        success: false,
        error: `Journal does not balance. Total Debit: ৳${val.totalDebit.toLocaleString()}, Total Credit: ৳${val.totalCredit.toLocaleString()}, Difference: ৳${val.difference.toLocaleString()}`,
      };
    }

    const type = voucherData.type || 'journal';
    const newVoucher: Voucher = {
      id: `v_${Date.now()}`,
      voucherNo: voucherData.voucherNo || generateVoucherNumber(type),
      type,
      date: voucherData.date || new Date().toISOString().split('T')[0],
      companyId: currentCompanyId,
      branchId: currentBranchId === 'all' ? branches[0]?.id || '' : currentBranchId,
      entries: voucherData.entries,
      totalDebit: val.totalDebit,
      totalCredit: val.totalCredit,
      narration: voucherData.narration || 'General accounting voucher',
      refNo: voucherData.refNo || '',
      partyType: voucherData.partyType || 'none',
      partyId: voucherData.partyId,
      partyName: voucherData.partyName,
      status: 'posted',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    setVouchers((prev) => [newVoucher, ...prev]);

    // Update account balances
    setAccounts((prev) =>
      prev.map((acc) => {
        const foundEntries = newVoucher.entries.filter((e) => e.accountId === acc.id);
        if (foundEntries.length === 0) return acc;

        const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';
        let delta = 0;
        foundEntries.forEach((e) => {
          if (isDebitNormal) {
            delta += e.debit - e.credit;
          } else {
            delta += e.credit - e.debit;
          }
        });

        return {
          ...acc,
          currentBalance: Number((acc.currentBalance + delta).toFixed(2)),
        };
      })
    );

    logAudit(
      'CREATE_VOUCHER',
      'Vouchers',
      `Posted ${newVoucher.type.toUpperCase()} Voucher #${newVoucher.voucherNo} for ৳${newVoucher.totalDebit.toLocaleString()}`
    );

    return { success: true, voucher: newVoucher };
  };

  const reverseVoucher = (voucherId: string, reason: string) => {
    const existing = vouchers.find((v) => v.id === voucherId);
    if (!existing) return { success: false, error: 'Voucher not found' };

    // Reverse entries
    const reversedEntries = existing.entries.map((e) => ({
      ...e,
      id: `ve_rev_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      debit: e.credit,
      credit: e.debit,
      description: `Reversal of #${existing.voucherNo}: ${reason}`,
    }));

    const result = createVoucher({
      type: 'journal',
      voucherNo: `REV-${existing.voucherNo}`,
      date: new Date().toISOString().split('T')[0],
      entries: reversedEntries,
      narration: `Reversal of voucher #${existing.voucherNo}. Reason: ${reason}`,
      refNo: `REV-${existing.voucherNo}`,
    });

    if (result.success) {
      setVouchers((prev) =>
        prev.map((v) => (v.id === voucherId ? { ...v, status: 'cancelled' } : v))
      );
      logAudit(
        'REVERSE_VOUCHER',
        'Vouchers',
        `Reversed voucher #${existing.voucherNo}. Reason: ${reason}`,
        { entityId: existing.id, entityType: 'voucher', severity: 'warning' }
      );
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const updateVoucher = (voucherId: string, updates: Partial<Voucher>) => {
    const existing = vouchers.find((v) => v.id === voucherId);
    if (!existing) return { success: false, error: 'Voucher not found' };

    let newEntries = updates.entries ? [...updates.entries] : existing.entries;
    let totalDebit = existing.totalDebit;
    let totalCredit = existing.totalCredit;

    if (updates.entries) {
      const val = validateJournalBalance(updates.entries);
      if (!val.isValid) {
        return {
          success: false,
          error: `Double-entry imbalance: Total Debit (৳${val.totalDebit.toLocaleString()}) does not match Total Credit (৳${val.totalCredit.toLocaleString()})`,
        };
      }
      totalDebit = val.totalDebit;
      totalCredit = val.totalCredit;

      // If voucher was posted, recalculate ledger balances: back out old entries and apply new entries
      if (existing.status === 'posted') {
        setAccounts((prev) =>
          prev.map((acc) => {
            const oldEntries = existing.entries.filter((e) => e.accountId === acc.id);
            const updatedEntries = updates.entries!.filter((e) => e.accountId === acc.id);
            if (oldEntries.length === 0 && updatedEntries.length === 0) return acc;

            const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';
            let delta = 0;
            // Reverse old entries
            oldEntries.forEach((e) => {
              if (isDebitNormal) {
                delta -= e.debit - e.credit;
              } else {
                delta -= e.credit - e.debit;
              }
            });
            // Apply new altered entries
            updatedEntries.forEach((e) => {
              if (isDebitNormal) {
                delta += e.debit - e.credit;
              } else {
                delta += e.credit - e.debit;
              }
            });

            return {
              ...acc,
              currentBalance: Number((acc.currentBalance + delta).toFixed(2)),
            };
          })
        );
      }
    }

    const alteredVoucher: Voucher = {
      ...existing,
      ...updates,
      entries: newEntries,
      totalDebit,
      totalCredit,
    };

    setVouchers((prev) =>
      prev.map((v) => (v.id === voucherId ? alteredVoucher : v))
    );

    logAudit(
      'ALTER_VOUCHER',
      'Vouchers',
      `Altered voucher #${existing.voucherNo} (${existing.type.toUpperCase()}). Narration: "${alteredVoucher.narration}", Debit Total: ৳${totalDebit.toLocaleString()}`,
      {
        entityId: existing.id,
        entityType: 'voucher',
        severity: 'info',
        oldValue: JSON.stringify({
          type: existing.type,
          date: existing.date,
          totalDebit: existing.totalDebit,
          entriesCount: existing.entries.length,
        }),
        newValue: JSON.stringify({
          type: alteredVoucher.type,
          date: alteredVoucher.date,
          totalDebit: alteredVoucher.totalDebit,
          entriesCount: alteredVoucher.entries.length,
        }),
      }
    );

    return { success: true };
  };

  const deleteVoucher = (voucherId: string, reason = 'Voided / Deleted by administrator') => {
    const existing = vouchers.find((v) => v.id === voucherId);
    if (!existing) return { success: false, error: 'Voucher not found' };

    // Reverse entries from account balances if it was posted
    if (existing.status === 'posted') {
      setAccounts((prev) =>
        prev.map((acc) => {
          const foundEntries = existing.entries.filter((e) => e.accountId === acc.id);
          if (foundEntries.length === 0) return acc;

          const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';
          let delta = 0;
          foundEntries.forEach((e) => {
            if (isDebitNormal) {
              delta -= e.debit - e.credit;
            } else {
              delta -= e.credit - e.debit;
            }
          });

          return {
            ...acc,
            currentBalance: Number((acc.currentBalance + delta).toFixed(2)),
          };
        })
      );
    }

    setVouchers((prev) => prev.filter((v) => v.id !== voucherId));

    logAudit(
      'DELETE_VOUCHER',
      'Vouchers',
      `Deleted & removed voucher #${existing.voucherNo} (${existing.type.toUpperCase()}) for ৳${existing.totalDebit.toLocaleString()}. Reason: ${reason}`,
      {
        entityId: existing.id,
        entityType: 'voucher',
        severity: 'warning',
        oldValue: `Voucher #${existing.voucherNo}, Amount: ৳${existing.totalDebit}, Narration: ${existing.narration}`,
      }
    );

    return { success: true };
  };

  // Add, Alter, and Delete Ledger (Account Heads)
  const addAccount = (accountData: Partial<Account>) => {
    if (!accountData.name || !accountData.code) {
      return { success: false, error: 'Ledger Code and Name are required' };
    }
    const codeExists = accounts.some(
      (a) => a.companyId === currentCompanyId && a.code.toLowerCase() === accountData.code!.trim().toLowerCase()
    );
    if (codeExists) {
      return { success: false, error: `Ledger with code "${accountData.code}" already exists in this company` };
    }

    const openBal = Number(accountData.openingBalance || 0);
    const newAcc: Account = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      companyId: currentCompanyId,
      code: accountData.code.trim(),
      name: accountData.name.trim(),
      nameBn: accountData.nameBn?.trim() || '',
      type: accountData.type || 'asset',
      subType: accountData.subType || 'cash',
      openingBalance: openBal,
      currentBalance: openBal,
      currency: accountData.currency || currentCompany?.settings?.currency || 'BDT',
      isSystem: false,
    };

    setAccounts((prev) => [...prev, newAcc]);

    logAudit(
      'CREATE_LEDGER',
      'Accounting',
      `Created new ledger head "${newAcc.name}" (${newAcc.code}) under ${newAcc.type.toUpperCase()}`,
      { entityId: newAcc.id, entityType: 'account', severity: 'info' }
    );

    return { success: true, account: newAcc };
  };

  const updateAccount = (accountId: string, updates: Partial<Account>) => {
    const existing = accounts.find((a) => a.id === accountId);
    if (!existing) return { success: false, error: 'Ledger account not found' };

    if (updates.code && updates.code.trim().toLowerCase() !== existing.code.toLowerCase()) {
      const codeExists = accounts.some(
        (a) => a.id !== accountId && a.companyId === currentCompanyId && a.code.toLowerCase() === updates.code!.trim().toLowerCase()
      );
      if (codeExists) {
        return { success: false, error: `Ledger code "${updates.code}" is already assigned to another account` };
      }
    }

    const oldName = existing.name;
    const oldCode = existing.code;

    // If openingBalance changed, recalculate currentBalance by the delta
    let newCurrentBalance = existing.currentBalance;
    if (updates.openingBalance !== undefined && updates.openingBalance !== existing.openingBalance) {
      const openDiff = Number(updates.openingBalance) - existing.openingBalance;
      newCurrentBalance = Number((existing.currentBalance + openDiff).toFixed(2));
    }

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? {
              ...a,
              ...updates,
              currentBalance: newCurrentBalance,
              code: updates.code ? updates.code.trim() : a.code,
              name: updates.name ? updates.name.trim() : a.name,
            }
          : a
      )
    );

    // Sync renamed account name across existing voucher entries
    if (updates.name && updates.name.trim() !== oldName) {
      const cleanNewName = updates.name.trim();
      setVouchers((prev) =>
        prev.map((v) => ({
          ...v,
          entries: v.entries.map((e) =>
            e.accountId === accountId ? { ...e, accountName: cleanNewName } : e
          ),
        }))
      );
    }

    logAudit(
      'ALTER_LEDGER',
      'Accounting',
      `Altered ledger "${oldName}" (${oldCode}) -> "${updates.name || oldName}" (${updates.code || oldCode})`,
      {
        entityId: accountId,
        entityType: 'account',
        severity: 'info',
        oldValue: JSON.stringify({ name: oldName, code: oldCode, type: existing.type }),
        newValue: JSON.stringify({ name: updates.name || oldName, code: updates.code || oldCode, type: updates.type || existing.type }),
      }
    );

    return { success: true };
  };

  const deleteAccount = (accountId: string, reason = 'Deleted by administrator') => {
    const existing = accounts.find((a) => a.id === accountId);
    if (!existing) return { success: false, error: 'Ledger account not found' };

    if (existing.isSystem) {
      return { success: false, error: 'System standard account head cannot be deleted.' };
    }

    // Check if account has vouchers referencing it
    const voucherUsageCount = vouchers.filter((v) =>
      v.entries.some((e) => e.accountId === accountId)
    ).length;

    if (voucherUsageCount > 0) {
      return {
        success: false,
        error: `Cannot delete ledger "${existing.name}" (${existing.code}) because it is used in ${voucherUsageCount} existing voucher(s). Please alter or reassign those vouchers first.`,
      };
    }

    setAccounts((prev) => prev.filter((a) => a.id !== accountId));

    logAudit(
      'DELETE_LEDGER',
      'Accounting',
      `Deleted ledger head "${existing.name}" (${existing.code}). Reason: ${reason}`,
      {
        entityId: accountId,
        entityType: 'account',
        severity: 'warning',
        oldValue: `Ledger: ${existing.name} (${existing.code}), Current Balance: ৳${existing.currentBalance}`,
      }
    );

    return { success: true };
  };


  // Create Sale with automatic inventory deduction and balanced voucher posting
  const createSale = (saleData: Partial<Sale>) => {
    if (!saleData.items || saleData.items.length === 0) {
      return { success: false, error: 'Sale must contain at least one product.' };
    }

    const branchId = currentBranchId === 'all' ? branches[0]?.id || '' : currentBranchId;
    const count = sales.filter((s) => s.companyId === currentCompanyId).length + 1;
    const invoiceNo = saleData.invoiceNo || `INV-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;

    const subtotal = saleData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = saleData.discount || 0;
    const vatPercent = saleData.vatPercent ?? (currentCompany.settings.defaultVatPercent || 0);
    const taxableBase = Math.max(0, subtotal - discount);
    const vatAmount = Number(((taxableBase * vatPercent) / 100).toFixed(2));
    const grandTotal = Number((taxableBase + vatAmount).toFixed(2));
    const paidAmount = saleData.paidAmount !== undefined ? saleData.paidAmount : grandTotal;
    const dueAmount = Number(Math.max(0, grandTotal - paidAmount).toFixed(2));

    // Automated Currency & Exchange Rate Resolution
    const curList = currentCompany.settings.currencies || defaultCurrencies;
    const baseCurrencyCode = currentCompany.settings.baseCurrency || currentCompany.settings.currency || 'BDT';
    const currency = saleData.currency || baseCurrencyCode;
    const curObj = curList.find((c) => c.code === currency) || { rateToBase: 1 };
    const exchangeRate = saleData.exchangeRate !== undefined ? Number(saleData.exchangeRate) : curObj.rateToBase || 1;
    const baseCurrencyTotal = Number((grandTotal * exchangeRate).toFixed(2));
    const basePaidAmount = Number((paidAmount * exchangeRate).toFixed(2));
    const baseDueAmount = Number((dueAmount * exchangeRate).toFixed(2));
    const baseTaxable = Number((taxableBase * exchangeRate).toFixed(2));
    const baseVatAmount = Number((vatAmount * exchangeRate).toFixed(2));

    const defaultCompanyGodown = godowns.find((g) => g.companyId === currentCompanyId)?.id || 'godown_dhaka_main';
    const saleHeaderGodown = saleData.godownId || defaultCompanyGodown;
    const saleHeaderGodownObj = godowns.find((g) => g.id === saleHeaderGodown);

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      invoiceNo,
      date: saleData.date || new Date().toISOString().split('T')[0],
      companyId: currentCompanyId,
      branchId,
      godownId: saleHeaderGodown,
      godownName: saleData.godownName || (saleHeaderGodownObj ? saleHeaderGodownObj.name : undefined),
      customerId: saleData.customerId || 'cust_4',
      customerName: saleData.customerName || 'Cash / Counter Customer',
      customerPhone: saleData.customerPhone || '',
      items: saleData.items.map((it) => {
        const itemGdnId = it.godownId || saleHeaderGodown;
        const gdn = godowns.find((g) => g.id === itemGdnId);
        return {
          ...it,
          godownId: itemGdnId,
          godownName: it.godownName || (gdn ? gdn.name : undefined),
        };
      }),
      subtotal,
      discount,
      vatPercent,
      vatAmount,
      grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod: saleData.paymentMethod || 'cash',
      status: 'completed',
      salesperson: currentUser.name,
      createdAt: new Date().toISOString(),
      currency,
      exchangeRate,
      baseCurrencyTotal,
    };

    // Deduct stock from both branchStock and godownStock
    setProducts((prev) =>
      prev.map((p) => {
        const saleItem = newSale.items.find((i) => i.productId === p.id);
        if (!saleItem) return p;
        const currentQty = p.branchStock[branchId] || 0;
        const targetGodownId = saleItem.godownId || newSale.godownId || p.defaultGodownId || defaultCompanyGodown;
        const currentGodownQty = p.godownStock?.[targetGodownId] ?? currentQty;
        return {
          ...p,
          branchStock: {
            ...p.branchStock,
            [branchId]: Math.max(0, currentQty - saleItem.quantity),
          },
          godownStock: {
            ...(p.godownStock || {}),
            [targetGodownId]: Math.max(0, currentGodownQty - saleItem.quantity),
          },
        };
      })
    );

    newSale.items.forEach((item) => {
      const gdn = godowns.find((g) => g.id === (item.godownId || newSale.godownId));
      const movement: StockMovement = {
        id: `sm_${Date.now()}_${item.productId}`,
        date: newSale.date,
        companyId: currentCompanyId,
        branchId,
        productId: item.productId,
        productName: item.productName,
        type: 'sale',
        quantity: -item.quantity,
        godownId: item.godownId || newSale.godownId,
        godownName: item.godownName || (gdn ? gdn.name : undefined),
        refNo: newSale.invoiceNo,
        note: `Sold via Invoice #${newSale.invoiceNo}${gdn ? ` from Godown: ${gdn.name}` : ''}`,
        createdBy: currentUser.name,
      };
      setStockMovements((prev) => [movement, ...prev]);
    });

    // Update customer due balance if credit sale (recorded in base currency)
    if (dueAmount > 0 && newSale.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newSale.customerId ? { ...c, currentBalance: Number((c.currentBalance + baseDueAmount).toFixed(2)) } : c
        )
      );
    }

    // Post Double-Entry Sales Voucher consolidated in Company Base Currency
    // Accounts: Cash/Bank (Dr paid), AR (Dr due), Sales Revenue (Cr net), VAT Payable (Cr vat)
    const cashAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'cash') || accounts[0];
    const bankAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'bank') || cashAcc;
    const paymentAccId = newSale.paymentMethod === 'bank' ? bankAcc.id : cashAcc.id;
    const paymentAccName = newSale.paymentMethod === 'bank' ? bankAcc.name : cashAcc.name;

    const arAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'receivable') || cashAcc;
    const salesAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'sales_revenue') || accounts[accounts.length - 1];
    const vatAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'tax_payable') || arAcc;

    const entries = [];
    if (basePaidAmount > 0) {
      entries.push({
        id: `ve_${Date.now()}_1`,
        accountId: paymentAccId,
        accountName: paymentAccName,
        debit: basePaidAmount,
        credit: 0,
        description: `Receipt for inv #${newSale.invoiceNo} (${currency} ${paidAmount.toFixed(2)} @ FX ${exchangeRate})`,
      });
    }
    if (baseDueAmount > 0) {
      entries.push({
        id: `ve_${Date.now()}_2`,
        accountId: arAcc.id,
        accountName: arAcc.name,
        debit: baseDueAmount,
        credit: 0,
        description: `Receivable from ${newSale.customerName} on inv #${newSale.invoiceNo} (${currency} ${dueAmount.toFixed(2)})`,
      });
    }

    entries.push({
      id: `ve_${Date.now()}_3`,
      accountId: salesAcc.id,
      accountName: salesAcc.name,
      debit: 0,
      credit: baseTaxable,
      description: `Sales revenue for #${newSale.invoiceNo} (${currency} ${taxableBase.toFixed(2)})`,
    });

    if (baseVatAmount > 0) {
      entries.push({
        id: `ve_${Date.now()}_4`,
        accountId: vatAcc.id,
        accountName: vatAcc.name,
        debit: 0,
        credit: baseVatAmount,
        description: `VAT collected at ${newSale.vatPercent}% for #${newSale.invoiceNo} (${currency} ${vatAmount.toFixed(2)})`,
      });
    }

    createVoucher({
      type: 'sales',
      voucherNo: `SV-${newSale.invoiceNo.replace('INV-', '')}`,
      date: newSale.date,
      entries,
      narration: `Sales Invoice #${newSale.invoiceNo} to ${newSale.customerName} (${currency} ${newSale.grandTotal.toFixed(2)}${currency !== baseCurrencyCode ? ` ≈ ${baseCurrencyCode} ${baseCurrencyTotal.toFixed(2)} @ FX ${exchangeRate}` : ''})`,
      refNo: newSale.invoiceNo,
      partyType: 'customer',
      partyId: newSale.customerId,
      partyName: newSale.customerName,
    });

    // Update matching sales target budgets
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.companyId === currentCompanyId && b.category === 'sales_target' && b.status === 'active') {
          return {
            ...b,
            actualAmount: Number((b.actualAmount + baseCurrencyTotal).toFixed(2)),
          };
        }
        return b;
      })
    );

    setSales((prev) => [newSale, ...prev]);
    logAudit(
      'CREATE_SALE',
      'Sales',
      `Created Invoice #${newSale.invoiceNo} for ${currency} ${newSale.grandTotal.toLocaleString()} (≈ ${baseCurrencyCode} ${baseCurrencyTotal.toLocaleString()})`,
      { entityId: newSale.id, entityType: 'sale', severity: 'info' }
    );

    return { success: true, sale: newSale };
  };

  const deleteSale = (saleId: string, reason = 'Invoice voided/cancelled by administrator') => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Sale invoice not found' };

    // 1. Restore product inventory back to the branch and godown
    setProducts((prev) =>
      prev.map((p) => {
        const item = sale.items.find((i) => i.productId === p.id);
        if (!item) return p;
        const currentQty = p.branchStock[sale.branchId] || 0;
        const targetGodownId = item.godownId || sale.godownId || p.defaultGodownId || (godowns.find((g) => g.companyId === currentCompanyId)?.id) || 'godown_dhaka_main';
        const currentGodownQty = p.godownStock?.[targetGodownId] || 0;
        return {
          ...p,
          branchStock: {
            ...p.branchStock,
            [sale.branchId]: currentQty + item.quantity,
          },
          godownStock: {
            ...(p.godownStock || {}),
            [targetGodownId]: currentGodownQty + item.quantity,
          },
        };
      })
    );

    // 2. Add compensating StockMovement records for the restoration
    sale.items.forEach((item) => {
      const gdn = godowns.find((g) => g.id === (item.godownId || sale.godownId));
      const movement: StockMovement = {
        id: `sm_void_${Date.now()}_${item.productId}`,
        date: new Date().toISOString().split('T')[0],
        companyId: currentCompanyId,
        branchId: sale.branchId,
        productId: item.productId,
        productName: item.productName,
        type: 'sales_return',
        quantity: item.quantity,
        godownId: item.godownId || sale.godownId,
        godownName: item.godownName || (gdn ? gdn.name : undefined),
        refNo: `VOID-${sale.invoiceNo}`,
        note: `Stock restored from deleted invoice #${sale.invoiceNo}${gdn ? ` to Godown: ${gdn.name}` : ''}. Reason: ${reason}`,
        createdBy: currentUser.name,
      };
      setStockMovements((prev) => [movement, ...prev]);
    });

    // 3. Revert customer due balance if any
    if (sale.dueAmount > 0 && sale.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId
            ? { ...c, currentBalance: Number(Math.max(0, c.currentBalance - sale.dueAmount).toFixed(2)) }
            : c
        )
      );
    }

    // 4. Cancel related sales voucher
    setVouchers((prev) =>
      prev.map((v) =>
        v.refNo === sale.invoiceNo || v.voucherNo === `SV-${sale.invoiceNo.replace('INV-', '')}`
          ? { ...v, status: 'cancelled' }
          : v
      )
    );

    // 5. Remove the sale from active list
    setSales((prev) => prev.filter((s) => s.id !== saleId));

    // 6. Log critical audit entry for sales deletion
    logAudit(
      'DELETE_SALE',
      'Sales',
      `Deleted & voided Invoice #${sale.invoiceNo} (৳${sale.grandTotal.toLocaleString()}). Reason: ${reason}. Restored ${sale.items.length} items to inventory.`,
      {
        entityId: sale.id,
        entityType: 'sale',
        severity: 'warning',
        oldValue: JSON.stringify({
          invoiceNo: sale.invoiceNo,
          customer: sale.customerName,
          grandTotal: sale.grandTotal,
          itemsCount: sale.items.length,
        }),
      }
    );

    return { success: true };
  };


  // Create Purchase with automatic inventory addition and balanced voucher posting
  const createPurchase = (purchaseData: Partial<Purchase>) => {
    if (!purchaseData.items || purchaseData.items.length === 0) {
      return { success: false, error: 'Purchase must contain at least one product.' };
    }

    const branchId = currentBranchId === 'all' ? branches[0]?.id || '' : currentBranchId;
    const count = purchases.filter((p) => p.companyId === currentCompanyId).length + 1;
    const billNo = purchaseData.billNo || `PUR-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;

    const subtotal = purchaseData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = purchaseData.discount || 0;
    const taxAmount = purchaseData.taxAmount || 0;
    const grandTotal = Math.max(0, subtotal - discount + taxAmount);
    const paidAmount = purchaseData.paidAmount !== undefined ? purchaseData.paidAmount : 0;
    const dueAmount = Math.max(0, grandTotal - paidAmount);

    // Automated Currency & Exchange Rate Resolution
    const curList = currentCompany.settings.currencies || defaultCurrencies;
    const baseCurrencyCode = currentCompany.settings.baseCurrency || currentCompany.settings.currency || 'BDT';
    const currency = purchaseData.currency || baseCurrencyCode;
    const curObj = curList.find((c) => c.code === currency) || { rateToBase: 1 };
    const exchangeRate = purchaseData.exchangeRate !== undefined ? Number(purchaseData.exchangeRate) : curObj.rateToBase || 1;
    const baseCurrencyTotal = Number((grandTotal * exchangeRate).toFixed(2));
    const basePaidAmount = Number((paidAmount * exchangeRate).toFixed(2));
    const baseDueAmount = Number((dueAmount * exchangeRate).toFixed(2));

    const defaultCompanyGodown = godowns.find((g) => g.companyId === currentCompanyId)?.id || 'godown_dhaka_main';
    const purchaseHeaderGodown = purchaseData.godownId || defaultCompanyGodown;
    const purchaseHeaderGodownObj = godowns.find((g) => g.id === purchaseHeaderGodown);

    const newPurchase: Purchase = {
      id: `purch_${Date.now()}`,
      billNo,
      date: purchaseData.date || new Date().toISOString().split('T')[0],
      companyId: currentCompanyId,
      branchId,
      godownId: purchaseHeaderGodown,
      godownName: purchaseData.godownName || (purchaseHeaderGodownObj ? purchaseHeaderGodownObj.name : undefined),
      supplierId: purchaseData.supplierId || 'supp_1',
      supplierName: purchaseData.supplierName || 'General Supplier',
      items: purchaseData.items.map((it) => {
        const itemGdnId = it.godownId || purchaseHeaderGodown;
        const gdn = godowns.find((g) => g.id === itemGdnId);
        return {
          ...it,
          godownId: itemGdnId,
          godownName: it.godownName || (gdn ? gdn.name : undefined),
        };
      }),
      subtotal,
      discount,
      taxAmount,
      grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod: purchaseData.paymentMethod || 'bank',
      status: 'received',
      createdAt: new Date().toISOString(),
      currency,
      exchangeRate,
      baseCurrencyTotal,
    };

    // Increase product stock (both branchStock and target godownStock)
    setProducts((prev) =>
      prev.map((p) => {
        const item = newPurchase.items.find((i) => i.productId === p.id);
        if (!item) return p;
        const currentQty = p.branchStock[branchId] || 0;
        const targetGodownId = item.godownId || newPurchase.godownId || p.defaultGodownId || defaultCompanyGodown;
        const currentGodownQty = p.godownStock?.[targetGodownId] || 0;
        return {
          ...p,
          branchStock: {
            ...p.branchStock,
            [branchId]: currentQty + item.quantity,
          },
          godownStock: {
            ...(p.godownStock || {}),
            [targetGodownId]: currentGodownQty + item.quantity,
          },
        };
      })
    );

    newPurchase.items.forEach((item) => {
      const gdn = godowns.find((g) => g.id === (item.godownId || newPurchase.godownId));
      const movement: StockMovement = {
        id: `sm_${Date.now()}_${item.productId}`,
        date: newPurchase.date,
        companyId: currentCompanyId,
        branchId,
        productId: item.productId,
        productName: item.productName,
        type: 'purchase',
        quantity: item.quantity,
        godownId: item.godownId || newPurchase.godownId,
        godownName: item.godownName || (gdn ? gdn.name : undefined),
        refNo: newPurchase.billNo,
        note: `Received from ${newPurchase.supplierName} (Bill #${newPurchase.billNo})${gdn ? ` into Godown: ${gdn.name}` : ''}`,
        createdBy: currentUser.name,
      };
      setStockMovements((prev) => [movement, ...prev]);
    });

    // Update supplier payable balance (recorded in base currency)
    if (dueAmount > 0 && newPurchase.supplierId) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === newPurchase.supplierId ? { ...s, currentBalance: Number((s.currentBalance + baseDueAmount).toFixed(2)) } : s
        )
      );
    }

    // Post Double-Entry Purchase Voucher:
    // Debit: Inventory Asset (baseCurrencyTotal)
    // Credit: Cash/Bank (basePaidAmount)
    // Credit: Accounts Payable (baseDueAmount)
    const invAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'inventory') || accounts[0];
    const apAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'payable') || accounts[1];
    const bankAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'bank') || accounts[0];
    const cashAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'cash') || accounts[0];
    const payAcc = newPurchase.paymentMethod === 'bank' ? bankAcc : cashAcc;

    const entries = [
      {
        id: `ve_${Date.now()}_p1`,
        accountId: invAcc.id,
        accountName: invAcc.name,
        debit: baseCurrencyTotal,
        credit: 0,
        description: `Inventory received from ${newPurchase.supplierName} (${currency} ${grandTotal.toFixed(2)} @ FX ${exchangeRate})`,
      },
    ];

    if (basePaidAmount > 0) {
      entries.push({
        id: `ve_${Date.now()}_p2`,
        accountId: payAcc.id,
        accountName: payAcc.name,
        debit: 0,
        credit: basePaidAmount,
        description: `Payment for bill #${newPurchase.billNo} via ${newPurchase.paymentMethod} (${currency} ${paidAmount.toFixed(2)})`,
      });
    }

    if (baseDueAmount > 0) {
      entries.push({
        id: `ve_${Date.now()}_p3`,
        accountId: apAcc.id,
        accountName: apAcc.name,
        debit: 0,
        credit: baseDueAmount,
        description: `Payable due to ${newPurchase.supplierName} for #${newPurchase.billNo} (${currency} ${dueAmount.toFixed(2)})`,
      });
    }

    createVoucher({
      type: 'purchase',
      voucherNo: `PV-B-${newPurchase.billNo.replace('PUR-', '')}`,
      date: newPurchase.date,
      entries,
      narration: `Purchase Bill #${newPurchase.billNo} from ${newPurchase.supplierName} (${currency} ${newPurchase.grandTotal.toFixed(2)}${currency !== baseCurrencyCode ? ` ≈ ${baseCurrencyCode} ${baseCurrencyTotal.toFixed(2)} @ FX ${exchangeRate}` : ''})`,
      refNo: newPurchase.billNo,
      partyType: 'supplier',
      partyId: newPurchase.supplierId,
      partyName: newPurchase.supplierName,
    });

    // Update matching procurement / purchase budgets
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.companyId === currentCompanyId && b.category === 'procurement' && b.status === 'active') {
          const newActual = Number((b.actualAmount + baseCurrencyTotal).toFixed(2));
          const isExceeded = newActual > b.baseCurrencyAmount;
          return {
            ...b,
            actualAmount: newActual,
            status: isExceeded ? 'exceeded' : b.status,
          };
        }
        return b;
      })
    );

    setPurchases((prev) => [newPurchase, ...prev]);
    logAudit(
      'CREATE_PURCHASE',
      'Purchases',
      `Recorded Bill #${newPurchase.billNo} for ${currency} ${newPurchase.grandTotal.toLocaleString()} (≈ ${baseCurrencyCode} ${baseCurrencyTotal.toLocaleString()})`
    );

    return { success: true, purchase: newPurchase };
  };

  // Stock Adjustment & Inter-Branch Transfer
  const adjustStock = (productId: string, branchId: string, deltaQty: number, type: 'adjustment_in' | 'adjustment_out', note: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return false;

    const curr = prod.branchStock[branchId] || 0;
    const updated = type === 'adjustment_in' ? curr + deltaQty : Math.max(0, curr - deltaQty);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              branchStock: {
                ...p.branchStock,
                [branchId]: updated,
              },
            }
          : p
      )
    );

    const mov: StockMovement = {
      id: `sm_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      companyId: currentCompanyId,
      branchId,
      productId,
      productName: prod.name,
      type,
      quantity: type === 'adjustment_in' ? deltaQty : -deltaQty,
      refNo: `ADJ-${Date.now().toString().slice(-4)}`,
      note,
      createdBy: currentUser.name,
    };
    setStockMovements((prev) => [mov, ...prev]);
    logAudit('STOCK_ADJUSTMENT', 'Inventory', `Adjusted ${prod.name} (${type === 'adjustment_in' ? '+' : '-'}${deltaQty}) at ${branchId}`);
    return true;
  };

  const transferStock = (productId: string, fromBranchId: string, toBranchId: string, qty: number, note: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return false;
    const fromQty = prod.branchStock[fromBranchId] || 0;
    if (fromQty < qty) return false;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          branchStock: {
            ...p.branchStock,
            [fromBranchId]: fromQty - qty,
            [toBranchId]: (p.branchStock[toBranchId] || 0) + qty,
          },
        };
      })
    );

    const transferRef = `TRF-${Date.now().toString().slice(-4)}`;
    setStockMovements((prev) => [
      {
        id: `sm_${Date.now()}_out`,
        date: new Date().toISOString().split('T')[0],
        companyId: currentCompanyId,
        branchId: fromBranchId,
        productId,
        productName: prod.name,
        type: 'transfer_out',
        quantity: -qty,
        refNo: transferRef,
        note: `Transferred to ${toBranchId}. ${note}`,
        createdBy: currentUser.name,
      },
      {
        id: `sm_${Date.now()}_in`,
        date: new Date().toISOString().split('T')[0],
        companyId: currentCompanyId,
        branchId: toBranchId,
        productId,
        productName: prod.name,
        type: 'transfer_in',
        quantity: qty,
        refNo: transferRef,
        note: `Received from ${fromBranchId}. ${note}`,
        createdBy: currentUser.name,
      },
      ...prev,
    ]);

    logAudit('STOCK_TRANSFER', 'Inventory', `Transferred ${qty} ${prod.uom} of ${prod.name} between branches`);
    return true;
  };

  // Add Product
  const addProduct = (productData: Partial<Product>) => {
    const code = productData.code || `PRD-${products.length + 101}`;
    const newProd: Product = {
      id: `prod_${Date.now()}`,
      companyId: currentCompanyId,
      code,
      sku: productData.sku || `SKU-${code}`,
      barcode: productData.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      name: productData.name || 'New Merchandise Product',
      nameBn: productData.nameBn || '',
      category: productData.category || 'General',
      uom: productData.uom || 'Pcs',
      purchasePrice: productData.purchasePrice || 0,
      salesPrice: productData.salesPrice || 0,
      wholesalePrice: productData.wholesalePrice || productData.salesPrice || 0,
      openingStock: productData.openingStock || 0,
      minStockAlert: productData.minStockAlert || 5,
      branchStock: {
        [branches[0]?.id || 'branch_dhaka_main']: productData.openingStock || 0,
      },
    };

    setProducts((prev) => [newProd, ...prev]);
    logAudit('ADD_PRODUCT', 'Inventory', `Added new product ${newProd.name} (${newProd.code})`, {
      entityId: newProd.id,
      entityType: 'product',
      severity: 'info',
    });
    return true;
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    const existing = products.find((p) => p.id === productId);
    if (!existing) return false;

    const changes: string[] = [];
    if (updates.salesPrice !== undefined && updates.salesPrice !== existing.salesPrice) {
      changes.push(`Sales Price: ৳${existing.salesPrice.toLocaleString()} → ৳${updates.salesPrice.toLocaleString()}`);
    }
    if (updates.purchasePrice !== undefined && updates.purchasePrice !== existing.purchasePrice) {
      changes.push(`Cost Price: ৳${existing.purchasePrice.toLocaleString()} → ৳${updates.purchasePrice.toLocaleString()}`);
    }
    if (updates.minStockAlert !== undefined && updates.minStockAlert !== existing.minStockAlert) {
      changes.push(`Min Alert: ${existing.minStockAlert} → ${updates.minStockAlert}`);
    }
    if (updates.name && updates.name !== existing.name) {
      changes.push(`Name: "${existing.name}" → "${updates.name}"`);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );

    logAudit(
      'UPDATE_PRODUCT',
      'Inventory',
      `Updated product ${existing.name} (${existing.code}): ${changes.length > 0 ? changes.join(', ') : 'Updated attributes'}`,
      {
        entityId: existing.id,
        entityType: 'product',
        severity: 'info',
        oldValue: JSON.stringify({ salesPrice: existing.salesPrice, purchasePrice: existing.purchasePrice, minStockAlert: existing.minStockAlert }),
        newValue: JSON.stringify({ salesPrice: updates.salesPrice ?? existing.salesPrice, purchasePrice: updates.purchasePrice ?? existing.purchasePrice, minStockAlert: updates.minStockAlert ?? existing.minStockAlert }),
      }
    );

    return true;
  };

  const deleteProduct = (productId: string, reason = 'Product discontinued') => {
    const existing = products.find((p) => p.id === productId);
    if (!existing) return false;

    setProducts((prev) => prev.filter((p) => p.id !== productId));

    logAudit(
      'DELETE_PRODUCT',
      'Inventory',
      `Deleted merchandise item "${existing.name}" (${existing.code}, SKU: ${existing.sku}). Reason: ${reason}`,
      {
        entityId: existing.id,
        entityType: 'product',
        severity: 'warning',
        oldValue: JSON.stringify({ name: existing.name, code: existing.code, sku: existing.sku }),
      }
    );

    return true;
  };


  // Add Customer & Supplier
  const addCustomer = (customerData: Partial<Customer>) => {
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      companyId: currentCompanyId,
      code: customerData.code || `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      name: customerData.name || 'New Customer',
      phone: customerData.phone || '',
      email: customerData.email || '',
      address: customerData.address || '',
      category: customerData.category || 'Retail',
      creditLimit: customerData.creditLimit || 50000,
      openingBalance: customerData.openingBalance || 0,
      currentBalance: customerData.openingBalance || 0,
    };
    setCustomers((prev) => [newCust, ...prev]);
    logAudit('ADD_CUSTOMER', 'Customers', `Created customer ${newCust.name} (${newCust.code})`);
    return true;
  };

  const addSupplier = (supplierData: Partial<Supplier>) => {
    const newSupp: Supplier = {
      id: `supp_${Date.now()}`,
      companyId: currentCompanyId,
      code: supplierData.code || `SUPP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name: supplierData.name || 'New Supplier',
      phone: supplierData.phone || '',
      email: supplierData.email || '',
      address: supplierData.address || '',
      openingBalance: supplierData.openingBalance || 0,
      currentBalance: supplierData.openingBalance || 0,
    };
    setSuppliers((prev) => [newSupp, ...prev]);
    logAudit('ADD_SUPPLIER', 'Suppliers', `Created supplier ${newSupp.name} (${newSupp.code})`);
    return true;
  };

  // Record Customer Receipt (Collection of dues)
  const recordCustomerReceipt = (customerId: string, amount: number, paymentMethod: 'cash' | 'bank', refNo: string, narration: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust || amount <= 0) return false;

    // Reduce customer balance
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance - amount) } : c))
    );

    // Create Receipt Voucher (RV):
    // Debit: Cash or Bank
    // Credit: Accounts Receivable
    const cashAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'cash') || accounts[0];
    const bankAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'bank') || accounts[0];
    const arAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'receivable') || accounts[1];
    const receiveAcc = paymentMethod === 'bank' ? bankAcc : cashAcc;

    createVoucher({
      type: 'receipt',
      date: new Date().toISOString().split('T')[0],
      entries: [
        {
          id: `ve_${Date.now()}_1`,
          accountId: receiveAcc.id,
          accountName: receiveAcc.name,
          debit: amount,
          credit: 0,
          description: `Receipt from ${cust.name}`,
        },
        {
          id: `ve_${Date.now()}_2`,
          accountId: arAcc.id,
          accountName: arAcc.name,
          debit: 0,
          credit: amount,
          description: `Customer due credit for ${cust.name}`,
        },
      ],
      narration: narration || `Received ৳${amount.toLocaleString()} from ${cust.name}`,
      refNo,
      partyType: 'customer',
      partyId: cust.id,
      partyName: cust.name,
    });

    logAudit('CUSTOMER_RECEIPT', 'Customers', `Received ৳${amount.toLocaleString()} from ${cust.name}`);
    return true;
  };

  // Record Supplier Payment (Settlement of payables)
  const recordSupplierPayment = (supplierId: string, amount: number, paymentMethod: 'cash' | 'bank', refNo: string, narration: string) => {
    const supp = suppliers.find((s) => s.id === supplierId);
    if (!supp || amount <= 0) return false;

    // Reduce supplier payable balance
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - amount) } : s))
    );

    // Create Payment Voucher (PV):
    // Debit: Accounts Payable
    // Credit: Cash or Bank
    const cashAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'cash') || accounts[0];
    const bankAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'bank') || accounts[0];
    const apAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'payable') || accounts[1];
    const payAcc = paymentMethod === 'bank' ? bankAcc : cashAcc;

    createVoucher({
      type: 'payment',
      date: new Date().toISOString().split('T')[0],
      entries: [
        {
          id: `ve_${Date.now()}_1`,
          accountId: apAcc.id,
          accountName: apAcc.name,
          debit: amount,
          credit: 0,
          description: `Settlement to ${supp.name}`,
        },
        {
          id: `ve_${Date.now()}_2`,
          accountId: payAcc.id,
          accountName: payAcc.name,
          debit: 0,
          credit: amount,
          description: `Paid via ${paymentMethod}`,
        },
      ],
      narration: narration || `Paid ৳${amount.toLocaleString()} to ${supp.name}`,
      refNo,
      partyType: 'supplier',
      partyId: supp.id,
      partyName: supp.name,
    });

    logAudit('SUPPLIER_PAYMENT', 'Suppliers', `Paid ৳${amount.toLocaleString()} to ${supp.name}`);
    return true;
  };

  // Godown & Sub-Godown Operations
  const addGodown = (godownData: Partial<Godown>) => {
    const code = godownData.code || `GDN-${String(godowns.length + 1).padStart(3, '0')}`;
    const newGodown: Godown = {
      id: `godown_${Date.now()}`,
      companyId: currentCompanyId,
      branchId: godownData.branchId || currentBranchId,
      name: godownData.name || 'New Warehouse / Godown',
      nameBn: godownData.nameBn,
      code,
      parentId: godownData.parentId || null,
      location: godownData.location || 'Warehouse Location',
      capacity: godownData.capacity || '10,000 Units',
      manager: godownData.manager,
      phone: godownData.phone,
      isActive: godownData.isActive ?? true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setGodowns((prev) => [...prev, newGodown]);
    logAudit(
      'ADD_GODOWN',
      'Inventory',
      `Created ${newGodown.parentId ? 'Sub-Godown' : 'Main Godown'} "${newGodown.name}" (${newGodown.code})`,
      {
        entityId: newGodown.id,
        entityType: 'godown',
        severity: 'info',
      }
    );
    return { success: true, godown: newGodown };
  };

  const updateGodown = (godownId: string, updates: Partial<Godown>) => {
    const existing = godowns.find((g) => g.id === godownId);
    if (!existing) return { success: false, error: 'Godown not found' };

    setGodowns((prev) => prev.map((g) => (g.id === godownId ? { ...g, ...updates } : g)));
    logAudit(
      'UPDATE_GODOWN',
      'Inventory',
      `Updated godown "${existing.name}" (${existing.code})`,
      {
        entityId: existing.id,
        entityType: 'godown',
        severity: 'info',
      }
    );
    return { success: true };
  };

  const deleteGodown = (godownId: string, reason = 'Godown decommissioned') => {
    const existing = godowns.find((g) => g.id === godownId);
    if (!existing) return { success: false, error: 'Godown not found' };

    // Check if any sub-godowns belong to this parent godown
    const childGodowns = godowns.filter((g) => g.parentId === godownId);
    if (childGodowns.length > 0) {
      return {
        success: false,
        error: `Cannot delete godown "${existing.name}" because it contains ${childGodowns.length} active sub-godown(s). Please remove or reassign sub-godowns first.`,
      };
    }

    setGodowns((prev) => prev.filter((g) => g.id !== godownId));
    logAudit(
      'DELETE_GODOWN',
      'Inventory',
      `Deleted godown "${existing.name}" (${existing.code}). Reason: ${reason}`,
      {
        entityId: existing.id,
        entityType: 'godown',
        severity: 'warning',
      }
    );
    return { success: true };
  };

  // Helper to query current stock of a product in a specific Godown or overall
  const getGodownStock = (productId: string, godownId?: string): number => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return 0;
    if (godownId) {
      if (prod.godownStock && prod.godownStock[godownId] !== undefined) {
        return prod.godownStock[godownId];
      }
      if (prod.defaultGodownId === godownId) {
        return Object.values(prod.branchStock).reduce((a, b) => a + b, 0);
      }
      return 0;
    }
    if (prod.godownStock && Object.keys(prod.godownStock).length > 0) {
      return Object.values(prod.godownStock).reduce((a, b) => a + b, 0);
    }
    return Object.values(prod.branchStock).reduce((a, b) => a + b, 0);
  };

  // Customer Edit & Delete
  const updateCustomer = (customerId: string, updates: Partial<Customer>) => {
    const existing = customers.find((c) => c.id === customerId);
    if (!existing) return { success: false, error: 'Customer not found' };

    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, ...updates } : c)));
    logAudit('UPDATE_CUSTOMER', 'Customers', `Updated customer details for "${updates.name || existing.name}" (${existing.code})`, {
      entityId: existing.id,
      entityType: 'customer',
      severity: 'info',
    });
    return { success: true };
  };

  const deleteCustomer = (customerId: string, reason = 'Customer record deleted') => {
    const existing = customers.find((c) => c.id === customerId);
    if (!existing) return { success: false, error: 'Customer not found' };

    // Check if customer has outstanding balance
    if (existing.currentBalance > 0) {
      return {
        success: false,
        error: `Cannot delete customer "${existing.name}" with outstanding balance of ৳${existing.currentBalance.toLocaleString()}. Please settle dues first.`,
      };
    }

    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    logAudit('DELETE_CUSTOMER', 'Customers', `Deleted customer "${existing.name}" (${existing.code}). Reason: ${reason}`, {
      entityId: existing.id,
      entityType: 'customer',
      severity: 'warning',
    });
    return { success: true };
  };

  // Supplier Edit & Delete
  const updateSupplier = (supplierId: string, updates: Partial<Supplier>) => {
    const existing = suppliers.find((s) => s.id === supplierId);
    if (!existing) return { success: false, error: 'Supplier not found' };

    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? { ...s, ...updates } : s)));
    logAudit('UPDATE_SUPPLIER', 'Suppliers', `Updated supplier details for "${updates.name || existing.name}" (${existing.code})`, {
      entityId: existing.id,
      entityType: 'supplier',
      severity: 'info',
    });
    return { success: true };
  };

  const deleteSupplier = (supplierId: string, reason = 'Supplier record deleted') => {
    const existing = suppliers.find((s) => s.id === supplierId);
    if (!existing) return { success: false, error: 'Supplier not found' };

    // Check if supplier has outstanding payable
    if (existing.currentBalance > 0) {
      return {
        success: false,
        error: `Cannot delete supplier "${existing.name}" with outstanding payable balance of ৳${existing.currentBalance.toLocaleString()}. Please clear payments first.`,
      };
    }

    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
    logAudit('DELETE_SUPPLIER', 'Suppliers', `Deleted supplier "${existing.name}" (${existing.code}). Reason: ${reason}`, {
      entityId: existing.id,
      entityType: 'supplier',
      severity: 'warning',
    });
    return { success: true };
  };

  // Record Order Receipt by Voucher / Invoice Number Wise
  const recordOrderReceipt = (
    saleIdOrVoucherNo: string,
    amount: number,
    paymentMethod: 'cash' | 'bank' | 'bkash' | 'nagad',
    refNo: string,
    narration: string,
    depositAccountId?: string
  ) => {
    if (amount <= 0) return { success: false, error: 'Receipt amount must be greater than 0' };

    const cleanQuery = saleIdOrVoucherNo.trim().toLowerCase();
    const targetSale = sales.find(
      (s) =>
        s.id.toLowerCase() === cleanQuery ||
        s.invoiceNo.toLowerCase() === cleanQuery ||
        (s.voucherId && s.voucherId.toLowerCase() === cleanQuery)
    );

    if (!targetSale) {
      return {
        success: false,
        error: `Sales order / invoice "${saleIdOrVoucherNo}" not found. Please check voucher/invoice number.`,
      };
    }

    const cust = customers.find((c) => c.id === targetSale.customerId);

    // Update sale paid & due
    const updatedPaid = targetSale.paidAmount + amount;
    const updatedDue = Math.max(0, targetSale.grandTotal - updatedPaid);

    setSales((prev) =>
      prev.map((s) =>
        s.id === targetSale.id
          ? {
              ...s,
              paidAmount: updatedPaid,
              dueAmount: updatedDue,
            }
          : s
      )
    );

    // Update customer balance
    if (cust) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cust.id
            ? {
                ...c,
                currentBalance: Math.max(0, c.currentBalance - amount),
              }
            : c
        )
      );
    }

    // Determine Accounts for balanced double-entry receipt voucher
    const defaultCash = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'cash') || accounts[0];
    const defaultBank = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'bank') || accounts[0];
    const arAcc = accounts.find((a) => a.companyId === currentCompanyId && a.subType === 'receivable') || accounts[1];

    const receiveAcc = depositAccountId
      ? accounts.find((a) => a.id === depositAccountId) || defaultCash
      : (paymentMethod === 'bank' ? defaultBank : defaultCash);

    const voucherRes = createVoucher({
      type: 'receipt',
      date: new Date().toISOString().split('T')[0],
      entries: [
        {
          id: `ve_${Date.now()}_1`,
          accountId: receiveAcc.id,
          accountName: receiveAcc.name,
          debit: amount,
          credit: 0,
          description: `Order collection for Invoice #${targetSale.invoiceNo} (${cust?.name || 'Customer'})`,
        },
        {
          id: `ve_${Date.now()}_2`,
          accountId: arAcc.id,
          accountName: arAcc.name,
          debit: 0,
          credit: amount,
          description: `Accounts receivable settled against Order #${targetSale.invoiceNo}`,
        },
      ],
      narration:
        narration ||
        `Order Receipt against Voucher/Invoice #${targetSale.invoiceNo} from ${targetSale.customerName}. Received ৳${amount.toLocaleString()} via ${paymentMethod.toUpperCase()}`,
      refNo: refNo || targetSale.invoiceNo,
      partyType: 'customer',
      partyId: targetSale.customerId,
      partyName: targetSale.customerName,
    });

    logAudit(
      'ORDER_RECEIPT',
      'Vouchers',
      `Processed order receipt of ৳${amount.toLocaleString()} against voucher/order ${targetSale.invoiceNo} (Remaining Due: ৳${updatedDue.toLocaleString()})`,
      {
        entityId: targetSale.id,
        entityType: 'sale',
        severity: 'info',
      }
    );

    return { success: true, voucher: voucherRes.voucher };
  };

  // Settings & Company mutations
  const updateCompanySettings = (newSettings: Partial<Company['settings']>) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === currentCompanyId
          ? {
              ...c,
              settings: {
                ...c.settings,
                ...newSettings,
              },
            }
          : c
      )
    );
    logAudit('UPDATE_SETTINGS', 'Settings', 'Updated company ERP preferences & voucher configuration');
  };

  const addCompany = (comp: Partial<Company>) => {
    registerCompany({
      companyName: comp.name || 'New Company Ltd',
      code: comp.code,
      tradeLicense: comp.tradeLicense,
      tin: comp.tin,
      address: comp.address,
      phone: comp.phone,
      email: comp.email,
      adminName: currentUser?.name || 'Administrator',
      adminEmail: currentUser?.email || 'admin@company.bd',
      adminPhone: currentUser?.phone || '',
    });
  };

  const addBranch = (branch: Partial<Branch>) => {
    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      companyId: currentCompanyId,
      name: branch.name || 'New Branch',
      code: branch.code || `BR-${branches.length + 1}`,
      phone: branch.phone || currentCompany.phone,
      address: branch.address || currentCompany.address,
      isMain: false,
    };

    setCompanies((prev) =>
      prev.map((c) =>
        c.id === currentCompanyId
          ? {
              ...c,
              branches: [...c.branches, newBranch],
            }
          : c
      )
    );
    logAudit('ADD_BRANCH', 'Company', `Added branch ${newBranch.name}`);
  };

  const addUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: userData.name || 'New Staff Member',
      email: userData.email || '',
      phone: userData.phone || '',
      role: userData.role || 'Salesperson',
      allowedCompanyIds: [currentCompanyId],
      allowedBranchIds: [currentBranchId],
      status: 'active',
    };
    setUsers((prev) => [...prev, newUser]);
    logAudit('ADD_USER', 'Users', `Created user ${newUser.name} with role ${newUser.role}`);
  };

  // Budget Management Mutations
  const addBudget = (budgetData: Partial<Budget>) => {
    const curList = currentCompany.settings.currencies || defaultCurrencies;
    const baseCode = currentCompany.settings.baseCurrency || 'BDT';
    const curCode = budgetData.currency || baseCode;
    const curRate = curList.find((c) => c.code === curCode)?.rateToBase || 1;
    const budgetAmount = Number(budgetData.budgetAmount) || 0;
    const baseAmount = Number((budgetAmount * curRate).toFixed(2));

    const newBudget: Budget = {
      id: `bgt_${Date.now()}`,
      companyId: currentCompanyId,
      branchId: budgetData.branchId || 'all',
      name: budgetData.name || 'New Financial Target',
      category: budgetData.category || 'expense',
      accountId: budgetData.accountId,
      accountName: budgetData.accountName,
      period: budgetData.period || 'quarterly',
      periodName: budgetData.periodName || '2026-Q1',
      startDate: budgetData.startDate || '2026-01-01',
      endDate: budgetData.endDate || '2026-03-31',
      currency: curCode,
      budgetAmount,
      exchangeRate: curRate,
      baseCurrencyAmount: baseAmount,
      actualAmount: 0,
      warningThresholdPercent: budgetData.warningThresholdPercent || 80,
      status: 'active',
      notes: budgetData.notes || '',
      createdAt: new Date().toISOString(),
    };

    setBudgets((prev) => [newBudget, ...prev]);
    logAudit('CREATE_BUDGET', 'Budgets', `Configured budget "${newBudget.name}" (${newBudget.currency} ${newBudget.budgetAmount.toLocaleString()})`);
    return true;
  };

  const updateBudget = (id: string, updates: Partial<Budget>) => {
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const curList = currentCompany.settings.currencies || defaultCurrencies;
        const curCode = updates.currency || b.currency;
        const curRate = curList.find((c) => c.code === curCode)?.rateToBase || b.exchangeRate || 1;
        const budgetAmount = updates.budgetAmount !== undefined ? Number(updates.budgetAmount) : b.budgetAmount;
        const baseAmount = Number((budgetAmount * curRate).toFixed(2));

        return {
          ...b,
          ...updates,
          currency: curCode,
          exchangeRate: curRate,
          budgetAmount,
          baseCurrencyAmount: baseAmount,
        };
      })
    );
    logAudit('UPDATE_BUDGET', 'Budgets', `Updated budget allocation #${id}`);
    return true;
  };

  const deleteBudget = (id: string, reason = 'Removed by user') => {
    const existing = budgets.find((b) => b.id === id);
    if (!existing) return false;
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    logAudit('DELETE_BUDGET', 'Budgets', `Deleted budget "${existing.name}". Reason: ${reason}`, {
      entityId: existing.id,
      severity: 'warning',
    });
    return true;
  };

  const exportDatabaseJson = () => {
    return JSON.stringify(
      {
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
        budgets,
      },
      null,
      2
    );
  };

  const restoreDatabaseJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.companies) setCompanies(data.companies);
      if (data.accounts) setAccounts(data.accounts);
      if (data.products) setProducts(data.products);
      if (data.customers) setCustomers(data.customers);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.vouchers) setVouchers(data.vouchers);
      if (data.sales) setSales(data.sales);
      if (data.purchases) setPurchases(data.purchases);
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.budgets) setBudgets(data.budgets);
      return true;
    } catch {
      return false;
    }
  };

  const resetToInitialData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setCompanies(initialCompanies);
    setAccounts(initialAccounts);
    setProducts(initialProducts);
    setCustomers(initialCustomers);
    setSuppliers(initialSuppliers);
    setVouchers(initialVouchers);
    setSales(initialSales);
    setPurchases(initialPurchases);
    setStockMovements([]);
    setAuditLogs(initialAuditLogs);
    setBudgets(initialBudgets);
    setGodowns(initialGodowns);
  };

  // Filter collections by current active company
  const companyAccounts = accounts.filter((a) => a.companyId === currentCompanyId);
  const companyProducts = products.filter((p) => p.companyId === currentCompanyId);
  const companyCustomers = customers.filter((c) => c.companyId === currentCompanyId);
  const companySuppliers = suppliers.filter((s) => s.companyId === currentCompanyId);
  const companyVouchers = vouchers.filter((v) => v.companyId === currentCompanyId);
  const companySales = sales.filter((s) => s.companyId === currentCompanyId);
  const companyPurchases = purchases.filter((p) => p.companyId === currentCompanyId);
  const companyStockMovements = stockMovements.filter((m) => m.companyId === currentCompanyId);
  const companyAuditLogs = auditLogs.filter((l) => l.companyId === currentCompanyId);
  const companyBudgets = budgets.filter((b) => b.companyId === currentCompanyId);
  const companyGodowns = godowns.filter((g) => g.companyId === currentCompanyId);

  return (
    <ERPContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        lockSession,
        registerCompany,
        resetUserPassword,
        language,
        setLanguage,
        appMode,
        setAppMode,
        theme,
        setTheme,
        activeTab,
        setActiveTab,
        syncStatus,
        currentCompany,
        currentBranchId,
        currentBranch,
        currentUser,
        userAccessibleCompanies,
        switchCompany,
        switchBranch,
        switchUser,
        updateUserPermissions,
        updateCurrencies,
        convertCurrency,
        companies,
        branches,
        users,
        accounts: companyAccounts,
        products: companyProducts,
        customers: companyCustomers,
        suppliers: companySuppliers,
        vouchers: companyVouchers,
        sales: companySales,
        purchases: companyPurchases,
        stockMovements: companyStockMovements,
        auditLogs: companyAuditLogs,
        budgets: companyBudgets,
        godowns: companyGodowns,
        createVoucher,
        reverseVoucher,
        updateVoucher,
        deleteVoucher,
        addAccount,
        updateAccount,
        deleteAccount,
        createSale,
        deleteSale,
        createPurchase,
        adjustStock,
        transferStock,
        addProduct,
        updateProduct,
        deleteProduct,
        addGodown,
        updateGodown,
        deleteGodown,
        getGodownStock,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        recordCustomerReceipt,
        recordOrderReceipt,
        recordSupplierPayment,
        updateCompanySettings,
        addBudget,
        updateBudget,
        deleteBudget,
        addCompany,
        addBranch,
        addUser,
        logAudit,
        exportDatabaseJson,
        restoreDatabaseJson,
        resetToInitialData,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
