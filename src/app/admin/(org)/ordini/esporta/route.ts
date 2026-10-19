import { ordersCsv } from '@/server/admin/order-export';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return ordersCsv(req, null);
}
