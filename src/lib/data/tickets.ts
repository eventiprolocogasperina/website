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
    INSERT INTO orders (id, "buyerName", "buyerEmail", "buyerPhone", "totalAmount", status, "nexiMac", "discountId", "createdAt", notes)
    VALUES (${orderId}, ${order.buyerName}, ${order.buyerEmail}, ${order.buyerPhone || null}, ${order.totalAmount}, ${order.status}, ${order.nexiMac || null}, ${order.discountId || null}, ${createdAt}, ${order.notes || null})
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
  
  const orders = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (orders.length === 0) return null;

  const tickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${id}`;
  
  return {
    ...orders[0] as Order,
    totalAmount: Number(orders[0].totalAmount),
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
      return { 
        success: false, 
        message: 'Ordine trovato. Scegli un biglietto da verificare.', 
        order, 
        orderTickets: orderTickets as Ticket[]
      };
    }

    return { success: false, message: 'Biglietto non trovato.' };
  }

  const ticket = tickets[0] as Ticket;
  
  const orders = await sql`SELECT * FROM orders WHERE id = ${ticket.orderId}`;
  const order = orders.length > 0 ? orders[0] : null;
  const orderTickets = await sql`SELECT * FROM tickets WHERE "orderId" = ${ticket.orderId}`;

  if (ticket.isCheckedIn) {
    const stats = await getTicketingStats('assaggia-e-passeggia-2024');
    return { success: false, message: `Biglietto già utilizzato il ${new Date(ticket.checkInTime!).toLocaleString('it-IT')}.`, ticket, order, orderTickets: orderTickets as Ticket[], stats };
  }

  await sql`UPDATE tickets SET "isCheckedIn" = true, "checkInTime" = CURRENT_TIMESTAMP WHERE id = ${ticket.id}`;
  const stats = await getTicketingStats('assaggia-e-passeggia-2024');
  return { success: true, message: 'Biglietto verificato con successo!', ticket: { ...ticket, isCheckedIn: true }, order, orderTickets: orderTickets as Ticket[], stats };
}

export async function getTicketingStats(eventId: string) {
  const sql = getDb();
  
  const totalSoldRes = await sql`
    SELECT COUNT(*) as count, SUM(price) as revenue 
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID'
  `;
  
  const checkedInRes = await sql`
    SELECT COUNT(*) as count 
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID' AND t."isCheckedIn" = true
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
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID'
  `;

  // Suddivisione per Tipologia Biglietto
  const typeRes = await sql`
    SELECT t.type, COUNT(t.id) as count
    FROM tickets t
    JOIN orders o ON t."orderId" = o.id
    WHERE t."eventId" = ${eventId} AND o.status = 'PAID'
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
    ) AND status = 'PAID'
  `;
  
  const freeOrdersRes = await sql`
    SELECT COUNT(id) as free_orders
    FROM orders
    WHERE id IN (
      SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" = ${eventId}
    ) AND status = 'PAID' AND "totalAmount" = 0
  `;

  return {
    totalTickets: parseInt(totalsRes[0].total_tickets),
    totalRevenue: parseFloat(revenueRes[0].total_revenue),
    freeOrders: parseInt(freeOrdersRes[0].free_orders),
    ticketTypes: typeRes.map(row => ({ type: row.type, count: parseInt(row.count) }))
  };
}

export async function getLatestOrdersTelegram(eventId: string, limit: number = 15) {
  const sql = getDb();
  
  const ordersRes = await sql`
    SELECT o.* 
    FROM orders o
    WHERE o.id IN (
      SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" = ${eventId}
    ) AND o.status = 'PAID'
    ORDER BY o."createdAt" DESC
    LIMIT ${limit}
  `;

  if (ordersRes.length === 0) return [];

  const orderIds = ordersRes.map(o => o.id);
  const ticketsRes = await sql`
    SELECT "orderId", type, price 
    FROM tickets 
    WHERE "orderId" = ANY(${orderIds})
  `;

  return ordersRes.map(order => {
    const orderTickets = ticketsRes.filter(t => t.orderId === order.id);
    return {
      ...order,
      totalAmount: Number(order.totalAmount),
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
