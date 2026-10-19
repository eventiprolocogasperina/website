# Cassa (prompt 14)

La nuova cassa registra **contributi**: niente scontrino fiscale né IVA, in nessuna schermata, stampa o
rendiconto. Gira su telefoni e tablet dei volontari (da 360 px, Android e iOS), almeno due in
parallelo per evento. La vecchia `/cashier` resta attiva finché Zuccaland è in vendita (§18.10).

## Dove sta

| Cosa | Dove |
|---|---|
| App della cassa (PWA) | `/cassa` → `src/app/cassa/`, componenti in `src/components/field/cassa/` |
| Schermo reparto | `/cassa/reparto/<reparto>` (modulo `departments`) |
| Schermo pubblico "Pronti" | `/cassa/pronti/<edizione>` (solo numeri, impostazione `readyScreen` del modulo) |
| Admin | `/admin/e/<edizione>/cassa`: Casse, Prodotti per cassa, Reparti, Stampanti, Turni, Dispositivi, Rendiconto |
| Vecchia pagina admin | `/admin/e/<edizione>/cassa/vecchia` (invariata) |
| Servizi | `src/server/domain/cash/` (casse, turni, vendite, annulli, reparti, rendiconto, PDF) |
| API dei dispositivi | `src/app/api/cassa/*`; admin: `src/app/api/admin/cassa/*` |
| Funzioni pure | `src/lib/cash/` (tagli, resto, CSV, coda offline, stampa) |
| Tabelle | `cash_registers`, `cash_sessions`, `cash_sales`, `cash_counters` (migrazione `0009_cassa`) |

## Flusso (§12.1)

1. Dispositivo abbinato → nome → PIN (`FieldGate`). Dall'admin si apre con `/cassa?edizione=<slug>`.
2. Scelta della cassa. Se ha già un turno aperto ci si entra (un cassetto, un turno); altrimenti chi ha
   `pos.open_close_session` apre il turno dichiarando il fondo cassa.
3. Griglia per gruppo (reparto del prodotto, altrimenti il tipo), carrello, pagamento: contanti con
   tastierino, importi rapidi e resto; carta sul POS; omaggio con motivo.
4. La vendita è `createOrder` con canale `pos`, `payNow`, `cashSessionId` e la chiave di idempotenza
   generata dal telefono. Prezzi e scorte li decide il server (§18.1): due telefoni sull'ultima porzione
   → uno vende, l'altro riceve `SOLD_OUT`.
5. Numero grande da chiamare (contatore unico per edizione, solo per le casse che "danno il numero") e
   stampa ESC/POS con i generatori di oggi (`src/lib/cash/receipt.ts` fa da ponte).
6. Annullo dalle ultime vendite: PIN di un responsabile con `pos.void` e motivo. È uno storno con lo
   stesso metodo (rimborso già pagato, legato al turno che restituisce i soldi) più l'annullo dell'ordine:
   nulla si cancella.
7. Chiusura: conteggio per taglio da 500 € a 1 centesimo, atteso contro contato, nota obbligatoria se la
   differenza supera 1 €, chiusura Z numerata (contatore per edizione) in PDF con react-pdf.

## Offline

- Il listino e lo stato si salvano in IndexedDB (`proloco-cassa`); senza rete si vende con le scorte
  conosciute. Le vendite vanno nella coda (`queue`) con la loro chiave e l'ora del telefono.
- La coda parte da sola al ritorno della rete (evento `online` e ogni 15 secondi), in ordine, una vendita
  alla volta. Lo stesso invio ripetuto non crea doppioni. Un errore di dati (es. turno di un'altra
  edizione) lascia la vendita in coda segnata, da mostrare a un responsabile.
- Il server accetta le vendite offline anche oltre la scorta o dopo la chiusura del turno (i soldi sono
  già in cassa) e le segnala (`cash_sales.oversold`, `after_close`) in Turni › Vendite da controllare.
- Il banner in alto dice quanti ordini sono in coda. La chiusura del turno aspetta che la coda sia vuota.
- Manifest e service worker solo per `/cassa` (scope `/cassa`, header `Service-Worker-Allowed`): pagine
  della cassa prima dalla rete poi dalla cache, file statici di Next dalla cache, API mai in cache. Il
  service worker si registra solo in produzione.

