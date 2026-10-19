import { refundsCsv } from '@/server/admin/refund-export';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ edition: string }> }) {
  return refundsCsv((await params).edition);
}
