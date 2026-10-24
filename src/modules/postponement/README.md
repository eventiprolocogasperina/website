# Rinvio per maltempo (`postponement`)

La regola di Zuccaland: in caso di maltempo la giornata non si annulla ma si rinvia a una data di recupero. Gli ordini passano alla nuova data, i biglietti restano validi, il cliente riceve un'email. Se anche la data di recupero viene rinviata (secondo rinvio consecutivo), l'acquirente ha diritto al rimborso integrale.

**Dati**: `sessions.status = 'postponed'` e `sessions.rescheduled_to_session_id` (la data di recupero); `orders_v2.original_session_id` (la data scelta all'acquisto). Zuccaland 2026: 10 → 17 e 11 → 18 ottobre, creati dal backfill.

**Impostazioni**: `notifyByEmail`, `noticeTitle` e `noticeMessage` (avviso sul sito, con la pagina pubblica nuova della fase 4; fino ad allora resta quello delle Impostazioni del vecchio admin), `refundOnSecondPostponement`, `allowCustomerChange` (fase 4).

**Servizi** (`server.ts`): `postponeSession` (rinvio in un passo: stato, collegamento, data originale degli ordini, spostamento, registro; si può rilanciare), `moveAllOrders`, `postponementRefundRight(orderId)` (conta i rinvii seguendo i collegamenti dalla data originale). Senza il modulo, `moveSession` rifiuta.

**Eventi ascoltati**: `order.session_moved` → email al cliente, con il testo del rinvio se la data di partenza è rinviata (`handlers.ts`).

**Tabelle proprie**: nessuna.

**Dove compare**: voce "Rinvii" nella scheda edizione (elenco delle giornate con "Rinvia"), "Recupero: …" in Date, azione "Sposta data" e pannello "Rinvii" nella pagina ordine (fase 3). Richiede `time-slots`.

Spegnere il modulo non cancella dati né impostazioni.
