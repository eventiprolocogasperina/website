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
<style>
*{box-sizing:border-box}body{font-family:'DM Sans',system-ui,sans-serif;background:linear-gradient(180deg,#e9eef7,#f7f9fc);margin:0;min-height:100vh;color:#151a2b}
.bar{background:#0b1f4d;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;font-size:14px}
.bar b{font-size:17px;letter-spacing:.02em}.bar span{opacity:.8}
.sim{background:#fef3c7;color:#92400e;text-align:center;font-size:13px;font-weight:600;padding:8px 16px}
main{max-width:440px;margin:28px auto;padding:0 16px}
.card{background:#fff;border-radius:16px;box-shadow:0 12px 40px -16px rgb(11 31 77/.35);overflow:hidden}
.head{padding:22px 24px;border-bottom:1px solid #e2e5ec}.head small{color:#5b6377;font-size:13px}
.amount{font-size:34px;font-weight:700;margin:4px 0 2px}.merchant{font-size:14px;color:#5b6377}
.body{padding:20px 24px 24px}.fake{display:flex;gap:10px;align-items:center;border:1px solid #d5d9e2;border-radius:10px;padding:12px 14px;color:#5b6377;font-size:14px;margin-bottom:16px}
.fake i{font-style:normal;background:#1a1f71;color:#fff;font-weight:700;font-size:11px;padding:3px 6px;border-radius:4px}
button{display:block;width:100%;margin-top:10px;font:inherit;font-size:15px;padding:13px;border-radius:10px;border:1px solid #c6cbd6;background:#fff;color:#151a2b;cursor:pointer;text-align:left}
button:hover{background:#f3f5f9}button small{display:block;color:#5b6377;font-size:12.5px;margin-top:2px}
button.ok{background:#15803d;color:#fff;border:0;text-align:center;font-weight:700;font-size:16px;padding:15px}button.ok:hover{background:#166534}
.lock{margin-top:16px;text-align:center;font-size:12.5px;color:#5b6377}
</style></head>
<body><div class="bar"><b>Nexi XPay</b><span>🔒 Pagamento protetto</span></div>
<p class="sim">SIMULATORE: nessun pagamento vero</p>
<main><div class="card"><div class="head"><small>Stai pagando</small><p class="amount">${euro} €</p><p class="merchant">Pro Loco Gasperina · ordine ${esc(f.codTrans)}</p></div>
<div class="body"><div class="fake"><i>VISA</i> •••• •••• •••• 4242 <span style="margin-left:auto">12/30</span></div>
<form method="post">${hidden}
<button class="ok" name="scelta" value="OK">Paga</button>
<button name="scelta" value="KO" aria-label="Carta rifiutata">Carta rifiutata<small>Torni al sito con un pagamento non riuscito.</small></button>
<button name="scelta" value="ANNULLO" aria-label="Annulla">Annulla<small>Torni al sito senza pagare: l’ordine resta in attesa.</small></button>
<button name="scelta" value="IMPORTO" aria-label="Paga un importo sbagliato">Paga un importo sbagliato (prova dell'allarme)<small>Paga 1 € in meno: l’ordine non deve risultare pagato.</small></button>
</form><p class="lock">Su Nexi vero qui inserisci i dati della carta.</p></div></div></main></body></html>`,
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
