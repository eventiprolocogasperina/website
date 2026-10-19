CREATE SEQUENCE "public"."cashier_order_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cognome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"telefono" varchar(255),
	"partecipanti" integer DEFAULT 1 NOT NULL,
	"note" text,
	"stato" varchar(50) DEFAULT 'confermato' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"checkedIn" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "cashier_orders" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"eventId" varchar(255) NOT NULL,
	"eventName" varchar(255) NOT NULL,
	"orderNumber" integer NOT NULL,
	"cassaName" varchar(100) DEFAULT 'Cassa 1' NOT NULL,
	"operatorName" varchar(100),
	"totalAmount" numeric(10, 2) NOT NULL,
	"paymentMethod" varchar(50) NOT NULL,
	"cashReceived" numeric(10, 2),
	"cashChange" numeric(10, 2),
	"omaggioNote" text,
	"items" jsonb NOT NULL,
	"departmentStatuses" jsonb,
	"status" varchar(50) DEFAULT 'COMPLETED' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"max_uses" integer DEFAULT 0,
	"max_tickets" integer DEFAULT 0,
	"current_uses" integer DEFAULT 0,
	"expiry_date" timestamp with time zone,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"applies_to" varchar(50) DEFAULT 'ALL',
	CONSTRAINT "discounts_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" varchar(255) NOT NULL,
	"dateLabel" varchar(255),
	"time" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"fullDescription" text NOT NULL,
	"image" varchar(255) NOT NULL,
	"maxParticipants" integer NOT NULL,
	"registeredCount" integer NOT NULL,
	"price" integer NOT NULL,
	"featured" boolean NOT NULL,
	"bookable" boolean NOT NULL,
	"isFree" boolean DEFAULT false,
	"config" jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "events_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"src" text NOT NULL,
	"alt" text NOT NULL,
	"category" varchar(50) DEFAULT 'territorio' NOT NULL,
	"width" integer DEFAULT 1920 NOT NULL,
	"height" integer DEFAULT 1080 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cognome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"tipo" varchar(50) DEFAULT 'ordinario' NOT NULL,
	"dataIscrizione" varchar(50) NOT NULL,
	"stato" varchar(50) DEFAULT 'attivo' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"coverImage" text,
	"content" text NOT NULL,
	"publishedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"author" varchar(255),
	"featured" boolean DEFAULT false,
	"config" jsonb,
	CONSTRAINT "news_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"buyerName" varchar(255) NOT NULL,
	"buyerEmail" varchar(255) NOT NULL,
	"buyerPhone" varchar(255),
	"totalAmount" numeric(10, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"nexiMac" varchar(255),
	"discountId" varchar(255),
	"notes" text,
	"thankYouEmailSent" boolean DEFAULT false,
	"isBlacklisted" boolean DEFAULT false,
	"blacklistReason" text,
	"blacklistedAt" timestamp,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"paidAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pages_content" (
	"slug" varchar(255) PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_slug" varchar(255),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255),
	"booking_numbers" text NOT NULL,
	"account_holder" varchar(255),
	"iban" varchar(64),
	"reason" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" varchar(255) NOT NULL,
	"name" varchar(255),
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" text NOT NULL,
	"website_url" text,
	"tier" varchar(50) DEFAULT 'bronze' NOT NULL,
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"orderId" varchar(255) NOT NULL,
	"eventId" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"qrCodeData" varchar(255) NOT NULL,
	"isCheckedIn" boolean DEFAULT false,
	"checkInTime" timestamp with time zone,
	CONSTRAINT "tickets_qrCodeData_key" UNIQUE("qrCodeData")
);
--> statement-breakpoint
CREATE TABLE "zuccaland_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cloudinary_public_id" varchar(255) NOT NULL,
	"frame_name" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cashier_orders_created" ON "cashier_orders" USING btree ("createdAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_cashier_orders_event" ON "cashier_orders" USING btree ("eventId" text_ops);