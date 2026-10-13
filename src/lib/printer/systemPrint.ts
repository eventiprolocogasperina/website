import { CashierOrder, CashierPrinterSettings, DEFAULT_PRINTER_SETTINGS } from '@/lib/data/cashier';

/**
 * Fallback browser printing that strictly respects the configured millimeter width.
 * Useful if Web Bluetooth is unavailable (e.g. Safari) or if printing via an OS spooler.
 */
export function printTicketViaBrowser(
  order: CashierOrder,
  settings: CashierPrinterSettings = DEFAULT_PRINTER_SETTINGS,
  type: 'customer' | 'department' | 'all' = 'customer',
  qrCodeDataUrl?: string
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Rimuovi eventuali iframe di stampa precedenti per evitare accumulo nel DOM
  const existingIframe = document.getElementById('cashier-system-print-iframe');
  if (existingIframe) {
    try { existingIframe.remove(); } catch {}
  }

  // Crea un iframe nascosto isolato per non bloccare il thread della pagina principale
  const iframe = document.createElement('iframe');
  iframe.id = 'cashier-system-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const printDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!printDoc) return;

  const widthMm = settings.ticketWidthMm || 58;
  const orderNumStr = String(order.orderNumber).padStart(3, '0');
  const dateStr = new Date(order.createdAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 1. Customer Receipt HTML
  const customerHtml = `
    <div class="ticket">
      <div class="center bold title">${settings.headerTitle || 'PRO LOCO GASPERINA APS'}</div>
      <div class="center sub">${order.eventName}</div>
      <hr class="divider-dash" />
      <div class="center bold order-title">TICKET ORDINE</div>
      <div class="center bold big-num">#${orderNumStr}</div>
      <div class="center meta">${order.cassaName}${order.operatorName ? ` · ${order.operatorName}` : ''}</div>
      <div class="center meta">${dateStr}</div>
      <hr class="divider-solid" />
      <table class="items-table">
        ${order.items.map(it => `
          <tr>
            <td class="qty">${it.quantity}x</td>
            <td class="name">${it.name}</td>
            <td class="price">€${(it.price * it.quantity).toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <hr class="divider-dash" />
      <div class="total-row">
        <span>TOTALE:</span>
        <span class="total-amount">€${Number(order.totalAmount).toFixed(2)}</span>
      </div>
      <div class="meta" style="margin-top: 4px;">Pagamento: ${order.paymentMethod}</div>
      ${order.paymentMethod === 'CONTANTI' && order.cashChange !== undefined && order.cashChange > 0 ? `
        <div class="meta">Ricevuto: €${Number(order.cashReceived || 0).toFixed(2)} / Resto: €${Number(order.cashChange).toFixed(2)}</div>
      ` : ''}
      ${order.omaggioNote ? `<div class="meta note">Note: ${order.omaggioNote}</div>` : ''}
      ${settings.showQrCode && qrCodeDataUrl ? `
        <div class="center qr-box">
          <img src="${qrCodeDataUrl}" class="qr-img" alt="QR Ricevuta" />
          <div class="qr-text">Inquadra per la ricevuta</div>
        </div>
      ` : ''}
      ${settings.footerText ? `
        <hr class="divider-dash" />
        <div class="center footer-text">${settings.footerText}</div>
      ` : ''}
    </div>
  `;

  // 2. Department Slips HTML
  const deptsMap: Record<string, typeof order.items> = {};
  order.items.forEach(it => {
    const dept = it.department || it.category || 'Generale';
    if (!deptsMap[dept]) deptsMap[dept] = [];
    deptsMap[dept].push(it);
  });

  const departmentSlipsHtml = Object.entries(deptsMap).map(([dept, items]) => `
    <div class="ticket dept-slip">
      <div class="center dept-badge">STAND / REPARTO: ${dept.toUpperCase()}</div>
      <hr class="divider-solid" />
      <div class="center bold big-num">#${orderNumStr}</div>
      <div class="center meta">${order.eventName} · ${order.cassaName}</div>
      <div class="center meta">${dateStr}</div>
      ${order.omaggioNote ? `<div class="meta note">NOTE: ${order.omaggioNote}</div>` : ''}
      <hr class="divider-solid" />
      <table class="items-table dept-table">
        ${items.map(it => `
          <tr>
            <td class="qty big-qty">${it.quantity}x</td>
            <td class="name big-name">${it.name}</td>
          </tr>
        `).join('')}
      </table>
      <hr class="divider-dash" />
      <div class="center footer-text">PRO LOCO GASPERINA · COMANDA REPARTO</div>
    </div>
  `).join('<div class="page-break"></div>');

  let bodyContent = '';
  if (type === 'customer') {
    bodyContent = customerHtml;
  } else if (type === 'department') {
    bodyContent = departmentSlipsHtml;
  } else {
    bodyContent = `${customerHtml}<div class="page-break"></div>${departmentSlipsHtml}`;
  }

  printDoc.open();
  printDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Ticket #${orderNumStr} (${widthMm}mm)</title>
      <style>
        @page {
          size: ${widthMm}mm auto;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
          margin: 0 auto;
          padding: 2mm 3mm;
          width: ${widthMm}mm;
          color: #000;
          background: #fff;
          font-size: 11px;
          line-height: 1.25;
        }
        .ticket {
          width: 100%;
          page-break-inside: avoid;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .title { font-size: 13px; letter-spacing: 0.5px; }
        .sub { font-size: 10px; margin-bottom: 3px; }
        .order-title { font-size: 11px; letter-spacing: 1px; }
        .big-num { font-size: 32px; line-height: 1.1; margin: 2px 0; }
        .meta { font-size: 9.5px; }
        .note { font-weight: 800; margin-top: 3px; }
        .divider-dash { border: none; border-top: 1px dashed #000; margin: 4px 0; }
        .divider-solid { border: none; border-top: 1.5px solid #000; margin: 4px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        .items-table td { padding: 2px 1px; vertical-align: top; }
        .items-table .qty { width: 22px; font-weight: 900; }
        .items-table .name { font-weight: 700; word-break: break-word; }
        .items-table .price { text-align: right; width: 45px; font-weight: 800; }
        .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 4px; }
        .total-amount { font-size: 15px; }
        .qr-box { margin-top: 6px; }
        .qr-img { width: 68px; height: 68px; display: inline-block; }
        .qr-text { font-size: 8.5px; margin-top: 2px; }
        .footer-text { font-size: 9px; font-weight: 700; margin-top: 4px; }
        .dept-badge { font-weight: 900; font-size: 12px; background: #000; color: #fff; padding: 3px; border-radius: 2px; }
        .big-qty { font-size: 16px; font-weight: 900; width: 30px; }
        .big-name { font-size: 14px; font-weight: 800; }
        .page-break { page-break-after: always; height: 10px; }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `);
  printDoc.close();

  // Attendi brevemente per garantire che immagini o stili siano processati, poi apri la stampa via iframe in modo asincrono
  setTimeout(() => {
    try {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      }
    } catch (err) {
      console.error('System print iframe failed:', err);
    }
  }, 250);
}