## Tempo reale

`/api/cassa/stream` (SSE) legge il database ogni 2,5 secondi e chiude dopo 50 secondi (EventSource si
ricollega): funziona con più istanze, a differenza di `/api/cashier/realtime` che vive in memoria.

## Rendiconto

Per giorno (ora italiana), cassa, operatore, metodo e prodotto, in PDF e CSV (`;`, virgola decimale, BOM
per Excel). Usa gli stessi movimenti della Z, quindi la somma delle Z quadra con il rendiconto. Gli omaggi
sono indicati a parte e non entrano nei contributi. Sostituisce il vecchio "per data" con "salvataggio
storico e azzeramento": non si azzera niente, si filtra per data; per una nuova giornata si fa ripartire
solo il numero da chiamare (Casse › Riparti da…).

## Vecchia cassa → nuova cassa

| Funzione di oggi | Dove era | Dove è ora |
|---|---|---|
| Accesso con codice evento | `/cashier`, `CashierEntry` | Solo dispositivo abbinato + PIN (o admin con `?edizione=`) |
| Listino, prezzi, emoji, disponibilità | Admin › Cassa › Menu (`cashier_config`) | Catalogo dell'edizione, prodotti con canale **Cassa** |
| Scorte per piatto (`stockQuantity`) | Admin › Cassa › Menu | Quote del catalogo (backfill: `Scorta: <prodotto>`) |
| Elenco casse (`casses`) | Admin › Cassa › Casse | Cassa › **Casse** (`cash_registers`) |
| Prodotti per cassa (`cassaAssignments`) | Admin › Cassa › Casse | Cassa › **Prodotti per cassa** (`product_ids`) |
| Reparti, modalità multi-stand | Admin › Cassa › Eventi (`enableDepartments`) | Modulo `departments` + reparto sul prodotto; Cassa › **Reparti** |
| Impostazioni stampante | Admin › Cassa › Stampante | Cassa › **Stampanti** (per cassa) |
| Stampa Bluetooth / seriale ESC/POS | `CashierClient` | Uguale, dall'app `/cassa` (stessi generatori) |
| QR della ricevuta online | Ricevuta stampata | Non c'è (la nuova cassa non ha ricevuta online) |
| Vendita contanti / POS / omaggio | `CashierClient` | `/cassa` (con tastierino, importi rapidi e resto) |
| Annullo di un ordine | Admin › Cassa › Report | `/cassa` › Ultime vendite, con PIN del responsabile e motivo |
| Numero progressivo, "Nuova giornata" | Admin › Cassa › Report | Cassa › Casse › **Riparti da…** (`cash_counters`) |
| Report per data, "salva storico e azzera" | Admin › Cassa › Report | Cassa › **Rendiconto** (PDF/CSV, filtro date) + **Turni** (Z) |
| Statistiche di cassa | `/api/cashier/stats` | Rendiconto e Turni |
| Schermo stand / reparto | `/cashier/stand` (`StandClient`) | `/cassa/reparto/<reparto>` con 4 colonne |
| Aggiornamenti in tempo reale | `/api/cashier/realtime` (memoria) | `/api/cassa/stream` (database) |
| Eventi della cassa (`events`) | Admin › Cassa › Eventi | Edizioni (backfill `cashier_event`) |
| Dispositivi | Sistema › Utenti › Dispositivi | Anche Cassa › **Dispositivi** (solo pos dell'edizione) |
| Turno, fondo cassa, chiusura Z | — (non esisteva) | `/cassa` + Cassa › Turni |

I file vecchi (`CashierClient`, `StandClient`, `CashierAdminPage`, `/api/cashier/*`) restano finché
Zuccaland è in vendita; si tolgono con la checklist di chiusura (prompt 16).

## Backfill

`npm run backfill:editions` crea anche le casse dalla configurazione di oggi (`planRegisters` in
`src/server/domain/editions/backfill-cash.ts`): una per ogni nome in `casses` (oppure una sola "Cassa"),
con i prodotti di `cassaAssignments` (vuoto = tutti) e la stampante dell'evento o quella predefinita
(QR spento). Riconosciute in `legacy_id_map` come `cashier_register`.
