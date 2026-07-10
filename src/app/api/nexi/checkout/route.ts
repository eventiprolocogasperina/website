import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrder } from '@/lib/data/tickets';

const NEXI_ALIAS = process.env.NEXI_ALIAS!;
const NEXI_MAC_KEY = process.env.NEXI_MAC_KEY!;
const NEXI_ENDPOINT = process.env.NEXI_ENDPOINT || 'https://int-ecommerce.nexi.it/ecomm/ecomm/DispatcherServlet';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  try {
    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Nexi requires amount in cents without decimals (e.g. €20 = "2000")
    const importo = Math.round(order.totalAmount * 100).toString();
    // Per Nexi docs: divisa must be "EUR" (not numeric code)
    const divisa = 'EUR';
    // codTrans: alphanumeric only, max 30 chars. We generate it exactly like this in /api/orders
    const codTrans = order.id;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    const url = `${baseUrl}/api/nexi/callback`;
    const url_back = `${baseUrl}/assaggia-e-passeggia/ticket`;

    // Official Nexi XPAY MAC formula (Pagamento Semplice):
    // SHA1(codTrans=<val>divisa=<val>importo=<val><SecretKey>)
    // Fields concatenated directly with "campo=valore" format, no separators between fields
    const macString = `codTrans=${codTrans}divisa=${divisa}importo=${importo}${NEXI_MAC_KEY}`;
    const mac = crypto.createHash('sha1').update(macString).digest('hex');

    // Per official Nexi documentation: the payment request MUST be sent via HTTP POST.
    // We return an HTML page with an auto-submitting form.
    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Reindirizzamento al pagamento...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a1a; color: white; }
    .box { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: rgba(255,255,255,0.7); font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Reindirizzamento alla pagina di pagamento sicuro...</p>
  </div>
  <form id="nexiForm" method="POST" action="${NEXI_ENDPOINT}">
    <input type="hidden" name="alias" value="${NEXI_ALIAS}" />
    <input type="hidden" name="importo" value="${importo}" />
    <input type="hidden" name="divisa" value="${divisa}" />
    <input type="hidden" name="codTrans" value="${codTrans}" />
    <input type="hidden" name="mac" value="${mac}" />
    <input type="hidden" name="url" value="${url}" />
    <input type="hidden" name="url_back" value="${url_back}" />
    <input type="hidden" name="languageId" value="ITA" />
  </form>
  <script>document.getElementById('nexiForm').submit();</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Nexi checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
