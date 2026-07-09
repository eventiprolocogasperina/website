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
    INSERT INTO orders (id, "buyerName", "buyerEmail", "buyerPhone", "totalAmount", status, "nexiMac", "discountId", "createdAt")
    VALUES (${orderId}, ${order.buyerName}, ${order.buyerEmail}, ${order.buyerPhone || null}, ${order.totalAmount}, ${order.status}, ${order.nexiMac || null}, ${order.discountId || null}, ${createdAt})
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

export async function verifyTicketByQR(qrCodeData: string): Promise<{ success: boolean; message: string; ticket?: Ticket }> {
  const sql = getDb();
  
  const tickets = await sql`SELECT * FROM tickets WHERE "qrCodeData" = ${qrCodeData}`;
  if (tickets.length === 0) {
    return { success: false, message: 'Biglietto non trovato.' };
  }

  const ticket = tickets[0] as Ticket;
  
  if (ticket.isCheckedIn) {
    return { success: false, message: `Biglietto già utilizzato il ${new Date(ticket.checkInTime!).toLocaleString('it-IT')}.`, ticket };
  }

  await sql`UPDATE tickets SET "isCheckedIn" = true, "checkInTime" = CURRENT_TIMESTAMP WHERE id = ${ticket.id}`;
  return { success: true, message: 'Biglietto verificato con successo!', ticket: { ...ticket, isCheckedIn: true } };
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

export interface Discount {
  id: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  max_uses: number;
  current_uses: number;
  expiry_date?: string;
  active: boolean;
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
  return discounts[0] as Discount;
}

export async function incrementDiscountUses(id: string) {
  const sql = getDb();
  await sql`
    UPDATE discounts 
    SET current_uses = current_uses + 1 
    WHERE id = ${id}
  `;
}
