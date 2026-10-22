-- Cassa: pulsante "Altro" (importo libero) acceso cassa per cassa (cash_registers.allow_open_amount,
-- spento di default). Le scorte dei prodotti di cassa restano quote (§5.4): nessuna colonna nuova.
-- Solo aggiunte. Rollback: ALTER TABLE "cash_registers" DROP COLUMN "allow_open_amount";
ALTER TABLE "cash_registers" ADD COLUMN "allow_open_amount" boolean DEFAULT false NOT NULL;