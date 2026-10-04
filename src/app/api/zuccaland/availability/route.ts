import { NextResponse } from 'next/server';
import { getZuccalandDateCounts } from '@/lib/data/tickets';
import { getPageContent, DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [counts, pageContent] = await Promise.all([
      getZuccalandDateCounts(),
      getPageContent<ZuccalandContent>('zuccaland', DEFAULT_ZUCCALAND_CONTENT)
    ]);

    const dateLimits = {
      '10': { ...DEFAULT_ZUCCALAND_CONTENT.dateLimits!['10'], ...(pageContent.dateLimits?.['10'] || {}) },
      '11': { ...DEFAULT_ZUCCALAND_CONTENT.dateLimits!['11'], ...(pageContent.dateLimits?.['11'] || {}) },
      '25': { ...DEFAULT_ZUCCALAND_CONTENT.dateLimits!['25']!, ...(pageContent.dateLimits?.['25'] || {}) },
    };

    const isSoldOut10 = Boolean(
      dateLimits['10'].manualSoldOut ||
      (dateLimits['10'].enabled && counts['10'].admissionTickets >= dateLimits['10'].maxTickets)
    );

    const isSoldOut11 = Boolean(
      dateLimits['11'].manualSoldOut ||
      (dateLimits['11'].enabled && counts['11'].admissionTickets >= dateLimits['11'].maxTickets)
    );

    const is25Active = Boolean(dateLimits['25'].active);
    const isSoldOut25 = Boolean(
      !is25Active ||
      dateLimits['25'].manualSoldOut ||
      (dateLimits['25'].enabled && counts['25'].admissionTickets >= dateLimits['25'].maxTickets)
    );

    const remaining10 = dateLimits['10'].enabled
      ? Math.max(0, dateLimits['10'].maxTickets - counts['10'].admissionTickets)
      : null;

    const remaining11 = dateLimits['11'].enabled
      ? Math.max(0, dateLimits['11'].maxTickets - counts['11'].admissionTickets)
      : null;

    const remaining25 = (is25Active && dateLimits['25'].enabled)
      ? Math.max(0, dateLimits['25'].maxTickets - counts['25'].admissionTickets)
      : null;

    const allSoldOut = is25Active
      ? (isSoldOut10 && isSoldOut11 && isSoldOut25)
      : (isSoldOut10 && isSoldOut11);

    return NextResponse.json({
      success: true,
      counts,
      limits: dateLimits,
      soldOut: {
        '10': isSoldOut10,
        '11': isSoldOut11,
        '25': isSoldOut25,
      },
      remaining: {
        '10': remaining10,
        '11': remaining11,
        '25': remaining25,
      },
      allSoldOut,
    });
  } catch (error: any) {
    console.error('Failed to get Zuccaland availability:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
