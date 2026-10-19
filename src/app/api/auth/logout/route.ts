import { NextResponse } from 'next/server';
import { getAdminCtx } from '@/server/auth/context';
import { destroySession } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { audit } from '@/server/domain/audit';

export async function POST() {
  const ctx = await getAdminCtx();
  await destroySession('admin');
  if (ctx) await audit(getDb(), ctx, 'auth.logout', ctx.user ? { entityType: 'user', entityId: ctx.user.id } : {});
  return NextResponse.json({ success: true });
}
