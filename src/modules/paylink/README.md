# Pagamento con link (`paylink`)

Ordine creato dall’admin che il cliente paga da un link. Resta in attesa per le ore impostate, poi scade e libera i posti.

**Impostazioni** (`editions.module_settings["paylink"]`, form generato dallo schema in `module.ts`): `validityHours` (validità del link, in ore; default 48).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: Nessuna.

**Dove compare**: Azione “Crea link di pagamento” nella pagina ordine. Servizio `createPaylinkOrder` in `server.ts`; la scadenza la calcola il nucleo (`pendingTtlMs`). La pagina di pagamento del link arriva con il checkout nuovo (prompt 13): fino ad allora il pay-link di oggi resta nella pagina Ordini. Senza il modulo, `createOrder` rifiuta il canale `paylink`.

Spegnere il modulo non cancella dati né impostazioni.
