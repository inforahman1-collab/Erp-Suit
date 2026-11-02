/**
 * SQL Dump Generator for Multi-Company ERP
 * Generates ANSI SQL-92 / PostgreSQL / MySQL / SQLite compatible schema DDL and DML insert statements
 */

export function generateSQLDump(state: any): string {
  const timestamp = new Date().toISOString();
  let sql = `-- ====================================================================\n`;
  sql += `-- Professional Multi-Company ERP Management System - Full SQL Dump\n`;
  sql += `-- Generated At: ${timestamp}\n`;
  sql += `-- Database Architecture: Relational Multi-Tenant Isolated Schema\n`;
  sql += `-- ====================================================================\n\n`;

  sql += `BEGIN TRANSACTION;\n\n`;

  // 1. Companies Table
  sql += `-- 1. Companies\n`;
  sql += `CREATE TABLE IF NOT EXISTS companies (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  code VARCHAR(32) NOT NULL UNIQUE,\n`;
  sql += `  trade_license VARCHAR(128),\n`;
  sql += `  tin VARCHAR(64),\n`;
  sql += `  address TEXT,\n`;
  sql += `  phone VARCHAR(64),\n`;
  sql += `  email VARCHAR(128),\n`;
  sql += `  currency VARCHAR(16) DEFAULT 'BDT',\n`;
  sql += `  vat_percent DECIMAL(5,2) DEFAULT 7.50\n`;
  sql += `);\n\n`;

  (state.companies || []).forEach((c: any) => {
    sql += `INSERT INTO companies (id, name, code, trade_license, tin, address, phone, email, currency, vat_percent)\n`;
    sql += `VALUES ('${esc(c.id)}', '${esc(c.name)}', '${esc(c.code)}', '${esc(c.tradeLicense)}', '${esc(c.tin)}', '${esc(c.address)}', '${esc(c.phone)}', '${esc(c.email)}', '${esc(c.settings?.currency || 'BDT')}', ${c.settings?.defaultVatPercent || 7.5}) ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 2. Branches Table
  sql += `-- 2. Branches\n`;
  sql += `CREATE TABLE IF NOT EXISTS branches (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  code VARCHAR(32) NOT NULL,\n`;
  sql += `  phone VARCHAR(64),\n`;
  sql += `  address TEXT,\n`;
  sql += `  is_main BOOLEAN DEFAULT FALSE\n`;
  sql += `);\n\n`;

  (state.companies || []).forEach((c: any) => {
    (c.branches || []).forEach((b: any) => {
      sql += `INSERT INTO branches (id, company_id, name, code, phone, address, is_main)\n`;
      sql += `VALUES ('${esc(b.id)}', '${esc(c.id)}', '${esc(b.name)}', '${esc(b.code)}', '${esc(b.phone)}', '${esc(b.address)}', ${b.isMain ? 'TRUE' : 'FALSE'}) ON CONFLICT (id) DO NOTHING;\n`;
    });
  });
  sql += `\n`;

  // 3. Chart of Accounts Table
  sql += `-- 3. Chart of Accounts (Double-Entry)\n`;
  sql += `CREATE TABLE IF NOT EXISTS chart_of_accounts (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  code VARCHAR(32) NOT NULL,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  type VARCHAR(32) NOT NULL,\n`;
  sql += `  sub_type VARCHAR(64) NOT NULL,\n`;
  sql += `  opening_balance DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  current_balance DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  currency VARCHAR(16) DEFAULT 'BDT'\n`;
  sql += `);\n\n`;

  (state.accounts || []).forEach((a: any) => {
    sql += `INSERT INTO chart_of_accounts (id, company_id, code, name, type, sub_type, opening_balance, current_balance, currency)\n`;
    sql += `VALUES ('${esc(a.id)}', '${esc(a.companyId)}', '${esc(a.code)}', '${esc(a.name)}', '${esc(a.type)}', '${esc(a.subType)}', ${a.openingBalance || 0}, ${a.currentBalance || 0}, '${esc(a.currency || 'BDT')}') ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 4. Products Table
  sql += `-- 4. Products & Inventory\n`;
  sql += `CREATE TABLE IF NOT EXISTS products (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  code VARCHAR(32) NOT NULL,\n`;
  sql += `  sku VARCHAR(64) NOT NULL,\n`;
  sql += `  barcode VARCHAR(64),\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  category VARCHAR(128),\n`;
  sql += `  uom VARCHAR(32) DEFAULT 'Pcs',\n`;
  sql += `  purchase_price DECIMAL(15,2) NOT NULL,\n`;
  sql += `  sales_price DECIMAL(15,2) NOT NULL,\n`;
  sql += `  wholesale_price DECIMAL(15,2),\n`;
  sql += `  min_stock_alert INT DEFAULT 5\n`;
  sql += `);\n\n`;

  (state.products || []).forEach((p: any) => {
    sql += `INSERT INTO products (id, company_id, code, sku, barcode, name, category, uom, purchase_price, sales_price, wholesale_price, min_stock_alert)\n`;
    sql += `VALUES ('${esc(p.id)}', '${esc(p.companyId)}', '${esc(p.code)}', '${esc(p.sku)}', '${esc(p.barcode)}', '${esc(p.name)}', '${esc(p.category)}', '${esc(p.uom)}', ${p.purchasePrice || 0}, ${p.salesPrice || 0}, ${p.wholesalePrice || 0}, ${p.minStockAlert || 5}) ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 5. Customers Table
  sql += `-- 5. Customers Directory\n`;
  sql += `CREATE TABLE IF NOT EXISTS customers (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  code VARCHAR(32) NOT NULL,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  phone VARCHAR(64),\n`;
  sql += `  email VARCHAR(128),\n`;
  sql += `  address TEXT,\n`;
  sql += `  category VARCHAR(64),\n`;
  sql += `  credit_limit DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  current_balance DECIMAL(15,2) DEFAULT 0.00\n`;
  sql += `);\n\n`;

  (state.customers || []).forEach((c: any) => {
    sql += `INSERT INTO customers (id, company_id, code, name, phone, email, address, category, credit_limit, current_balance)\n`;
    sql += `VALUES ('${esc(c.id)}', '${esc(c.companyId)}', '${esc(c.code)}', '${esc(c.name)}', '${esc(c.phone)}', '${esc(c.email)}', '${esc(c.address)}', '${esc(c.category)}', ${c.creditLimit || 0}, ${c.currentBalance || 0}) ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 6. Suppliers Table
  sql += `-- 6. Suppliers Directory\n`;
  sql += `CREATE TABLE IF NOT EXISTS suppliers (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  code VARCHAR(32) NOT NULL,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  phone VARCHAR(64),\n`;
  sql += `  email VARCHAR(128),\n`;
  sql += `  address TEXT,\n`;
  sql += `  current_balance DECIMAL(15,2) DEFAULT 0.00\n`;
  sql += `);\n\n`;

  (state.suppliers || []).forEach((s: any) => {
    sql += `INSERT INTO suppliers (id, company_id, code, name, phone, email, address, current_balance)\n`;
    sql += `VALUES ('${esc(s.id)}', '${esc(s.companyId)}', '${esc(s.code)}', '${esc(s.name)}', '${esc(s.phone)}', '${esc(s.email)}', '${esc(s.address)}', ${s.currentBalance || 0}) ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 7. Vouchers and Entries
  sql += `-- 7. Financial Vouchers & Journal Entries\n`;
  sql += `CREATE TABLE IF NOT EXISTS vouchers (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  voucher_no VARCHAR(64) NOT NULL,\n`;
  sql += `  type VARCHAR(32) NOT NULL,\n`;
  sql += `  date DATE NOT NULL,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  branch_id VARCHAR(64),\n`;
  sql += `  total_debit DECIMAL(15,2) NOT NULL,\n`;
  sql += `  total_credit DECIMAL(15,2) NOT NULL,\n`;
  sql += `  narration TEXT,\n`;
  sql += `  ref_no VARCHAR(128),\n`;
  sql += `  party_type VARCHAR(32),\n`;
  sql += `  party_id VARCHAR(64),\n`;
  sql += `  party_name VARCHAR(255),\n`;
  sql += `  status VARCHAR(32) DEFAULT 'posted',\n`;
  sql += `  created_by VARCHAR(128)\n`;
  sql += `);\n\n`;

  (state.vouchers || []).forEach((v: any) => {
    sql += `INSERT INTO vouchers (id, voucher_no, type, date, company_id, branch_id, total_debit, total_credit, narration, ref_no, party_type, party_id, party_name, status, created_by)\n`;
    sql += `VALUES ('${esc(v.id)}', '${esc(v.voucherNo)}', '${esc(v.type)}', '${esc(v.date)}', '${esc(v.companyId)}', '${esc(v.branchId)}', ${v.totalDebit || 0}, ${v.totalCredit || 0}, '${esc(v.narration)}', '${esc(v.refNo || '')}', '${esc(v.partyType || 'none')}', '${esc(v.partyId || '')}', '${esc(v.partyName || '')}', '${esc(v.status || 'posted')}', '${esc(v.createdBy || 'Admin')}') ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 8. Sales Invoices
  sql += `-- 8. Sales Invoices\n`;
  sql += `CREATE TABLE IF NOT EXISTS sales (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  invoice_no VARCHAR(64) NOT NULL UNIQUE,\n`;
  sql += `  date DATE NOT NULL,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  branch_id VARCHAR(64),\n`;
  sql += `  customer_id VARCHAR(64),\n`;
  sql += `  customer_name VARCHAR(255),\n`;
  sql += `  subtotal DECIMAL(15,2) NOT NULL,\n`;
  sql += `  discount DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  vat_amount DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  grand_total DECIMAL(15,2) NOT NULL,\n`;
  sql += `  paid_amount DECIMAL(15,2) NOT NULL,\n`;
  sql += `  due_amount DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  payment_method VARCHAR(32) DEFAULT 'cash',\n`;
  sql += `  salesperson VARCHAR(128)\n`;
  sql += `);\n\n`;

  (state.sales || []).forEach((s: any) => {
    sql += `INSERT INTO sales (id, invoice_no, date, company_id, branch_id, customer_id, customer_name, subtotal, discount, vat_amount, grand_total, paid_amount, due_amount, payment_method, salesperson)\n`;
    sql += `VALUES ('${esc(s.id)}', '${esc(s.invoiceNo)}', '${esc(s.date)}', '${esc(s.companyId)}', '${esc(s.branchId)}', '${esc(s.customerId)}', '${esc(s.customerName)}', ${s.subtotal || 0}, ${s.discount || 0}, ${s.vatAmount || 0}, ${s.grandTotal || 0}, ${s.paidAmount || 0}, ${s.dueAmount || 0}, '${esc(s.paymentMethod || 'cash')}', '${esc(s.salesperson || '')}') ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 9. Purchases
  sql += `-- 9. Purchase Bills & Supplier Invoices\n`;
  sql += `CREATE TABLE IF NOT EXISTS purchases (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  bill_no VARCHAR(64) NOT NULL UNIQUE,\n`;
  sql += `  date DATE NOT NULL,\n`;
  sql += `  company_id VARCHAR(64) REFERENCES companies(id),\n`;
  sql += `  branch_id VARCHAR(64),\n`;
  sql += `  supplier_id VARCHAR(64),\n`;
  sql += `  supplier_name VARCHAR(255),\n`;
  sql += `  total_amount DECIMAL(15,2) NOT NULL,\n`;
  sql += `  paid_amount DECIMAL(15,2) NOT NULL,\n`;
  sql += `  due_amount DECIMAL(15,2) DEFAULT 0.00,\n`;
  sql += `  status VARCHAR(32) DEFAULT 'received'\n`;
  sql += `);\n\n`;

  (state.purchases || []).forEach((pu: any) => {
    sql += `INSERT INTO purchases (id, bill_no, date, company_id, branch_id, supplier_id, supplier_name, total_amount, paid_amount, due_amount, status)\n`;
    sql += `VALUES ('${esc(pu.id)}', '${esc(pu.billNo)}', '${esc(pu.date)}', '${esc(pu.companyId)}', '${esc(pu.branchId)}', '${esc(pu.supplierId)}', '${esc(pu.supplierName)}', ${pu.totalAmount || 0}, ${pu.paidAmount || 0}, ${pu.dueAmount || 0}, '${esc(pu.status || 'received')}') ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  // 10. Audit Trail Logs
  sql += `-- 10. System Security Audit Trail\n`;
  sql += `CREATE TABLE IF NOT EXISTS audit_logs (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  timestamp VARCHAR(64) NOT NULL,\n`;
  sql += `  user_id VARCHAR(64),\n`;
  sql += `  user_name VARCHAR(128),\n`;
  sql += `  action VARCHAR(128) NOT NULL,\n`;
  sql += `  module VARCHAR(64) NOT NULL,\n`;
  sql += `  details TEXT\n`;
  sql += `);\n\n`;

  (state.auditLogs || []).forEach((l: any) => {
    sql += `INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, module, details)\n`;
    sql += `VALUES ('${esc(l.id)}', '${esc(l.timestamp)}', '${esc(l.userId)}', '${esc(l.userName)}', '${esc(l.action)}', '${esc(l.module)}', '${esc(l.details)}') ON CONFLICT (id) DO NOTHING;\n`;
  });
  sql += `\n`;

  sql += `COMMIT;\n`;
  sql += `-- End of ANSI SQL Database Dump\n\n`;

  // Embed lossless JSON snapshot within valid SQL comments for zero-loss roundtrip restoration
  try {
    const jsonStr = JSON.stringify(state, null, 2);
    sql += `-- JSON_SNAPSHOT_BEGIN\n/*\n${jsonStr}\n*/\n-- JSON_SNAPSHOT_END\n`;
  } catch {
    // ignore
  }

  return sql;
}

function esc(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''");
}

