/**
 * Isolated Print Engine for ERP Vouchers, Invoices, and Reports
 * Eliminates background bleed, modal overlays, sidebars, and navbar prints.
 * Handles iframe sandbox security restrictions by rendering isolated clean print tabs.
 */

export interface PrintSettings {
  paperSize: 'a4' | 'a4_landscape' | 'a5' | 'pos_80mm';
  showCompanyHeader: boolean;
  showSignatures: boolean;
  showSeal: boolean;
  copies: 1 | 2 | 3;
  copyLabel?: string;
  zoomScale?: number; // e.g. 100, 90, 80
  autoPrint?: boolean;
}

export const defaultPrintSettings: PrintSettings = {
  paperSize: 'a4',
  showCompanyHeader: true,
  showSignatures: true,
  showSeal: true,
  copies: 1,
  zoomScale: 100,
  autoPrint: true,
};

/**
 * Open standalone clean print tab / popout
 * When autoPrint is true, triggers system print dialog immediately.
 * Always renders a floating toolbar (hidden during paper print) so user can reprint anytime.
 */
export function openPrintPreviewTab(
  htmlContent: string,
  title: string = 'Voucher Document',
  settings: PrintSettings = defaultPrintSettings,
  autoPrintOverride?: boolean
): void {
  let pageSize = 'size: A4 portrait; margin: 10mm 12mm;';
  if (settings.paperSize === 'a4_landscape') {
    pageSize = 'size: A4 landscape; margin: 10mm 12mm;';
  } else if (settings.paperSize === 'a5') {
    pageSize = 'size: A5 portrait; margin: 6mm 8mm;';
  } else if (settings.paperSize === 'pos_80mm') {
    pageSize = 'size: 80mm auto; margin: 3mm 4mm;';
  }

  const isPos = settings.paperSize === 'pos_80mm';
  const shouldAutoPrint = autoPrintOverride !== undefined ? autoPrintOverride : (settings.autoPrint !== false);

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { ${pageSize} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: ${isPos ? '11px' : '12px'};
          line-height: 1.4;
          padding: ${isPos ? '4px' : '16px'};
        }
        .voucher-copy { page-break-after: always; margin-bottom: 24px; }
        .voucher-copy:last-child { page-break-after: avoid; margin-bottom: 0; }
        .copy-tag {
          text-align: right;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: bold;
          margin-bottom: 6px;
          padding-bottom: 3px;
          border-bottom: 1px dashed #cbd5e1;
        }
        @media print {
          body { padding: 0 !important; background: #ffffff !important; }
          .print-toolbar { display: none !important; }
        }
        .print-toolbar {
          position: sticky;
          top: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #334155;
          margin: -16px -16px 16px -16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
        }
        .print-toolbar button {
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          padding: 6px 14px;
          border-radius: 6px;
          border: none;
          transition: background 0.15s ease;
        }
        .btn-print { background: #e11d48; color: #ffffff; }
        .btn-print:hover { background: #be123c; }
        .btn-close { background: rgba(255,255,255,0.15); color: #ffffff; margin-left: 8px; }
        .btn-close:hover { background: rgba(255,255,255,0.25); }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <div>
          <span style="font-weight: bold; font-size: 13px;">${title}</span>
          <span style="margin-left: 8px; font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
            ${settings.paperSize.replace('_', ' ')} · ${settings.copies} ${settings.copies === 1 ? 'Copy' : 'Copies'}
          </span>
        </div>
        <div>
          <button class="btn-print" onclick="window.print()">Print Document</button>
          <button class="btn-close" onclick="window.close()">Close Window</button>
        </div>
      </div>
      ${generateCopiesHtml(htmlContent, settings)}
      ${
        shouldAutoPrint
          ? `
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 350);
        };
      </script>
      `
          : ''
      }
    </body>
    </html>
  `;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, '_blank');

  // If popup was blocked by browser security
  if (!win) {
    const existingBanner = document.getElementById('erp-popup-blocked-banner');
    if (existingBanner) existingBanner.remove();

    const alertDiv = document.createElement('div');
    alertDiv.id = 'erp-popup-blocked-banner';
    alertDiv.style.cssText =
      'position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 18px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.35);z-index:999999;display:flex;align-items:center;gap:12px;font-family:sans-serif;font-size:12px;border:1px solid #334155;';
    alertDiv.innerHTML = `
      <span style="font-weight:600;">Popup blocked by browser. Click to open print window:</span>
      <a href="${blobUrl}" target="_blank" style="background:#e11d48;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:11px;">Open Print Window</a>
      <button style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;padding:0 4px;" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 12000);
  }
}

/**
 * Print isolated document using the clean top-level window context.
 * Bypasses iframe sandbox restrictions and triggers the system print dialog immediately.
 */
export function printIsolatedDocument(
  htmlContent: string,
  title: string = 'Voucher Document',
  settings: PrintSettings = defaultPrintSettings
): void {
  openPrintPreviewTab(htmlContent, title, { ...settings, autoPrint: true }, true);
}

/**
 * Helper to print an HTML element by selector or ID in an isolated clean tab
 */
export function printElementContent(
  elementIdOrSelector: string,
  title: string = 'ERP Report',
  companyName: string = 'BD Accounting ERP'
): void {
  const el =
    document.getElementById(elementIdOrSelector) ||
    document.querySelector(elementIdOrSelector);

  if (!el) {
    // If element not directly found, attempt window print with fallback
    window.print();
    return;
  }

  const cleanHtml = `
    <div style="text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;">
      <h2 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase; color: #0f172a;">${companyName}</h2>
      <h3 style="font-size: 14px; color: #475569; margin: 4px 0 0 0;">${title}</h3>
      <p style="font-size: 10px; color: #94a3b8; margin: 4px 0 0 0;">Generated on: ${new Date().toLocaleString()}</p>
    </div>
    <div class="report-content-body">
      ${el.innerHTML}
    </div>
  `;

  openPrintPreviewTab(
    cleanHtml,
    title,
    {
      ...defaultPrintSettings,
      paperSize: 'a4_landscape',
      showCompanyHeader: true,
      copies: 1,
      autoPrint: true,
    },
    true
  );
}

export function generateCopiesHtml(contentHtml: string, settings: PrintSettings): string {
  const copyLabels = [
    'Original (Accounts Copy)',
    'Duplicate (Party Copy)',
    'Triplicate (Auditor Copy)',
  ];
  let fullOutput = '';

  for (let i = 0; i < settings.copies; i++) {
    const label = copyLabels[i] || `Copy #${i + 1}`;
    fullOutput += `
      <div class="voucher-copy">
        <div class="copy-tag">${label}</div>
        ${contentHtml}
      </div>
    `;
  }
  return fullOutput;
}
