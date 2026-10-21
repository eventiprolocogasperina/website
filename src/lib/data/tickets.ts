import { neon } from '@neondatabase/serverless';

export interface Order {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  nexiMac?: string;
  discountId?: string;
  createdAt: string;
  paidAt?: string;
  notes?: string;
  thankYouEmailSent?: boolean;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  blacklistedAt?: string;
  deletedAt?: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  type: string;
  price: number;
  qrCodeData: string;
  isCheckedIn: boolean;
  checkInTime?: string;
}

export interface OrderWithTickets extends Order {
  tickets: Ticket[];
}

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function createOrderWithTickets(order: Omit<Order, 'createdAt'>, tickets: Omit<Ticket, 'id' | 'orderId' | 'qrCodeData' | 'isCheckedIn' | 'checkInTime'>[]) {
  const sql = getDb();
  
  // Neon Serverless supports transactions using multiple statements in a single query or standard transactions.
  // We'll generate IDs and execute a batch.
  const orderId = order.id;
  const createdAt = new Date().toISOString();

  // Create order
  await sql`
    INSERT INTO orders (id, "buyerName", "buyerEmail", "buyerPhone", "totalAmount", status, "nexiMac", "discountId", "createdAt", notes, "thankYouEmailSent")
    VALUES (${orderId}, ${order.buyerName}, ${order.buyerEmail}, ${order.buyerPhone || null}, ${order.totalAmount}, ${order.status}, ${order.nexiMac || null}, ${order.discountId || null}, ${createdAt}, ${order.notes || null}, false)
  `;

  // Insert tickets
  for (const t of tickets) {
    const ticketId = crypto.randomUUID();
    const qrCodeData = `${orderId}-${ticketId}-${Date.now().toString(36)}`; // Unique string for QR
    await sql`
      INSERT INTO tickets (id, "orderId", "eventId", type, price, "qrCodeData", "isCheckedIn")
      VALUES (${ticketId}, ${orderId}, ${t.eventId}, ${t.type}, ${t.price}, ${qrCodeData}, false)
    `;
  }

  return orderId;
}

