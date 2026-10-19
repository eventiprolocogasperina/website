// Schema delle tabelle esistenti, generato con drizzle-kit pull dal DB locale (dev/sql/01-schema.sql).
// Prima di marcare 0000_baseline come applicata in produzione va confrontato con un pull da un branch Neon.
import { pgTable, unique, varchar, text, integer, boolean, jsonb, timestamp, numeric, foreignKey, index, uuid, serial, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const cashierOrderSeq = pgSequence("cashier_order_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const events = pgTable("events", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	slug: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	date: varchar({ length: 255 }).notNull(),
	dateLabel: varchar({ length: 255 }),
	time: varchar({ length: 255 }).notNull(),
	location: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	description: text().notNull(),
	fullDescription: text().notNull(),
	image: varchar({ length: 255 }).notNull(),
	maxParticipants: integer().notNull(),
	registeredCount: integer().notNull(),
	price: integer().notNull(),
	featured: boolean().notNull(),
	bookable: boolean().notNull(),
	isFree: boolean().default(false),
	config: jsonb(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("events_slug_key").on(table.slug),
]);

export const orders = pgTable("orders", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	buyerName: varchar({ length: 255 }).notNull(),
	buyerEmail: varchar({ length: 255 }).notNull(),
	buyerPhone: varchar({ length: 255 }),
	totalAmount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 50 }).default('PENDING').notNull(),
	nexiMac: varchar({ length: 255 }),
	discountId: varchar({ length: 255 }),
	notes: text(),
	thankYouEmailSent: boolean().default(false),
	isBlacklisted: boolean().default(false),
	blacklistReason: text(),
	blacklistedAt: timestamp({ mode: 'string' }),
	deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	paidAt: timestamp({ withTimezone: true, mode: 'string' }),
});

export const tickets = pgTable("tickets", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	orderId: varchar({ length: 255 }).notNull(),
	eventId: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 100 }).notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	qrCodeData: varchar({ length: 255 }).notNull(),
	isCheckedIn: boolean().default(false),
	checkInTime: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "tickets_orderId_fkey"
		}).onDelete("cascade"),
	unique("tickets_qrCodeData_key").on(table.qrCodeData),
]);

export const bookings = pgTable("bookings", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	eventId: varchar("event_id", { length: 255 }).notNull(),
	nome: varchar({ length: 255 }).notNull(),
	cognome: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	telefono: varchar({ length: 255 }),
	partecipanti: integer().default(1).notNull(),
	note: text(),
	stato: varchar({ length: 50 }).default('confermato').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	checkedIn: boolean().default(false),
});

export const news = pgTable("news", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	slug: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	coverImage: text(),
	content: text().notNull(),
	publishedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	author: varchar({ length: 255 }),
	featured: boolean().default(false),
	config: jsonb(),
}, (table) => [
	unique("news_slug_key").on(table.slug),
]);

export const gallery = pgTable("gallery", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	src: text().notNull(),
	alt: text().notNull(),
	category: varchar({ length: 50 }).default('territorio').notNull(),
	width: integer().default(1920).notNull(),
	height: integer().default(1080).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const pagesContent = pgTable("pages_content", {
	slug: varchar({ length: 255 }).primaryKey().notNull(),
	content: jsonb().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const discounts = pgTable("discounts", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	code: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 50 }).notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	maxUses: integer("max_uses").default(0),
	maxTickets: integer("max_tickets").default(0),
	currentUses: integer("current_uses").default(0),
	expiryDate: timestamp("expiry_date", { withTimezone: true, mode: 'string' }),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	appliesTo: varchar("applies_to", { length: 50 }).default('ALL'),
}, (table) => [
	unique("discounts_code_key").on(table.code),
]);

export const sponsors = pgTable("sponsors", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	logoUrl: text("logo_url").notNull(),
	websiteUrl: text("website_url"),
	tier: varchar({ length: 50 }).default('bronze').notNull(),
	active: boolean().default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const siteSettings = pgTable("site_settings", {
	key: varchar({ length: 255 }).primaryKey().notNull(),
	value: text().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const cashierOrders = pgTable("cashier_orders", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	eventId: varchar({ length: 255 }).notNull(),
	eventName: varchar({ length: 255 }).notNull(),
	orderNumber: integer().notNull(),
	cassaName: varchar({ length: 100 }).default('Cassa 1').notNull(),
	operatorName: varchar({ length: 100 }),
	totalAmount: numeric({ precision: 10, scale:  2 }).notNull(),
	paymentMethod: varchar({ length: 50 }).notNull(),
	cashReceived: numeric({ precision: 10, scale:  2 }),
	cashChange: numeric({ precision: 10, scale:  2 }),
	omaggioNote: text(),
	items: jsonb().notNull(),
	departmentStatuses: jsonb(),
	status: varchar({ length: 50 }).default('COMPLETED').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_cashier_orders_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_cashier_orders_event").using("btree", table.eventId.asc().nullsLast().op("text_ops")),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const zuccalandPhotos = pgTable("zuccaland_photos", {
	id: serial().primaryKey().notNull(),
	cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }).notNull(),
	frameName: varchar("frame_name", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const members = pgTable("members", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	cognome: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	tipo: varchar({ length: 50 }).default('ordinario').notNull(),
	dataIscrizione: varchar({ length: 50 }).notNull(),
	stato: varchar({ length: 50 }).default('attivo').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const refundRequests = pgTable("refund_requests", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	eventSlug: varchar("event_slug", { length: 255 }),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 255 }),
	bookingNumbers: text("booking_numbers").notNull(),
	accountHolder: varchar("account_holder", { length: 255 }),
	iban: varchar({ length: 64 }),
	reason: text(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	adminNotes: text("admin_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});
