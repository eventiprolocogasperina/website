import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { toErrorBody } from '@/server/domain/errors';
import { checkHealth, healthMessage } from '@/server/domain/notifications/health';
import { eveningSummaries } from '@/server/domain/notifications/reports';
import { alertChatId, telegramClient } from '@/server/integrations/telegram';
import { log } from '@/server/log';

// Vercel Cron (vercel.json) chiama questo indirizzo ogni sera con "Authorization: Bearer CRON_SECRET":
// riepilogo delle edizioni in vendita e controllo del sito, che scrive solo se qualcosa non va.
export const dynamic = 'force-dynamic';

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const chat = await alertChatId();
    const summaries = await eveningSummaries();
    for (const text of summaries) await telegramClient().sendMessage(chat, text);
    const checks = await checkHealth();
    const problems = checks.filter((c) => !c.ok);
    if (problems.length) await telegramClient().sendMessage(chat, healthMessage(checks, '⚠️ <b>Controllo serale: qualcosa non va</b>'));
    return NextResponse.json({ summaries: summaries.length, problems: problems.map((p) => p.name) });
  } catch (error) {
    log.error('Riepilogo serale non riuscito', { error });
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
