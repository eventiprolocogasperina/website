import { neon } from '@neondatabase/serverless';
import { getPageContent, savePageContent } from './pages';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CashierItem {
  id: string;
  name: string;
  category: string;
  price: number; // Valore del contributo in Euro
  isAvailable: boolean; // false se terminato/esaurito
  icon?: string; // Emoji o icona
  description?: string;
}

export interface CashierEvent {
  id: string;
  name: string; // es. "Sagra dei Sapori Tradizionali 2026"
  eventCode: string; // Codice PIN/Accesso operatore cassa, es. "SAGRA2026"
  active: boolean;
  categories: string[];
  items: CashierItem[];
  startingNumber?: number; // Numero progressivo di partenza (default: 1)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashierConfig {
  events: CashierEvent[];
  activeEventId?: string;
}

export interface CashierOrderItem {
  id: string;
  name: string;
  category: string;
  price: number; // Valore contributo unitario
  quantity: number;
  subtotal: number;
}

export interface CashierOrder {
  id: string; // UUID/nanoid per link univoco ricevuta QR
  eventId: string;
  eventName: string;
  orderNumber: number; // Numero progressivo dell'ordine (es. 1, 2, 3...)
  cassaName: string; // es. "Cassa 1", "Cassa 2", "Bar", ecc.
  operatorName?: string;
  totalAmount: number; // Totale Contributo
  paymentMethod: 'CONTANTI' | 'POS' | 'OMAGGIO';
  cashReceived?: number;
  cashChange?: number;
  omaggioNote?: string;
  items: CashierOrderItem[];
  status: 'COMPLETED' | 'VOIDED';
  createdAt: string;
}

export interface CashierStats {
  totalAmount: number;
  cashAmount: number;
  posAmount: number;
  omaggioAmount: number;
  totalOrders: number;
  completedOrders: number;
  voidedOrders: number;
  cassaBreakdown: Record<string, { total: number; cash: number; pos: number; omaggio: number; count: number }>;
  itemsBreakdown: Record<string, { name: string; category: string; quantity: number; totalAmount: number }>;
}

// ─── Default Sample Config ───────────────────────────────────────────────────

export const DEFAULT_CASHIER_CONFIG: CashierConfig = {
  events: [
    {
      id: 'sagra-tradizioni-2026',
      name: 'Festa delle Tradizioni e Sapori 2026',
      eventCode: 'FESTA2026',
      active: true,
      startingNumber: 1,
      notes: 'Contributi per le attività e stand gastronomico della Pro Loco',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categories: ['Primi', 'Secondi & Contorni', 'Panini', 'Bevande', 'Dolci'],
      items: [
        { id: 'itm_1', name: 'Fileja alla Silana', category: 'Primi', price: 7.00, isAvailable: true, icon: '🍝' },
        { id: 'itm_2', name: 'Pasta e Fagioli nei Cocci', category: 'Primi', price: 6.00, isAvailable: true, icon: '🍲' },
        { id: 'itm_3', name: 'Grigliata di Maiale & Salsiccia', category: 'Secondi & Contorni', price: 8.50, isAvailable: true, icon: '🍖' },
        { id: 'itm_4', name: 'Patate ‘Mpacchiuse e Peperoni', category: 'Secondi & Contorni', price: 4.50, isAvailable: true, icon: '🥔' },
        { id: 'itm_5', name: 'Panino Salsiccia & Cime di Rapa', category: 'Panini', price: 6.50, isAvailable: true, icon: '🥪' },
        { id: 'itm_6', name: 'Panino con Melanzane Sott’olio', category: 'Panini', price: 5.00, isAvailable: true, icon: '🥖' },
        { id: 'itm_7', name: 'Bicchiere Vino Locale Rosso/Bianco', category: 'Bevande', price: 2.00, isAvailable: true, icon: '🍷' },
        { id: 'itm_8', name: 'Bottiglia Vino Locale (0.75L)', category: 'Bevande', price: 8.00, isAvailable: true, icon: '🍾' },
        { id: 'itm_9', name: 'Birra Artigianale alla Spina', category: 'Bevande', price: 3.50, isAvailable: true, icon: '🍺' },
        { id: 'itm_10', name: 'Acqua Naturale / Frizzante (0.5L)', category: 'Bevande', price: 1.00, isAvailable: true, icon: '💧' },
        { id: 'itm_11', name: 'Pitta ‘Mpigliata e Dolci Tipici', category: 'Dolci', price: 3.00, isAvailable: true, icon: '🍰' },
        { id: 'itm_12', name: 'Caffè Espresso', category: 'Bevande', price: 1.20, isAvailable: true, icon: '☕' }
      ]
    }
  ],
  activeEventId: 'sagra-tradizioni-2026'
};

