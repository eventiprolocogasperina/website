import { NextResponse } from 'next/server';
import { getDiscountByCode } from '@/lib/data/tickets';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Codice mancante' }, { status: 400 });
    }

    const discount = await getDiscountByCode(code);

    if (!discount) {
      return NextResponse.json({ error: 'Codice non valido o scaduto' }, { status: 404 });
    }

    if (discount.max_uses > 0 && discount.current_uses >= discount.max_uses) {
      return NextResponse.json({ error: 'Codice esaurito' }, { status: 400 });
    }

    return NextResponse.json(discount);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
