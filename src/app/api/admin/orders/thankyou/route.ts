import { NextResponse } from 'next/server';
import React from 'react';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import { ThankYouEmailDocument } from '@/lib/tickets/ThankYouEmailDocument';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { eventId } = data;

    if (!eventId) {
      return NextResponse.json({ error: 'Manca eventId' }, { status: 400 });
    }

    if (!process.env.POSTGRES_URL) {
      throw new Error('Missing POSTGRES_URL');
    }
    const sql = neon(process.env.POSTGRES_URL);

    // Get all paid orders for this event that haven't received the email yet
    // Since orders don't have eventId directly, we join with tickets.
    const orders = await sql`
      SELECT DISTINCT o.id, o."buyerName", o."buyerEmail"
      FROM orders o
      JOIN tickets t ON t."orderId" = o.id
      WHERE o.status = 'PAID'
      AND t."eventId" = ${eventId}
      AND (o."thankYouEmailSent" IS NULL OR o."thankYouEmailSent" = FALSE)
      AND o."deletedAt" IS NULL
    `;

    if (orders.length === 0) {
      return NextResponse.json({ message: 'Nessuna email da inviare.' });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        await resend.emails.send({
          from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
          to: order.buyerEmail,
          subject: 'Grazie per aver partecipato!',
          react: React.createElement(ThankYouEmailDocument, {
            buyerName: order.buyerName,
            eventId: eventId
          })
        });

        // Mark as sent
        await sql`UPDATE orders SET "thankYouEmailSent" = TRUE WHERE id = ${order.id}`;
        sentCount++;
        
        // Rate limit for Resend free tier (optional delay, e.g., 2 emails per sec)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Errore invio email a ${order.buyerEmail}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Inviate ${sentCount} email. Errori: ${errorCount}.` 
    });
  } catch (error) {
    console.error('API Error sending thank you emails:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