export async function getOrder(id: string): Promise<OrderWithTickets | null> {
  const sql = getDb();
  
  const orders = await sql`SELECT * FROM orders WHERE id = ${id} AND "deletedAt" IS NULL`;
  if (orders.length === 0) return null;

  const tickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${id}`;
  
  return {
    ...orders[0] as Order,
    totalAmount: Number(orders[0].totalAmount),
    thankYouEmailSent: !!orders[0].thankYouEmailSent,
    isBlacklisted: !!orders[0].isBlacklisted,
    blacklistReason: orders[0].blacklistReason || undefined,
    blacklistedAt: orders[0].blacklistedAt || undefined,
    deletedAt: orders[0].deletedAt || undefined,
    tickets: tickets.map(t => ({
      ...t,
      price: Number(t.price)
    })) as Ticket[]
  };
}

export async function toggleOrderBlacklist(orderId: string, isBlacklisted: boolean, reason?: string) {
  const sql = getDb();
  await sql`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS "isBlacklisted" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "blacklistReason" TEXT,
    ADD COLUMN IF NOT EXISTS "blacklistedAt" TIMESTAMP;
  `;
  await sql`
    UPDATE orders 
    SET "isBlacklisted" = ${isBlacklisted},
        "blacklistReason" = ${reason || null},
        "blacklistedAt" = ${isBlacklisted ? new Date().toISOString() : null}
    WHERE id = ${orderId}
  `;
}

// Nexi returns the codTrans which is exactly the orderId we sent (max 30 alphanumeric characters)
export async function markOrderPaid(orderId: string, nexiMac?: string) {
  const sql = getDb();
  const paidAt = new Date().toISOString();
  
  await sql`
    UPDATE orders 
    SET status = 'PAID', "paidAt" = ${paidAt}, "nexiMac" = COALESCE("nexiMac", ${nexiMac || null})
    WHERE id = ${orderId}
  `;
  
  // Increment discount uses if a discount was applied
  const orders = await sql`SELECT "discountId" FROM orders WHERE id = ${orderId}`;
  if (orders.length > 0 && orders[0].discountId) {
    await incrementDiscountUses(orders[0].discountId);
  }
}

export async function markOrderPaidByCodTrans(codTrans: string) {
  await markOrderPaid(codTrans);
}

export async function verifyTicketByQR(qrCodeData: string): Promise<{ 
  success: boolean; 
  message: string; 
  ticket?: Ticket; 
  order?: any; 
  orderTickets?: Ticket[]; 
  multipleOrders?: any[]; 
  stats?: any 
}> {
  const sql = getDb();
  const rawInput = qrCodeData.trim();
  
  let tickets = await sql`SELECT * FROM tickets WHERE "qrCodeData" = ${rawInput} OR id = ${rawInput}`;
  
  if (tickets.length === 0) {
    // Prova una ricerca permissiva (sostituendo caratteri speciali con jolly) per aggirare problemi di layout tastiera dello scanner
    const lenientSearch = rawInput.replace(/[^a-zA-Z0-9]/g, '%');
    // Aggiungiamo i jolly anche all'inizio e alla fine nel caso in cui lo scanner perda il primo/ultimo carattere
    const wildcardSearch = `%${lenientSearch}%`;
    tickets = await sql`SELECT * FROM tickets WHERE "qrCodeData" ILIKE ${wildcardSearch}`;
  }
  if (tickets.length === 0) {
    // Ricerca ordine per ID, Codice/Numero Ordine, oppure Nome/Email Ordinante
    const cleanId = rawInput.replace(/^#/, '').replace(/[^a-zA-Z0-9-]/g, '');
    let orders: any[] = [];

    if (cleanId.length >= 4) {
      orders = await sql`
        SELECT * FROM orders 
        WHERE (id = ${rawInput} OR id = ${cleanId} OR REPLACE(id, '-', '') ILIKE ${cleanId + '%'} OR id ILIKE ${cleanId + '%'})
          AND "deletedAt" IS NULL
        ORDER BY (status = 'PAID') DESC, "createdAt" DESC
        LIMIT 10
      `;
    }

    if (orders.length === 0 && rawInput.length >= 2) {
      orders = await sql`
        SELECT * FROM orders 
        WHERE ("buyerName" ILIKE ${'%' + rawInput + '%'} OR "buyerEmail" ILIKE ${'%' + rawInput + '%'})
          AND "deletedAt" IS NULL
        ORDER BY (status = 'PAID') DESC, "createdAt" DESC
        LIMIT 10
      `;
    }

    if (orders.length === 1) {
      const order = orders[0];
      const orderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${order.id}`;
      const checkedInCount = orderTickets.filter((t: any) => t.isCheckedIn).length;
      const allCheckedIn = orderTickets.length > 0 && checkedInCount === orderTickets.length;
      const eventId = orderTickets[0]?.eventId || 'assaggia-e-passeggia-2024';
      const stats = await getTicketingStats(eventId);

      if (order.isBlacklisted) {
        return { 
          success: false, 
          message: `⛔ ACCESSO BLOCCATO - ORDINE IN BLACKLIST!\n${order.blacklistReason ? `Motivo: ${order.blacklistReason}\n` : ''}Ingresso non consentito. Rivolgersi all'amministrazione.`, 
          order: { ...order, thankYouEmailSent: !!order.thankYouEmailSent }, 
          orderTickets: orderTickets as Ticket[], 
          stats 
        };
      }

      if (allCheckedIn) {
        return { 
          success: false, 
          message: `Tutti i biglietti di questo ordine sono già stati utilizzati.\n(${order.buyerName} - ${orderTickets.length} biglietti)`, 
          order: { ...order, thankYouEmailSent: !!order.thankYouEmailSent }, 
          orderTickets: orderTickets as Ticket[], 
          stats 
        };
      }

      return { 
        success: false, 
        message: `Ordine trovato: ${order.buyerName}\n(${checkedInCount}/${orderTickets.length} biglietti già convalidati)`, 
        order: { ...order, thankYouEmailSent: !!order.thankYouEmailSent }, 
        orderTickets: orderTickets as Ticket[], 
        stats 
      };
    } else if (orders.length > 1) {
      const enrichedOrders = await Promise.all(orders.map(async (o: any) => {
        const tList = await sql`SELECT id, "isCheckedIn", type FROM tickets WHERE "orderId" = ${o.id}`;
        const checkedIn = tList.filter((t: any) => t.isCheckedIn).length;
        return {
          id: o.id,
          buyerName: o.buyerName,
          buyerEmail: o.buyerEmail,
          buyerPhone: o.buyerPhone,
          totalAmount: Number(o.totalAmount || 0),
          status: o.status,
          createdAt: o.createdAt,
          notes: o.notes,
          isBlacklisted: !!o.isBlacklisted,
          blacklistReason: o.blacklistReason || undefined,
          totalTickets: tList.length,
          checkedInTickets: checkedIn
        };
      }));

      const stats = await getTicketingStats('assaggia-e-passeggia-2024');

      return {
        success: false,
        message: `Ordine trovato: ${orders.length} ordini corrispondono alla ricerca. Seleziona quello desiderato:`,
        multipleOrders: enrichedOrders,
        stats
      };
    }

    return { success: false, message: `Nessun biglietto o ordine trovato per "${rawInput}".` };
  }

  const ticket = tickets[0] as Ticket;
  
  const orders = await sql`SELECT * FROM orders WHERE id = ${ticket.orderId}`;
  const order = orders.length > 0 ? orders[0] : null;
  const orderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${ticket.orderId}`;
  const allCheckedIn = orderTickets.every((t: any) => t.isCheckedIn);

  if (order?.isBlacklisted) {
    const stats = await getTicketingStats(ticket.eventId || 'assaggia-e-passeggia-2024');
    return { 
      success: false, 
      message: `⛔ ACCESSO BLOCCATO - ORDINE IN BLACKLIST!\n${order.blacklistReason ? `Motivo: ${order.blacklistReason}\n` : ''}Ingresso non consentito. Rivolgersi all'amministrazione.`, 
      ticket, 
      order: order ? { ...order, thankYouEmailSent: !!order.thankYouEmailSent } : undefined, 
      orderTickets: orderTickets as Ticket[], 
      stats 
    };
  }

  if (allCheckedIn) {
    const stats = await getTicketingStats('assaggia-e-passeggia-2024');
    return { success: false, message: `L'intero ordine è già stato utilizzato.`, ticket, order: order ? { ...order, thankYouEmailSent: !!order.thankYouEmailSent } : undefined, orderTickets: orderTickets as Ticket[], stats };
  }

  if (ticket.isCheckedIn) {
    const stats = await getTicketingStats(ticket.eventId || 'assaggia-e-passeggia-2024');
    let dateStr = ticket.checkInTime ? new Date(ticket.checkInTime).toLocaleString('it-IT') : 'in precedenza';
    return { 
      success: false, 
      message: `Questo biglietto è già stato utilizzato.\n(Validato il: ${dateStr})`, 
      ticket, 
      order: order ? { ...order, thankYouEmailSent: !!order.thankYouEmailSent } : undefined, 
      orderTickets: orderTickets as Ticket[], 
      stats 
    };
  }

  await sql`UPDATE tickets SET "isCheckedIn" = true, "checkInTime" = CURRENT_TIMESTAMP WHERE id = ${ticket.id}`;
  const updatedOrderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${ticket.orderId}`;
  const stats = await getTicketingStats(ticket.eventId || 'assaggia-e-passeggia-2024');
  
  return { 
    success: true, 
    message: `Biglietto verificato con successo!`, 
    ticket: { ...ticket, isCheckedIn: true }, 
    order: order ? { ...order, thankYouEmailSent: !!order.thankYouEmailSent } : undefined, 
    orderTickets: updatedOrderTickets as Ticket[], 
    stats 
  };
}

export async function getTicketingStats(eventId: string) {
  const sql = getDb();
  
  const totalSoldRes = await sql`
    SELECT COUNT(*) as count, SUM(price) as revenue 
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} 
      AND o.status = 'PAID' 
      AND o."deletedAt" IS NULL
      AND (o."isBlacklisted" IS NULL OR o."isBlacklisted" = false)
  `;
  
  const checkedInRes = await sql`
    SELECT COUNT(*) as count 
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} 
      AND o.status = 'PAID' 
      AND t."isCheckedIn" = true 
      AND o."deletedAt" IS NULL
      AND (o."isBlacklisted" IS NULL OR o."isBlacklisted" = false)
  `;

  return {
    totalTickets: parseInt(totalSoldRes[0].count),
    totalRevenue: parseFloat(totalSoldRes[0].revenue || 0),
    checkedIn: parseInt(checkedInRes[0].count),
  };
}

export async function getAdvancedTicketingStats(eventId: string) {
  const sql = getDb();
  
  // Totali Generali
  const totalsRes = await sql`
    SELECT 
      COUNT(t.id) as total_tickets, 
      COALESCE(SUM(o."totalAmount"), 0) as total_revenue,
      COUNT(DISTINCT CASE WHEN o."totalAmount" = 0 THEN o.id END) as free_orders
    FROM orders o
    LEFT JOIN tickets t ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} 
      AND o.status = 'PAID' 
      AND o."deletedAt" IS NULL
      AND (o."isBlacklisted" IS NULL OR o."isBlacklisted" = false)
  `;

  // Suddivisione per Tipologia Biglietto
  const typeRes = await sql`
    SELECT t.type, COUNT(t.id) as count
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} 
      AND o.status = 'PAID' 
      AND o."deletedAt" IS NULL
      AND (o."isBlacklisted" IS NULL OR o."isBlacklisted" = false)
    GROUP BY t.type
    ORDER BY count DESC
  `;
  
  // Wait! Note that SUM(o.totalAmount) on a JOIN multiplies the amount by the number of tickets!
  // It's better to calculate revenue from the orders table directly.
  
  const revenueRes = await sql`
    SELECT COALESCE(SUM("totalAmount"), 0) as total_revenue
    FROM orders
    WHERE id IN (
      SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" = ${eventId}
    ) 
      AND status = 'PAID' 
      AND "deletedAt" IS NULL 
      AND ("isBlacklisted" IS NULL OR "isBlacklisted" = false)
  `;
  
  const freeOrdersRes = await sql`
    SELECT COUNT(id) as free_orders
    FROM orders
    WHERE id IN (
      SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" = ${eventId}
    ) 
      AND status = 'PAID' 
      AND "totalAmount" = 0 
      AND "deletedAt" IS NULL 
      AND ("isBlacklisted" IS NULL OR "isBlacklisted" = false)
  `;

  return {
    totalTickets: parseInt(totalsRes[0].total_tickets),
    totalRevenue: parseFloat(revenueRes[0].total_revenue),
    freeOrders: parseInt(freeOrdersRes[0].free_orders),
    ticketTypes: typeRes.map(row => ({ type: row.type, count: parseInt(row.count) }))
  };
}

export interface DateHistoryEntry {
  date: string;
  timestamp?: string;
  raw: string;
}

export interface IntegrationEntry {
  amount: number;
  description: string;
  transactionId?: string;
  raw: string;
}

export interface ParsedNotes {
  children: number | null;
  numChildren: number;
  totalRegistered: number | null;
  activities: string[];
  target: string | null;
  eventDate: string | null;
  dayKey: '17' | '18' | '24' | '25' | '10' | '11' | 'unspecified';
  originalDayKey: '10' | '11' | null;
  isPostponed: boolean;
  isExplicitlyMoved: boolean;
  postponedFrom: string | null;
  fullDateWithTime: string;
  rawNotes: string;
  dateHistory: DateHistoryEntry[];
  integrations: IntegrationEntry[];
}

export function parseOrderNotes(notes?: string | null): ParsedNotes {
  if (!notes) {
    return { 
      children: null, 
      totalRegistered: null, 
      activities: [], 
      target: null, 
      eventDate: null,
      dayKey: 'unspecified',
      originalDayKey: null,
      isPostponed: false,
      isExplicitlyMoved: false,
      postponedFrom: null,
      numChildren: 0,
      fullDateWithTime: 'Sabato 17, Domenica 18 o Domenica 25 Ottobre 2026 · Ore 10:30',
      rawNotes: '',
      dateHistory: [],
      integrations: []
    };
  }

  // 1. Estrai cronologia spostamenti data
  const dateHistory: DateHistoryEntry[] = [];
  const moveRegex = /\[SPOSTAMENTO DATA:\s*([^\]\-]+?)(?:\s*-\s*Modificato il\s*([^\]]+))?\]/gi;
  let moveMatch;
  while ((moveMatch = moveRegex.exec(notes)) !== null) {
    dateHistory.push({
      date: moveMatch[1].trim(),
      timestamp: moveMatch[2]?.trim(),
      raw: moveMatch[0]
    });
  }

  // 2. Estrai integrazioni Nexi pagate
  const integrations: IntegrationEntry[] = [];
  const integRegex = /\[INTEGRAZIONE(?:[A-Z\s]+)?\]:\s*\+?\s*€?([0-9.,]+)\s*(?:\(([^)]+)\))?(?:\s*-\s*Transazione:\s*([a-zA-Z0-9]+))?/gi;
  let integMatch;
  while ((integMatch = integRegex.exec(notes)) !== null) {
    integrations.push({
      amount: parseFloat(integMatch[1].replace(',', '.')),
      description: integMatch[2]?.trim() || '',
      transactionId: integMatch[3]?.trim(),
      raw: integMatch[0]
    });
  }

  let children: number | null = null;
  let totalRegistered: number | null = null;
  const childMatch = notes.match(/Bambini:\s*(\d+)(?:\/(\d+))?/i);
  if (childMatch) {
    children = parseInt(childMatch[1], 10);
    if (childMatch[2]) totalRegistered = parseInt(childMatch[2], 10);
  }

  let target: string | null = null;
  const targetMatch = notes.match(/Attività\s*(?:scelte)?\s*\[([^\]]+)\]/i) || notes.match(/Attività\s*(?:scelte)?\s*\(([^)]+)\)/i);
  if (targetMatch) {
    target = targetMatch[1];
  }

  // 3. Estrai e sanitizza rigorosamente le attività/laboratori
  // Rimuovi tag di audit prima del parsing per evitare che contaminino l'elenco
  const sanitizedForActivities = notes
    .replace(/\[SPOSTAMENTO DATA:[^\]]+\]/gi, ' ')
    .replace(/\[INTEGRAZIONE[^\]]*\][^\n|]*/gi, ' ')
    .replace(/Transazione:\s*[a-zA-Z0-9]+/gi, ' ')
    .replace(/\+?\s*€\s*[0-9.,]+/gi, ' ');

  let activities: string[] = [];
  const actMatch = sanitizedForActivities.match(/Attività\s*(?:scelte)?(?:\s*\[[^\]]+\]|\s*\([^)]+\))?:\s*([^\n|]+)/i);
  if (actMatch) {
    const rawActs = actMatch[1]
      .split(',')
      .map(s => s.trim().replace(/^[-–—]\s*/, ''))
      .filter(Boolean);

    for (const raw of rawActs) {
      const lower = raw.toLowerCase();
      if (lower.includes('zucca in vaso')) {
        activities.push('Zucca in Vaso (3-7 anni)');
      } else if (lower.includes('zuccart')) {
        activities.push('Zuccart (3-7 anni)');
      } else if (lower.includes('facepainting') || lower.includes('thriller')) {
        activities.push('Facepainting & Thriller Dance (6+)');
      } else if (lower.includes('altre') || lower.includes('annunciare')) {
        activities.push('Altre attività da annunciare');
      } else if (
        !lower.includes('transazione') && 
        !lower.includes('you pick') && 
        !lower.includes('ingresso') && 
        !lower.includes('spostamento') &&
        !lower.includes('integrazione') &&
        raw.length > 2
      ) {
        activities.push(raw);
      }
    }
  }
  activities = Array.from(new Set(activities));

  let eventDate: string | null = null;
  let dayKey: '17' | '18' | '24' | '25' | '10' | '11' | 'unspecified' = 'unspecified';
  let originalDayKey: '10' | '11' | null = null;
  let isPostponed = false;
  let isExplicitlyMoved = false;
  let postponedFrom: string | null = null;

  // 4. Data dell'evento:
  // Se l'ordine ha spostamenti manuali eseguiti da admin, prendi l'ultimo spostamento (il più recente)
  if (dateHistory.length > 0) {
    isExplicitlyMoved = true;
    const latestMove = dateHistory[dateHistory.length - 1];
    const movedTo = latestMove.date;
    if (movedTo.includes('25') || movedTo.includes('25 Ottobre')) {
      dayKey = '25';
      eventDate = 'Domenica 25 Ottobre 2026';
    } else if (movedTo.includes('24') || movedTo.includes('24 Ottobre')) {
      dayKey = '24';
      eventDate = 'Sabato 24 Ottobre 2026';
    } else if (movedTo.includes('18') || movedTo.includes('18 Ottobre')) {
      dayKey = '18';
      eventDate = 'Domenica 18 Ottobre 2026';
    } else if (movedTo.includes('17') || movedTo.includes('17 Ottobre')) {
      dayKey = '17';
      eventDate = 'Sabato 17 Ottobre 2026';
    }
  }

  // 5. Se non spostato esplicitamente, controlla Data/Giorno con posticipo automatico (10->17, 11->18)
  if (dayKey === 'unspecified') {
    const dateMatch = notes.match(/Data:\s*([^|]+)/i) || notes.match(/Giorno:\s*([^|]+)/i);
    const dStr = dateMatch ? dateMatch[1].trim() : notes;

    if (dStr.includes('25 Ottobre') || dStr.includes('25')) {
      dayKey = '25';
      eventDate = 'Domenica 25 Ottobre 2026';
    } else if (dStr.includes('24 Ottobre') || dStr.includes('24')) {
      dayKey = '24';
      eventDate = 'Sabato 24 Ottobre 2026';
    } else if (dStr.includes('17 Ottobre')) {
      dayKey = '17';
      eventDate = 'Sabato 17 Ottobre 2026';
    } else if (dStr.includes('18 Ottobre')) {
      dayKey = '18';
      eventDate = 'Domenica 18 Ottobre 2026';
    } else if (dStr.includes('10 Ottobre') || dStr.includes('10') || dStr.toLowerCase().includes('sabato')) {
      // POSTICIPO: Biglietti del 10 rimandati a Sabato 17 Ottobre
      dayKey = '17';
      eventDate = 'Sabato 17 Ottobre 2026';
      originalDayKey = '10';
      isPostponed = true;
      postponedFrom = 'Sabato 10 Ottobre 2026';
    } else if (dStr.includes('11 Ottobre') || dStr.includes('11') || dStr.toLowerCase().includes('domenica')) {
      // POSTICIPO: Biglietti dell'11 rimandati a Domenica 18 Ottobre
      dayKey = '18';
      eventDate = 'Domenica 18 Ottobre 2026';
      originalDayKey = '11';
      isPostponed = true;
      postponedFrom = 'Domenica 11 Ottobre 2026';
    }
  }

  const numChildren = children || 0;
  const fullDateWithTime = eventDate
    ? (dayKey === '24' ? `${eventDate} · Ore 11:00 - 17:00` : `${eventDate} · Ore 10:30`)
    : 'Sabato 17, Domenica 18 o Domenica 25 Ottobre 2026 · Ore 10:30';

  return { 
    children, 
    numChildren,
    totalRegistered, 
    activities, 
    target, 
    eventDate, 
    dayKey, 
    originalDayKey,
    isPostponed,
    isExplicitlyMoved,
    postponedFrom,
    fullDateWithTime,
    rawNotes: notes,
    dateHistory,
    integrations
  };
}

export interface ZuccalandDayStats {
  title: string;
  orders: number;
  revenue: number;
  tickets: number;
  admissionTickets: number;
  youPickTickets: number;
  kids: number;
  adults: number;
  ticketTypes: Record<string, number>;
  activityStats: Record<string, number>;
}

export interface ZuccalandStatsResult {
  totalTickets: number;
  admissionTickets: number;
  youPickTickets: number;
  totalRevenue: number;
  paidOrdersCount: number;
  freeOrders: number;
  kidsCount: number;
  adultsCount: number;
  totalAttendees: number;
  ticketTypes: Record<string, number>;
  activityStats: Record<string, number>;
  perDay: {
    '17': ZuccalandDayStats;
    '18': ZuccalandDayStats;
    '24': ZuccalandDayStats;
    '25': ZuccalandDayStats;
    '10': ZuccalandDayStats;
    '11': ZuccalandDayStats;
    'unspecified': ZuccalandDayStats;
  };
}

export interface ZuccalandDateCounts {
  '17': { admissionTickets: number; youPickTickets: number; totalTickets: number; orders: number };
  '18': { admissionTickets: number; youPickTickets: number; totalTickets: number; orders: number };
  '24': { admissionTickets: number; youPickTickets: number; totalTickets: number; orders: number };
  '25': { admissionTickets: number; youPickTickets: number; totalTickets: number; orders: number };
  '10': { admissionTickets: number; youPickTickets: number; totalTickets: number; orders: number };
  '11': { admissionTickets: number; youPickTickets: number; totalTickets: number; orders: number };
}

export async function getZuccalandDateCounts(): Promise<ZuccalandDateCounts> {
  const sql = getDb();
  const counts: ZuccalandDateCounts = {
    '17': { admissionTickets: 0, youPickTickets: 0, totalTickets: 0, orders: 0 },
    '18': { admissionTickets: 0, youPickTickets: 0, totalTickets: 0, orders: 0 },
    '24': { admissionTickets: 0, youPickTickets: 0, totalTickets: 0, orders: 0 },
    '25': { admissionTickets: 0, youPickTickets: 0, totalTickets: 0, orders: 0 },
    '10': { admissionTickets: 0, youPickTickets: 0, totalTickets: 0, orders: 0 },
    '11': { admissionTickets: 0, youPickTickets: 0, totalTickets: 0, orders: 0 },
  };

  try {
    const orders = await sql`
      SELECT o.id, o.notes 
      FROM orders o
      WHERE o.status = 'PAID' 
        AND o."deletedAt" IS NULL
        AND (o."isBlacklisted" IS NULL OR o."isBlacklisted" = false)
        AND (
          o.id IN (SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" ILIKE '%zuccaland%')
          OR o.notes ILIKE '%zuccaland%'
        )
    `;

    if (orders.length === 0) return counts;

    const orderIds = orders.map(o => o.id);
    const tickets = await sql`
      SELECT "orderId", type 
      FROM tickets 
      WHERE "orderId" = ANY(${orderIds})
    `;

    for (const o of orders) {
      const parsed = parseOrderNotes(o.notes);
      if (parsed.dayKey === 'unspecified') continue;

      const oTickets = tickets.filter(t => t.orderId === o.id);
      const oAdmissionTix = oTickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio')).length;
      const oYouPickTix = oTickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio')).length;
      
      if (counts[parsed.dayKey]) {
        counts[parsed.dayKey].orders++;
        counts[parsed.dayKey].totalTickets += oTickets.length;
        counts[parsed.dayKey].admissionTickets += (oAdmissionTix || oTickets.length);
        counts[parsed.dayKey].youPickTickets += oYouPickTix;
      }
    }
  } catch (error) {
    console.error('Failed to get Zuccaland date counts:', error);
  }

  return counts;
}

export async function getZuccalandStats(): Promise<ZuccalandStatsResult> {
  const sql = getDb();

  const perDay: ZuccalandStatsResult['perDay'] = {
    '17': { title: 'Sabato 17 Ottobre 2026 (Recupero del 10 Ottobre)', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    '18': { title: 'Domenica 18 Ottobre 2026 (Recupero dell\'11 Ottobre)', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    '24': { title: 'Sabato 24 Ottobre 2026 (Bozza / Non attiva)', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    '25': { title: 'Domenica 25 Ottobre 2026', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    '10': { title: 'Sabato 10 Ottobre 2026 (Data originale posticipata al 17)', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    '11': { title: 'Domenica 11 Ottobre 2026 (Data originale posticipata al 18)', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    'unspecified': { title: 'Altre date / Non specificata', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} }
  };

  const orders = await sql`
    SELECT o.* 
    FROM orders o
    WHERE o.status = 'PAID' 
      AND o."deletedAt" IS NULL
      AND (o."isBlacklisted" IS NULL OR o."isBlacklisted" = false)
      AND (
        o.id IN (SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" ILIKE '%zuccaland%')
        OR o.notes ILIKE '%zuccaland%'
      )
    ORDER BY o."createdAt" DESC
  `;

  if (orders.length === 0) {
    return {
      totalTickets: 0,
      admissionTickets: 0,
      youPickTickets: 0,
      totalRevenue: 0,
      paidOrdersCount: 0,
      freeOrders: 0,
      kidsCount: 0,
      adultsCount: 0,
      totalAttendees: 0,
      ticketTypes: {},
      activityStats: {},
      perDay
    };
  }

  const orderIds = orders.map(o => o.id);
  const tickets = await sql`
    SELECT "orderId", type, price, "eventId" 
    FROM tickets 
    WHERE "orderId" = ANY(${orderIds})
  `;

  let totalRevenue = 0;
  let freeOrders = 0;
  let totalKids = 0;
  let totalAdults = 0;
  const ticketTypes: Record<string, number> = {};
  const activityStats: Record<string, number> = {};

  for (const o of orders) {
    const rev = parseFloat(o.totalAmount || 0);
    totalRevenue += rev;
    if (rev === 0) freeOrders++;

    const oTickets = tickets.filter(t => t.orderId === o.id);
    oTickets.forEach(t => {
      ticketTypes[t.type] = (ticketTypes[t.type] || 0) + 1;
    });

    const parsed = parseOrderNotes(o.notes);
    const oAdmissionTix = oTickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio')).length;
    const oYouPickTix = oTickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio')).length;
    const baseTickets = oAdmissionTix || oTickets.length;
    const kids = parsed.children ?? 0;
    const totalAttendees = parsed.totalRegistered ?? baseTickets;
    const adults = Math.max(0, totalAttendees - kids);

    totalKids += kids;
    totalAdults += adults;

    if (parsed.activities.length > 0) {
      const attendees = (parsed.target?.toLowerCase().includes('bambini') && kids > 0) ? kids : (totalAttendees || 1);
      parsed.activities.forEach(act => {
        activityStats[act] = (activityStats[act] || 0) + attendees;
      });
    }

    // Allocate to day
    const day = perDay[parsed.dayKey];
    day.orders++;
    day.revenue += rev;
    day.tickets += oTickets.length;
    day.admissionTickets += oAdmissionTix;
    day.youPickTickets += oYouPickTix;
    day.kids += kids;
    day.adults += adults;
    oTickets.forEach(t => {
      day.ticketTypes[t.type] = (day.ticketTypes[t.type] || 0) + 1;
    });
    if (parsed.activities.length > 0) {
      const attendees = (parsed.target?.toLowerCase().includes('bambini') && kids > 0) ? kids : (totalAttendees || 1);
      parsed.activities.forEach(act => {
        day.activityStats[act] = (day.activityStats[act] || 0) + attendees;
      });
    }
  }

  const totalAdmission = tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio')).length;
  const totalYouPick = tickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio')).length;

  return {
    totalTickets: tickets.length,
    admissionTickets: totalAdmission,
    youPickTickets: totalYouPick,
    totalRevenue,
    paidOrdersCount: orders.length,
    freeOrders,
    kidsCount: totalKids,
    adultsCount: totalAdults,
    totalAttendees: totalKids + totalAdults,
    ticketTypes,
    activityStats,
    perDay
  };
}

export async function getLatestOrdersTelegram(eventId?: string, limit: number = 15): Promise<any[]> {
  const sql = getDb();
  
  const ordersRes = eventId
    ? await sql`
        SELECT o.* 
        FROM orders o
        WHERE o.id IN (
          SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" = ${eventId}
        ) AND o.status = 'PAID' AND o."deletedAt" IS NULL
        ORDER BY o."createdAt" DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT o.* 
        FROM orders o
        WHERE o.status = 'PAID' AND o."deletedAt" IS NULL
        ORDER BY o."createdAt" DESC
        LIMIT ${limit}
      `;

  if (ordersRes.length === 0) return [];

  const orderIds = ordersRes.map(o => o.id);
  const ticketsRes = await sql`
    SELECT "orderId", type, price, "eventId" 
    FROM tickets 
    WHERE "orderId" = ANY(${orderIds})
  `;

  return ordersRes.map(order => {
    const orderTickets = ticketsRes.filter(t => t.orderId === order.id);
    return {
      ...order,
      totalAmount: Number(order.totalAmount),
      thankYouEmailSent: !!order.thankYouEmailSent,
      tickets: orderTickets
    };
  });
}

export interface Discount {
  id: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  max_uses: number;
  current_uses: number;
  expiry_date?: string;
  active: boolean;
  applies_to?: 'ALL' | 'FULL_TICKET';
}

export async function getDiscountByCode(code: string): Promise<Discount | null> {
  const sql = getDb();
  const discounts = await sql`
    SELECT * FROM discounts 
    WHERE code = ${code.toUpperCase()} 
      AND active = true 
      AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
  `;
  if (discounts.length === 0) return null;
  const d = discounts[0];
  return {
    ...d,
    value: typeof d.value === 'string' ? parseFloat(d.value) : d.value
  } as Discount;
}

export async function incrementDiscountUses(id: string) {
  const sql = getDb();
  await sql`
    UPDATE discounts 
    SET current_uses = current_uses + 1 
    WHERE id = ${id}
  `;
}
