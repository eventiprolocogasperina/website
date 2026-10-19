import { NextResponse } from 'next/server';
import { processResult, requestMac, resultMac, simulatorAllowed, simulatorMacKey } from '@/server/integrations/nexi';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Simulatore di Nexi, SOLO in locale (NEXI_MODE=simulatore, mai su Vercel in produzione):
 * mostra una finta pagina di pagamento e risponde come Nexi, con notifica server-to-server e ritorno del browser
 * firmati con la stessa chiave. Serve per i test end-to-end e per provare il checkout senza credenziali.
 */
export async function POST(req: Request) {
  if (!simulatorAllowed()) return new Response('Non trovato', { status: 404 });
  const f = Object.fromEntries([...(await req.formData())].map(([k, v]) => [k, String(v)]));
  const key = simulatorMacKey();

  if (!f.scelta) {
    if (requestMac({ codTrans: f.codTrans, divisa: f.divisa, importo: f.importo }, key) !== f.mac) return new Response('MAC della richiesta non valido', { status: 400 });
    const hidden = ['codTrans', 'importo', 'divisa', 'url', 'url_back']
      .map((k) => `<input type="hidden" name="${k}" value="${esc(f[k] ?? '')}">`)
      .join('');
    const euro = (Number(f.importo) / 100).toFixed(2).replace('.', ',');
    return new NextResponse(
      `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulatore Nexi</title>
<style>body{font-family:system-ui,sans-serif;background:#eef0f5;margin:0;padding:32px 16px;color:#151a2b}main{max-width:420px;margin:auto;background:#fff;border-radius:12px;padding:24px}button{display:block;width:100%;margin-top:10px;font:inherit;padding:12px;border-radius:8px;border:1px solid #858c9f;background:#fff}button.ok{background:#15803d;color:#fff;border:0}</style></head>
<body><main><p style="font-size:13px;color:#b45309">SIMULATORE: nessun pagamento vero</p><h1 style="font-size:20px">Paga ${euro} €</h1><p>Transazione ${esc(f.codTrans)}</p>
<form method="post">${hidden}
<button class="ok" name="scelta" value="OK">Paga</button>
<button name="scelta" value="KO">Carta rifiutata</button>
<button name="scelta" value="ANNULLO">Annulla</button>
<button name="scelta" value="IMPORTO">Paga un importo sbagliato (prova dell'allarme)</button>
</form></main></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  if (f.scelta === 'ANNULLO') return NextResponse.redirect(f.url_back, 303);
  const now = new Date();
  const esito = f.scelta === 'KO' ? 'KO' : 'OK';
  const p: Record<string, string> = {
    codTrans: f.codTrans,
    esito,
    importo: f.scelta === 'IMPORTO' ? String(Number(f.importo) - 100) : f.importo,
    divisa: f.divisa,
    data: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    orario: `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
    codAut: esito === 'OK' ? 'SIM' + now.getTime().toString(36).slice(-4).toUpperCase() : '',
    codiceEsito: esito === 'OK' ? '0' : '102',
    messaggio: esito === 'OK' ? 'Message OK' : 'Carta rifiutata',
    brand: 'VISA',
  };
  p.mac = resultMac(p, key);
  // Come Nexi: prima la notifica al server, poi il ritorno del browser (che arriva con gli stessi dati).
  await processResult(p, 'server');
  const url = new URL(f.url);
  for (const [k, v] of Object.entries(p)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString(), 303);
}
