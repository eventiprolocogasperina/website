import { refundsCsv } from '@/server/admin/refund-export';

export const dynamic = 'force-dynamic';

export function GET() {
  return refundsCsv(null);
}
