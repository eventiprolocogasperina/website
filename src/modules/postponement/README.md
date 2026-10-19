# Rinvio date (`postponement`)

Sposta un ordine o tutti gli ordini di una data su un’altra data della stessa edizione, controllando la capienza. Ogni spostamento resta nella cronologia (`order.session_moved` nel registro).

**Impostazioni** (`editions.module_settings["postponement"]`, form generato dallo schema in `module.ts`): `notifyByEmail` (email automatica al cliente), `allowCustomerChange` (il cliente cambia data da solo: con il prompt 13).

**Eventi ascoltati**: `order.session_moved` → email “nuova data per l’ordine” se `notifyByEmail` (in `handlers.ts`).

**Tabelle proprie**: Nessuna.

**Dove compare**: Azione “Sposta data” nella pagina ordine. Servizio `moveAllOrders` in `server.ts` per lo spostamento in blocco. Richiede `time-slots`. Senza il modulo, `moveSession` rifiuta.

Spegnere il modulo non cancella dati né impostazioni.
