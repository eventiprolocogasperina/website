<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Prima di ogni attività leggi `docs/ARCHITETTURA.md`. Le regole del §18 sono invariabili.
Se cambi un flusso descritto in `docs/mappa-logica.html` (sito, ordini, pagamenti, biglietti, ingresso, cassa, rimborsi, accessi, automatismi, interruttori) aggiornala nello stesso PR; un nodo o un messaggio di `log.error` nuovo va anche in `NODES`/`ERROR_RULES` di `src/server/domain/notifications/systemMap.ts`.
