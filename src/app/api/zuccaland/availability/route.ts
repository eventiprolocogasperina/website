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

    const defLimits = DEFAULT_ZUCCALAND_CONTENT.dateLimits!;
    const pageLimits = pageContent.dateLimits || {};

    const dateLimits = {
      '17': { ...defLimits['17']!, ...(pageLimits['17'] || {}) },
      '18': { ...defLimits['18']!, ...(pageLimits['18'] || {}) },
      '24': { ...defLimits['24']!, ...(pageLimits['24'] || {}) },
      '25': { ...defLimits['25']!, ...(pageLimits['25'] || {}) },
      '10': { ...defLimits['10']!, ...(pageLimits['10'] || {}) },
      '11': { ...defLimits['11']!, ...(pageLimits['11'] || {}) },
    };

    // 17 e 18 sono date di recupero riservate ai biglietti del 10 e 11, NON acquistabili dal pubblico
    const is17Active = Boolean(dateLimits['17'].active ?? true);
    const isSoldOut17 = true; // Non acquistabile per il pubblico (capienza riservata al recupero del 10 Ottobre)

    const is18Active = Boolean(dateLimits['18'].active ?? true);
    const isSoldOut18 = true; // Non acquistabile per il pubblico (capienza riservata al recupero dell'11 Ottobre)

    const is24Active = Boolean(dateLimits['24'].active); // Inattiva per ora, attivabile da CMS
    const isSoldOut24 = Boolean(
      !is24Active ||
      dateLimits['24'].manualSoldOut ||
      (dateLimits['24'].enabled && counts['24'].admissionTickets >= dateLimits['24'].maxTickets)
    );

    const is25Active = Boolean(dateLimits['25'].active ?? true);
    const isSoldOut25 = Boolean(
      !is25Active ||
      dateLimits['25'].manualSoldOut ||
      (dateLimits['25'].enabled && counts['25'].admissionTickets >= dateLimits['25'].maxTickets)
    );

    const is10Active = false;
    const isSoldOut10 = true;

    const is11Active = false;
    const isSoldOut11 = true;

    const remaining17 = 0;
    const remaining18 = 0;

    const remaining24 = (is24Active && dateLimits['24'].enabled)
      ? Math.max(0, dateLimits['24'].maxTickets - counts['24'].admissionTickets)
      : null;

    const remaining25 = (is25Active && dateLimits['25'].enabled)
      ? Math.max(0, dateLimits['25'].maxTickets - counts['25'].admissionTickets)
      : null;

    const maxYouPick24 = dateLimits['24'].maxYouPickTickets ?? 50;
    const isYouPickSoldOut24 = Boolean(
      dateLimits['24'].manualYouPickSoldOut ||
      counts['24'].youPickTickets >= maxYouPick24
    );
    const remainingYouPick24 = Math.max(0, maxYouPick24 - counts['24'].youPickTickets);

    // Date attualmente aperte all'acquisto pubblico: 24 (se attiva) e 25
    const purchasableDatesList = [
      ...(is24Active ? [{ key: '24', soldOut: isSoldOut24 }] : []),
      { key: '25', active: is25Active, soldOut: isSoldOut25 },
    ];

    const allSoldOut = purchasableDatesList.length > 0 && purchasableDatesList.every(d => d.soldOut);

    return NextResponse.json({
      success: true,
      counts,
      limits: dateLimits,
      active: {
        '17': is17Active,
        '18': is18Active,
        '24': is24Active,
        '25': is25Active,
        '10': is10Active,
        '11': is11Active,
      },
      soldOut: {
        '17': isSoldOut17,
        '18': isSoldOut18,
        '24': isSoldOut24,
        '25': isSoldOut25,
        '10': isSoldOut10,
        '11': isSoldOut11,
      },
      remaining: {
        '17': remaining17,
        '18': remaining18,
        '24': remaining24,
        '25': remaining25,
        '10': null,
        '11': null,
      },
      youPickSoldOut: {
        '24': isYouPickSoldOut24,
      },
      youPickRemaining: {
        '24': remainingYouPick24,
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
