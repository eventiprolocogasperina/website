import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory set of active SSE client controllers for broadcasting
const clients = new Set<ReadableStreamDefaultController>();

export function broadcastCashierEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payload);

  for (const controller of clients) {
    try {
      controller.enqueue(bytes);
    } catch {
      clients.delete(controller);
    }
  }
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const customStream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`));

      // Keep connection alive with periodic heartbeats (every 15s)
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          clients.delete(controller);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        clients.delete(controller);
      });
    },
    cancel(controller) {
      clients.delete(controller);
    }
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
