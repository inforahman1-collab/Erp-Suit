/**
 * Automated Verification Test Suite for Double-Entry Accounting & Multi-Company ERP
 */

import { validateJournalBalance, generateTrialBalance, generateProfitAndLoss, generateBalanceSheet } from '../services/accountingEngine';
import { initialAccounts, initialVouchers } from '../data/seedData';
import { VoucherEntry } from '../types/erp';

export function runAutomatedAccountingVerification() {
  const results: { test: string; passed: boolean; message: string }[] = [];

  // Test 1: Balanced Journal Entry
  const balancedEntries: VoucherEntry[] = [
    { id: '1', accountId: 'acc_cash', accountName: 'Cash', debit: 5000, credit: 0 },
    { id: '2', accountId: 'acc_sales_rev', accountName: 'Sales', debit: 0, credit: 5000 },
  ];
  const t1 = validateJournalBalance(balancedEntries);
  results.push({
    test: 'Double-Entry Balanced Journal (Dr 5000 == Cr 5000)',
    passed: t1.isValid && t1.difference === 0,
    message: t1.isValid ? 'Passed: Debits equal Credits' : `Failed: Difference ${t1.difference}`,
  });

  // Test 2: Unbalanced Journal Entry Detection
  const unbalancedEntries: VoucherEntry[] = [
    { id: '1', accountId: 'acc_cash', accountName: 'Cash', debit: 5000, credit: 0 },
    { id: '2', accountId: 'acc_sales_rev', accountName: 'Sales', debit: 0, credit: 4000 },
  ];
  const t2 = validateJournalBalance(unbalancedEntries);
  results.push({
    test: 'Rejection of Unbalanced Journal Entry',
    passed: !t2.isValid && t2.difference === 1000,
    message: !t2.isValid ? 'Passed: Discrepancy caught and prevented from posting' : 'Failed: Allowed unbalanced entry',
  });

  // Test 3: Trial Balance Computation
  const tb = generateTrialBalance(initialAccounts, initialVouchers);
  results.push({
    test: 'Trial Balance Verification (Total Debit == Total Credit)',
    passed: tb.isBalanced,
    message: `Debit: ৳${tb.totalDebit}, Credit: ৳${tb.totalCredit}`,
  });

  // Test 4: Profit & Loss Statement Calculation
  const pl = generateProfitAndLoss(initialAccounts, initialVouchers);
  const expectedGross = pl.totalRevenue - pl.totalCostOfSales;
  const expectedNet = expectedGross - pl.totalExpenses;
  results.push({
    test: 'Profit & Loss Statement Arithmetic Consistency',
    passed: Math.abs(pl.grossProfit - expectedGross) < 0.01 && Math.abs(pl.netProfit - expectedNet) < 0.01,
    message: `Gross Profit: ৳${pl.grossProfit}, Net Profit: ৳${pl.netProfit}`,
  });

  // Test 5: Balance Sheet Equilibrium (Assets == Liabilities + Equity)
  const bs = generateBalanceSheet(initialAccounts, initialVouchers);
  results.push({
    test: 'Balance Sheet Accounting Equation (Assets == Liabilities + Equity)',
    passed: bs.isBalanced,
    message: `Assets: ৳${bs.assets.total}, Liab+Eq: ৳${bs.liabilities.total + bs.equity.total}, Discrepancy: ৳${bs.discrepancy}`,
  });

  console.table(results);
  return results;
}

// Auto-run on test load
runAutomatedAccountingVerification();
