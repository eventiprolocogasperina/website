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
    tickets: tickets.map(t => ({
      ...t,
      price: Number(t.price)
    })) as Ticket[]
  };
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

export async function verifyTicketByQR(qrCodeData: string): Promise<{ success: boolean; message: string; ticket?: Ticket; order?: any, orderTickets?: Ticket[], stats?: any }> {
  const sql = getDb();
  
  let tickets = await sql`SELECT * FROM tickets WHERE "qrCodeData" = ${qrCodeData} OR id = ${qrCodeData}`;
  
  if (tickets.length === 0) {
    // Prova una ricerca permissiva (sostituendo caratteri speciali con jolly) per aggirare problemi di layout tastiera dello scanner
    const lenientSearch = qrCodeData.replace(/[^a-zA-Z0-9]/g, '%');
    // Aggiungiamo i jolly anche all'inizio e alla fine nel caso in cui lo scanner perda il primo/ultimo carattere
    const wildcardSearch = `%${lenientSearch}%`;
    tickets = await sql`SELECT * FROM tickets WHERE "qrCodeData" ILIKE ${wildcardSearch}`;
  }
  if (tickets.length === 0) {
    // If no ticket found, try searching by order ID
    const orders = await sql`SELECT * FROM orders WHERE id = ${qrCodeData}`;
    if (orders.length > 0) {
      const order = orders[0];
      const orderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${order.id}`;
      const allCheckedIn = orderTickets.every((t: any) => t.isCheckedIn);

      if (allCheckedIn) {
        const stats = await getTicketingStats('assaggia-e-passeggia-2024'); // Note: eventId is currently hardcoded here
        return { 
          success: false, 
          message: 'Tutti i biglietti di questo ordine sono già stati utilizzati.', 
          order: { ...order, thankYouEmailSent: !!order.thankYouEmailSent }, 
          orderTickets: orderTickets as Ticket[], 
          stats 
        };
      }

      await sql`UPDATE tickets SET "isCheckedIn" = true, "checkInTime" = CURRENT_TIMESTAMP WHERE "orderId" = ${order.id}`;
      const updatedOrderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${order.id}`;
      const stats = await getTicketingStats('assaggia-e-passeggia-2024');
      
      return { 
        success: true, 
        message: `Intero ordine verificato! ${updatedOrderTickets.length} biglietti validati.`, 
        order: { ...order, thankYouEmailSent: !!order.thankYouEmailSent }, 
        orderTickets: updatedOrderTickets as Ticket[], 
        stats 
      };
    }

    return { success: false, message: 'Biglietto non trovato.' };
  }

  const ticket = tickets[0] as Ticket;
  
  const orders = await sql`SELECT * FROM orders WHERE id = ${ticket.orderId}`;
  const order = orders.length > 0 ? orders[0] : null;
  const orderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${ticket.orderId}`;
  const allCheckedIn = orderTickets.every((t: any) => t.isCheckedIn);

  if (allCheckedIn) {
    const stats = await getTicketingStats('assaggia-e-passeggia-2024');
    return { success: false, message: `L'intero ordine è già stato utilizzato.`, ticket, order: order ? { ...order, thankYouEmailSent: !!order.thankYouEmailSent } : undefined, orderTickets: orderTickets as Ticket[], stats };
  }

  await sql`UPDATE tickets SET "isCheckedIn" = true, "checkInTime" = CURRENT_TIMESTAMP WHERE "orderId" = ${ticket.orderId}`;
  const updatedOrderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${ticket.orderId}`;
  const stats = await getTicketingStats('assaggia-e-passeggia-2024');
  
  return { 
    success: true, 
    message: `Intero ordine verificato! ${updatedOrderTickets.length} biglietti validati con successo.`, 
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
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID' AND o."deletedAt" IS NULL
  `;
  
  const checkedInRes = await sql`
    SELECT COUNT(*) as count 
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID' AND t."isCheckedIn" = true AND o."deletedAt" IS NULL
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
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID' AND o."deletedAt" IS NULL
  `;

  // Suddivisione per Tipologia Biglietto
  const typeRes = await sql`
    SELECT t.type, COUNT(t.id) as count
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID' AND o."deletedAt" IS NULL
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
    ) AND status = 'PAID' AND "deletedAt" IS NULL
  `;
  
  const freeOrdersRes = await sql`
    SELECT COUNT(id) as free_orders
    FROM orders
    WHERE id IN (
      SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" = ${eventId}
    ) AND status = 'PAID' AND "totalAmount" = 0 AND "deletedAt" IS NULL
  `;

  return {
    totalTickets: parseInt(totalsRes[0].total_tickets),
    totalRevenue: parseFloat(revenueRes[0].total_revenue),
    freeOrders: parseInt(freeOrdersRes[0].free_orders),
    ticketTypes: typeRes.map(row => ({ type: row.type, count: parseInt(row.count) }))
  };
}

export function parseOrderNotes(notes?: string | null) {
  if (!notes) {
    return { 
      children: null as number | null, 
      totalRegistered: null as number | null, 
      activities: [] as string[], 
      target: null as string | null, 
      eventDate: null as string | null,
      dayKey: 'unspecified' as '10' | '11' | 'unspecified',
      rawNotes: '' 
    };
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

  let activities: string[] = [];
  const actMatch = notes.match(/Attività\s*(?:scelte)?(?:\s*\[[^\]]+\]|\s*\([^)]+\))?:\s*([^|]+)/i);
  if (actMatch) {
    activities = actMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  let eventDate: string | null = null;
  let dayKey: '10' | '11' | 'unspecified' = 'unspecified';
  const dateMatch = notes.match(/Data:\s*([^|]+)/i) || notes.match(/Giorno:\s*([^|]+)/i);
  if (dateMatch) {
    eventDate = dateMatch[1].trim();
  }
  
  if (eventDate?.includes('10') || notes.includes('10 Ottobre') || notes.toLowerCase().includes('sabato')) {
    dayKey = '10';
    if (!eventDate) eventDate = 'Sabato 10 Ottobre 2026';
  } else if (eventDate?.includes('11') || notes.includes('11 Ottobre') || notes.toLowerCase().includes('domenica')) {
    dayKey = '11';
    if (!eventDate) eventDate = 'Domenica 11 Ottobre 2026';
  }

  return { children, totalRegistered, activities, target, eventDate, dayKey, rawNotes: notes };
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
    '10': ZuccalandDayStats;
    '11': ZuccalandDayStats;
    'unspecified': ZuccalandDayStats;
  };
}

export async function getZuccalandStats(): Promise<ZuccalandStatsResult> {
  const sql = getDb();

  const perDay: ZuccalandStatsResult['perDay'] = {
    '10': { title: 'Sabato 10 Ottobre 2026', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    '11': { title: 'Domenica 11 Ottobre 2026', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} },
    'unspecified': { title: 'Altre date / Non specificata', orders: 0, revenue: 0, tickets: 0, admissionTickets: 0, youPickTickets: 0, kids: 0, adults: 0, ticketTypes: {}, activityStats: {} }
  };

  const orders = await sql`
    SELECT o.* 
    FROM orders o
    WHERE o.status = 'PAID' 
      AND o."deletedAt" IS NULL
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
