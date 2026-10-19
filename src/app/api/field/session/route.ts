import { NextResponse } from 'next/server';
import { getAdminCtx, getDevice, getFieldCtx, legacyEventCodeEnabled } from '@/server/auth/context';
import { listFieldUsers } from '@/server/domain/devices';
import { listEditions } from '@/server/domain/editions';

export const dynamic = 'force-dynamic';

/**
 * Stato dell'accesso sulle app da campo (cassa e scanner): dispositivo abbinato, volontario entrato
 * con il PIN, chi può entrare su questo dispositivo e se vale ancora il codice evento.
 */
export async function GET() {
  const [device, field, admin, legacyCode] = await Promise.all([getDevice(), getFieldCtx(), getAdminCtx(), legacyEventCodeEnabled()]);
  const edition = device ? (await listEditions()).find((e) => e.slug === device.edition) : null;
  return NextResponse.json({
    device: device ? { name: device.name, kind: device.kind, edition: device.edition, editionTitle: edition?.title ?? device.edition } : null,
    user: field?.user ? { id: field.user.id, name: field.user.name } : null,
    users: device && !field ? await listFieldUsers(device) : [],
    admin: admin ? { name: admin.user?.name ?? 'Amministratore' } : null,
    legacyCode,
  });
}
