import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SafeResend as Resend } from '@/server/email/resend';
import { requestIp } from '@/server/auth/context';
import { isRateLimited, recordFailure } from '@/server/auth/rateLimit';
import { log } from '@/server/log';
import { CONTACT_INBOX, CONTACT_SUBJECTS } from '@/lib/public/contact';

// The route is anonymous: it only ever writes to the association's own inbox (never to an address from the
// request), the subject comes from a fixed list and the visitor's address is only used as reply-to.
const Contact = z.object({
  nome: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  oggetto: z.enum(CONTACT_SUBJECTS),
  messaggio: z.string().trim().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot: people leave it empty
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export async function POST(request: Request) {
  try {
    const rateKey = `public:contact:${(await requestIp()) ?? 'sconosciuto'}`;
    if (isRateLimited(rateKey, 3)) {
      return NextResponse.json({ error: 'Troppi messaggi. Aspetta qualche minuto e riprova.' }, { status: 429 });
    }
    recordFailure(rateKey);

    const parsed = Contact.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Controlla nome, email e messaggio e riprova.' }, { status: 400 });
    }
    const { nome, email, oggetto, messaggio } = parsed.data;

    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
    const { error } = await resend.emails.send({
      from: 'Pro Loco Gasperina <noreply@prolocogasperina.it>',
      to: CONTACT_INBOX,
      replyTo: email,
      subject: `Dal sito: ${oggetto}`,
      html: `<div style="font-family: Arial, sans-serif; color: #1a1510;">
        <p><strong>${escapeHtml(nome)}</strong> (${escapeHtml(email)}) ha scritto dal modulo contatti.</p>
        <p style="white-space: pre-wrap;">${escapeHtml(messaggio)}</p>
      </div>`,
    });
    if (error) {
      log.error('Contatti: invio email non riuscito', { error: error.message });
      return NextResponse.json({ error: 'Non siamo riusciti a inviare il messaggio. Scrivici a ' + CONTACT_INBOX }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error('Contatti: errore imprevisto', { error });
    return NextResponse.json({ error: 'Qualcosa è andato storto. Riprova più tardi.' }, { status: 500 });
  }
}
