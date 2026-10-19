import { NextResponse } from 'next/server';
import { getAdminCtx } from '@/server/auth/context';
import { requestPasswordReset } from '@/server/domain/users';

/** "Cambia password" dal menu utente: manda all'utente il link per sceglierne una nuova. */
export async function POST() {
  const ctx = await getAdminCtx();
  if (!ctx?.user?.email) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  await requestPasswordReset(ctx.user.email, ctx.ip);
  return NextResponse.json({ success: true });
}