// ─── Database Helpers ────────────────────────────────────────────────────────

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL, { fetchOptions: { cache: 'no-store' } });
}

export async function ensureCashierOrdersTable(): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      CREATE TABLE IF NOT EXISTS cashier_orders (
        id              VARCHAR(255) PRIMARY KEY,
        "eventId"       VARCHAR(255) NOT NULL,
        "eventName"     VARCHAR(255) NOT NULL,
        "orderNumber"   INTEGER NOT NULL,
        "cassaName"     VARCHAR(100) NOT NULL DEFAULT 'Cassa 1',
        "operatorName"  VARCHAR(100),
        "totalAmount"   DECIMAL(10,2) NOT NULL,
        "paymentMethod" VARCHAR(50) NOT NULL,
        "cashReceived"  DECIMAL(10,2),
        "cashChange"    DECIMAL(10,2),
        "omaggioNote"   TEXT,
        items           JSONB NOT NULL,
        status          VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
        "createdAt"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_cashier_orders_event ON cashier_orders("eventId");
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_cashier_orders_created ON cashier_orders("createdAt");
    `;
  } catch (error) {
    console.error('Failed to ensure cashier_orders table:', error);
  }
}

// ─── Cashier Config Operations ───────────────────────────────────────────────

export async function getCashierConfig(): Promise<CashierConfig> {
  return await getPageContent<CashierConfig>('cashier_config', DEFAULT_CASHIER_CONFIG);
}

export async function saveCashierConfig(config: CashierConfig): Promise<boolean> {
  return await savePageContent<CashierConfig>('cashier_config', config);
}

// ─── Order Operations ────────────────────────────────────────────────────────

export async function createCashierOrder(orderData: {
  eventId: string;
  eventName: string;
  cassaName: string;
  operatorName?: string;
  totalAmount: number;
  paymentMethod: 'CONTANTI' | 'POS' | 'OMAGGIO';
  cashReceived?: number;
  cashChange?: number;
  omaggioNote?: string;
  items: CashierOrderItem[];
}): Promise<CashierOrder> {
  await ensureCashierOrdersTable();
  const sql = getDb();

  // Genera un ID univoco pulito per l'URL della ricevuta
  const orderId = 'csh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // Recupera configurazione per sapere eventuale startingNumber
  const config = await getCashierConfig();
  const eventConfig = config.events.find(e => e.id === orderData.eventId);
  const startingNumber = eventConfig?.startingNumber || 1;

  // Calcola atomicamente il numero progressivo successivo per questo evento
  const maxResult = await sql`
    SELECT COALESCE(MAX("orderNumber"), ${startingNumber - 1}) as "maxOrder"
    FROM cashier_orders
    WHERE "eventId" = ${orderData.eventId}
  `;
  const nextNumber = Number(maxResult[0]?.maxOrder || (startingNumber - 1)) + 1;

  const orderRows = await sql`
    INSERT INTO cashier_orders (
      id,
      "eventId",
      "eventName",
      "orderNumber",
      "cassaName",
      "operatorName",
      "totalAmount",
      "paymentMethod",
      "cashReceived",
      "cashChange",
      "omaggioNote",
      items,
      status,
      "createdAt"
    ) VALUES (
      ${orderId},
      ${orderData.eventId},
      ${orderData.eventName},
      ${nextNumber},
      ${orderData.cassaName},
      ${orderData.operatorName || null},
      ${orderData.totalAmount},
      ${orderData.paymentMethod},
      ${orderData.cashReceived ?? null},
      ${orderData.cashChange ?? null},
      ${orderData.omaggioNote || null},
      ${JSON.stringify(orderData.items)},
      'COMPLETED',
      CURRENT_TIMESTAMP
    )
    RETURNING
      id,
      "eventId",
      "eventName",
      "orderNumber",
      "cassaName",
      "operatorName",
      "totalAmount",
      "paymentMethod",
      "cashReceived",
      "cashChange",
      "omaggioNote",
      items,
      status,
      "createdAt"
  `;

  const row = orderRows[0];
  return {
    id: row.id,
    eventId: row.eventId,
    eventName: row.eventName,
    orderNumber: Number(row.orderNumber),
    cassaName: row.cassaName,
    operatorName: row.operatorName || undefined,
    totalAmount: Number(row.totalAmount),
    paymentMethod: row.paymentMethod,
    cashReceived: row.cashReceived ? Number(row.cashReceived) : undefined,
    cashChange: row.cashChange ? Number(row.cashChange) : undefined,
    omaggioNote: row.omaggioNote || undefined,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    status: row.status,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
  };
}

export async function getCashierOrderById(orderId: string): Promise<CashierOrder | null> {
  await ensureCashierOrdersTable();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM cashier_orders WHERE id = ${orderId} LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    eventId: row.eventId,
    eventName: row.eventName,
    orderNumber: Number(row.orderNumber),
    cassaName: row.cassaName,
    operatorName: row.operatorName || undefined,
    totalAmount: Number(row.totalAmount),
    paymentMethod: row.paymentMethod,
    cashReceived: row.cashReceived ? Number(row.cashReceived) : undefined,
    cashChange: row.cashChange ? Number(row.cashChange) : undefined,
    omaggioNote: row.omaggioNote || undefined,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    status: row.status,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
  };
}

export async function getCashierOrders(eventId: string, options?: {
  cassaName?: string;
  limit?: number;
}): Promise<CashierOrder[]> {
  await ensureCashierOrdersTable();
  const sql = getDb();
  const limit = options?.limit || 100;

  let rows;
  if (options?.cassaName && options.cassaName !== 'all') {
    rows = await sql`
      SELECT * FROM cashier_orders
      WHERE "eventId" = ${eventId} AND "cassaName" = ${options.cassaName}
      ORDER BY "orderNumber" DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT * FROM cashier_orders
      WHERE "eventId" = ${eventId}
      ORDER BY "orderNumber" DESC
      LIMIT ${limit}
    `;
  }

  return rows.map(row => ({
    id: row.id,
    eventId: row.eventId,
    eventName: row.eventName,
    orderNumber: Number(row.orderNumber),
    cassaName: row.cassaName,
    operatorName: row.operatorName || undefined,
    totalAmount: Number(row.totalAmount),
    paymentMethod: row.paymentMethod,
    cashReceived: row.cashReceived ? Number(row.cashReceived) : undefined,
    cashChange: row.cashChange ? Number(row.cashChange) : undefined,
    omaggioNote: row.omaggioNote || undefined,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    status: row.status,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
  }));
}

export async function voidCashierOrder(orderId: string): Promise<boolean> {
  await ensureCashierOrdersTable();
  const sql = getDb();
  const res = await sql`
    UPDATE cashier_orders
    SET status = 'VOIDED'
    WHERE id = ${orderId}
  `;
  return true;
}

// ─── Stats / Chiusura Cassa (Z-Report) ────────────────────────────────────────

export async function getCashierStats(eventId: string, cassaName?: string): Promise<CashierStats> {
  await ensureCashierOrdersTable();
  const sql = getDb();

  const rows = cassaName && cassaName !== 'all'
    ? await sql`SELECT * FROM cashier_orders WHERE "eventId" = ${eventId} AND "cassaName" = ${cassaName}`
    : await sql`SELECT * FROM cashier_orders WHERE "eventId" = ${eventId}`;

  let totalAmount = 0;
  let cashAmount = 0;
  let posAmount = 0;
  let omaggioAmount = 0;
  let completedOrders = 0;
  let voidedOrders = 0;

  const cassaBreakdown: Record<string, { total: number; cash: number; pos: number; omaggio: number; count: number }> = {};
  const itemsBreakdown: Record<string, { name: string; category: string; quantity: number; totalAmount: number }> = {};

  for (const r of rows) {
    const isCompleted = r.status === 'COMPLETED';
    const amount = Number(r.totalAmount || 0);
    const method = r.paymentMethod as 'CONTANTI' | 'POS' | 'OMAGGIO';
    const cassa = r.cassaName || 'Cassa 1';

    if (!cassaBreakdown[cassa]) {
      cassaBreakdown[cassa] = { total: 0, cash: 0, pos: 0, omaggio: 0, count: 0 };
    }

    if (isCompleted) {
      completedOrders++;
      totalAmount += amount;
      cassaBreakdown[cassa].total += amount;
      cassaBreakdown[cassa].count++;

      if (method === 'CONTANTI') {
        cashAmount += amount;
        cassaBreakdown[cassa].cash += amount;
      } else if (method === 'POS') {
        posAmount += amount;
        cassaBreakdown[cassa].pos += amount;
      } else if (method === 'OMAGGIO') {
        omaggioAmount += amount;
        cassaBreakdown[cassa].omaggio += amount;
      }

      // Breakdown piatti
      const items: CashierOrderItem[] = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
      for (const it of items) {
        if (!itemsBreakdown[it.id]) {
          itemsBreakdown[it.id] = {
            name: it.name,
            category: it.category,
            quantity: 0,
            totalAmount: 0
          };
        }
        itemsBreakdown[it.id].quantity += Number(it.quantity || 0);
        itemsBreakdown[it.id].totalAmount += Number(it.subtotal || 0);
      }
    } else {
      voidedOrders++;
    }
  }

  return {
    totalAmount,
    cashAmount,
    posAmount,
    omaggioAmount,
    totalOrders: rows.length,
    completedOrders,
    voidedOrders,
    cassaBreakdown,
    itemsBreakdown
  };
}
