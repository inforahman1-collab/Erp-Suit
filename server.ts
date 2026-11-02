import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Enforce Port 3000 as required by AI Studio dev environment constraints
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'erp_database.json');

app.use(express.json({ limit: '10mb' }));

// Helper to load or initialize database
function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading DB_FILE, fallback to initial state', err);
    }
  }
  return null;
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database file', err);
  }
}

let dbState: any = loadDatabase();

// API Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Professional Multi-Company ERP Management System',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/state', (req: Request, res: Response) => {
  res.json({ success: true, data: dbState });
});

app.post('/api/state', (req: Request, res: Response) => {
  if (req.body && req.body.companies) {
    dbState = req.body;
    saveDatabase(dbState);
    res.json({ success: true, message: 'Central database synchronized successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid state structure' });
  }
});

app.get('/api/backup/export', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=erp_backup_${Date.now()}.json`);
  res.send(JSON.stringify(dbState || {}, null, 2));
});

// SQL Database Dump Endpoint
app.get('/api/backup/sql', (req: Request, res: Response) => {
  if (!dbState) {
    return res.status(500).send('-- Database uninitialized');
  }
  const timestamp = new Date().toISOString();
  let sql = `-- Multi-Company ERP SQL Dump (${timestamp})\nBEGIN TRANSACTION;\n`;

  // Tables & Inserts
  (dbState.companies || []).forEach((c: any) => {
    sql += `INSERT INTO companies (id, name, code) VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.code}') ON CONFLICT DO NOTHING;\n`;
  });
  (dbState.accounts || []).forEach((a: any) => {
    sql += `INSERT INTO chart_of_accounts (id, code, name, type, current_balance) VALUES ('${a.id}', '${a.code}', '${a.name.replace(/'/g, "''")}', '${a.type}', ${a.currentBalance || 0}) ON CONFLICT DO NOTHING;\n`;
  });
  (dbState.vouchers || []).forEach((v: any) => {
    sql += `INSERT INTO vouchers (id, voucher_no, type, date, total_debit, total_credit, narration) VALUES ('${v.id}', '${v.voucherNo}', '${v.type}', '${v.date}', ${v.totalDebit || 0}, ${v.totalCredit || 0}, '${(v.narration || '').replace(/'/g, "''")}') ON CONFLICT DO NOTHING;\n`;
  });
  sql += `COMMIT;\n`;

  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', `attachment; filename=erp_database_${Date.now()}.sql`);
  res.send(sql);
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  if (req.body && req.body.companies) {
    dbState = req.body;
    saveDatabase(dbState);
    res.json({ success: true, message: 'Backup restored successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid backup file payload' });
  }
});

// Automated Daily Report API
app.get('/api/reports/daily', (req: Request, res: Response) => {
  const companyId = (req.query.companyId as string) || 'comp_apex';
  const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

  if (!dbState) {
    return res.status(500).json({ success: false, error: 'Database uninitialized' });
  }

  const sales = (dbState.sales || []).filter((s: any) => s.companyId === companyId && s.date === targetDate);
  const purchases = (dbState.purchases || []).filter((p: any) => p.companyId === companyId && p.date === targetDate);
  const vouchers = (dbState.vouchers || []).filter((v: any) => v.companyId === companyId && v.date === targetDate);

  const totalSales = sales.reduce((acc: number, s: any) => acc + (s.grandTotal || 0), 0);
  const totalPurchases = purchases.reduce((acc: number, p: any) => acc + (p.grandTotal || 0), 0);
  const cashCollected = sales.reduce((acc: number, s: any) => acc + (s.paidAmount || 0), 0);

  res.json({
    success: true,
    companyId,
    date: targetDate,
    summary: {
      totalSales,
      totalPurchases,
      cashCollected,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      vouchersCount: vouchers.length,
    },
    generatedAt: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Central Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
