import { Account, Voucher, VoucherEntry, Sale, Purchase, Customer, Supplier } from '../types/erp';

export interface LedgerRow {
  date: string;
  voucherNo: string;
  voucherType: string;
  narration: string;
  refNo?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

export interface ProfitAndLossReport {
  operatingRevenue: { name: string; amount: number }[];
  totalRevenue: number;
  costOfSales: { name: string; amount: number }[];
  totalCostOfSales: number;
  grossProfit: number;
  operatingExpenses: { name: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  assets: {
    current: { name: string; amount: number }[];
    fixed: { name: string; amount: number }[];
    total: number;
  };
  liabilities: {
    current: { name: string; amount: number }[];
    longTerm: { name: string; amount: number }[];
    total: number;
  };
  equity: {
    capital: { name: string; amount: number }[];
    netIncome: number;
    total: number;
  };
  isBalanced: boolean;
  discrepancy: number;
}

export function validateJournalBalance(entries: VoucherEntry[]): {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
} {
  const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  return {
    isValid: diff < 0.001 && totalDebit > 0,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    difference: Number(diff.toFixed(2)),
  };
}

export function computeAccountBalances(accounts: Account[], vouchers: Voucher[]): Map<string, number> {
  const balances = new Map<string, number>();

  // Initialize with opening balance
  accounts.forEach((acc) => {
    balances.set(acc.id, acc.openingBalance || 0);
  });

  // Process all posted vouchers
  const posted = vouchers.filter((v) => v.status === 'posted');
  posted.forEach((v) => {
    v.entries.forEach((e) => {
      const current = balances.get(e.accountId) || 0;
      const acc = accounts.find((a) => a.id === e.accountId);
      const isDebitNormal = acc?.type === 'asset' || acc?.type === 'expense';

      if (isDebitNormal) {
        balances.set(e.accountId, current + (e.debit - e.credit));
      } else {
        balances.set(e.accountId, current + (e.credit - e.debit));
      }
    });
  });

  return balances;
}

export function generateGeneralLedger(
  account: Account,
  vouchers: Voucher[],
  startDate?: string,
  endDate?: string
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  const isDebitNormal = account.type === 'asset' || account.type === 'expense';
  let running = account.openingBalance || 0;

  // Add opening row
  rows.push({
    date: 'Opening',
    voucherNo: '-',
    voucherType: 'Opening Balance',
    narration: 'Opening balance brought forward',
    debit: isDebitNormal && running > 0 ? running : 0,
    credit: !isDebitNormal && running > 0 ? running : 0,
    balance: running,
  });

  const sortedVouchers = [...vouchers]
    .filter((v) => v.status === 'posted')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const v of sortedVouchers) {
    if (startDate && v.date < startDate) continue;
    if (endDate && v.date > endDate) continue;

    for (const e of v.entries) {
      if (e.accountId === account.id) {
        if (isDebitNormal) {
          running += e.debit - e.credit;
        } else {
          running += e.credit - e.debit;
        }

        rows.push({
          date: v.date,
          voucherNo: v.voucherNo,
          voucherType: v.type,
          narration: e.description || v.narration,
          refNo: v.refNo,
          debit: e.debit,
          credit: e.credit,
          balance: Number(running.toFixed(2)),
        });
      }
    }
  }

  return rows;
}

export function generateTrialBalance(accounts: Account[], vouchers: Voucher[]): {
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  const items: TrialBalanceItem[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  const balances = computeAccountBalances(accounts, vouchers);

  accounts.forEach((acc) => {
    const rawBal = balances.get(acc.id) || 0;
    const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';

    let dr = 0;
    let cr = 0;

    if (isDebitNormal) {
      if (rawBal >= 0) dr = rawBal;
      else cr = Math.abs(rawBal);
    } else {
      if (rawBal >= 0) cr = rawBal;
      else dr = Math.abs(rawBal);
    }

    if (dr !== 0 || cr !== 0 || acc.openingBalance !== 0) {
      items.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        debit: Number(dr.toFixed(2)),
        credit: Number(cr.toFixed(2)),
      });
      totalDebit += dr;
      totalCredit += cr;
    }
  });

  const diff = Math.abs(totalDebit - totalCredit);

  return {
    items: items.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    isBalanced: diff < 0.05,
  };
}

export function generateProfitAndLoss(accounts: Account[], vouchers: Voucher[]): ProfitAndLossReport {
  const balances = computeAccountBalances(accounts, vouchers);

  const operatingRevenue: { name: string; amount: number }[] = [];
  let totalRevenue = 0;

  const costOfSales: { name: string; amount: number }[] = [];
  let totalCostOfSales = 0;

  const operatingExpenses: { name: string; amount: number }[] = [];
  let totalExpenses = 0;

  accounts.forEach((acc) => {
    const bal = balances.get(acc.id) || 0;
    if (acc.type === 'revenue') {
      operatingRevenue.push({ name: acc.name, amount: bal });
      totalRevenue += bal;
    } else if (acc.subType === 'cost_of_sales') {
      costOfSales.push({ name: acc.name, amount: bal });
      totalCostOfSales += bal;
    } else if (acc.type === 'expense') {
      operatingExpenses.push({ name: acc.name, amount: bal });
      totalExpenses += bal;
    }
  });

  const grossProfit = totalRevenue - totalCostOfSales;
  const netProfit = grossProfit - totalExpenses;

  return {
    operatingRevenue,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    costOfSales,
    totalCostOfSales: Number(totalCostOfSales.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    operatingExpenses,
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
  };
}

export function generateBalanceSheet(accounts: Account[], vouchers: Voucher[]): BalanceSheetReport {
  const balances = computeAccountBalances(accounts, vouchers);
  const pl = generateProfitAndLoss(accounts, vouchers);

  const currentAssets: { name: string; amount: number }[] = [];
  const fixedAssets: { name: string; amount: number }[] = [];
  let totalAssets = 0;

  const currentLiabilities: { name: string; amount: number }[] = [];
  const longTermLiabilities: { name: string; amount: number }[] = [];
  let totalLiabilities = 0;

  const capitalList: { name: string; amount: number }[] = [];
  let totalEquity = 0;

  accounts.forEach((acc) => {
    const bal = balances.get(acc.id) || 0;

    if (acc.type === 'asset') {
      if (acc.subType === 'fixed_asset') {
        fixedAssets.push({ name: acc.name, amount: bal });
      } else {
        currentAssets.push({ name: acc.name, amount: bal });
      }
      totalAssets += bal;
    } else if (acc.type === 'liability') {
      currentLiabilities.push({ name: acc.name, amount: bal });
      totalLiabilities += bal;
    } else if (acc.type === 'equity') {
      capitalList.push({ name: acc.name, amount: bal });
      totalEquity += bal;
    }
  });

  // Equity includes current period Net Income
  totalEquity += pl.netProfit;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const discrepancy = Math.abs(totalAssets - totalLiabilitiesAndEquity);

  return {
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      total: Number(totalAssets.toFixed(2)),
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      total: Number(totalLiabilities.toFixed(2)),
    },
    equity: {
      capital: capitalList,
      netIncome: pl.netProfit,
      total: Number(totalEquity.toFixed(2)),
    },
    isBalanced: discrepancy < 0.1,
    discrepancy: Number(discrepancy.toFixed(2)),
  };
}
