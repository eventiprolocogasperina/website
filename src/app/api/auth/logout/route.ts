import { NextResponse } from 'next/server';
import { destroySession } from '@/server/auth/session';

export async function POST() {
  await destroySession('admin');
  return NextResponse.json({ success: true });
}
