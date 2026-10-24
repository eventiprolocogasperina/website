import { ordersCsv } from '@/server/admin/order-export';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ edition: string }> }) {
  return ordersCsv(req, (await params).edition);
}
