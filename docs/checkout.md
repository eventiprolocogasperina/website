# Checkout, pagamento Nexi e "I miei biglietti" (prompt 13)

## Percorso del cliente

1. `/acquista/[edition]`: **Scegli** (data, se c'è il modulo Fasce orarie, e biglietti), **Dati** (nome, email, telefono, consensi, bambini e attività se c'è il modulo Attività), **Riepilogo** (calcolato dal server con `priceCart`, codice sconto), **Pagamento**.
2. "Vai al pagamento" crea l'ordine `pending`: i posti sono tenuti 15 minuti (conto alla rovescia visibile). Il carrello resta in `sessionStorage` se la pagina si ricarica.
3. `/acquista/paga/[token]` invia a Nexi il modulo firmato. Importo e codice si leggono dal database.
4. Nexi chiama `/api/pagamenti/nexi/notifica` (server, `urlpost`) e rimanda il browser a `/api/pagamenti/nexi/esito` (`url`). Entrambi passano da `processResult`, che è idempotente.
5. `/acquista/[edition]/conferma/[token]`: stato, codice, QR, PDF, calendario (.ics), link a "I miei biglietti". Se il pagamento è annullato o rifiutato mostra "Riprova il pagamento".
6. All'evento `order.paid` (canali online e pay-link) parte l'email con il PDF (`src/server/email/order-tickets.tsx`).
7. `/i-miei-biglietti/[token]`: biglietti, PDF, calendario, cambio data (se il modulo Rinvio lo consente al cliente), richiesta di rimborso (se il modulo Rinvio la concede).

## Esito di Nexi (`src/server/integrations/nexi/`)

| Caso | Cosa succede |
|---|---|
| MAC non valido | Nulla viene registrato. Il browser va su `/acquista/esito-non-valido`; la notifica riceve 400. |
| OK con l'importo giusto | Pagamento `succeeded`. L'ordine diventa pagato, una volta sola anche con notifica e ritorno. |
| OK con un importo diverso | L'ordine **non** diventa pagato. Il pagamento resta "in attesa" con la nota e parte un solo allarme Telegram (codice e importi, nessun dato personale). |
| KO o errore | Pagamento `failed`. L'ordine resta in attesa fino alla scadenza e il cliente può riprovare. |
| Annullo | Nessun pagamento. Il cliente torna alla conferma con "Riprova". |

## Variabili

| Variabile | Valore |
|---|---|
| `NEXI_ALIAS`, `NEXI_MAC_KEY` | Credenziali Nexi. In locale quelle di **test**. |
| `NEXI_ENDPOINT` | Default: ambiente di test di Nexi. In produzione, l'indirizzo di produzione. |
| `NEXI_MODE` | `simulatore` solo in locale: una finta pagina di Nexi (`/api/pagamenti/nexi/simulatore`), mai attiva su Vercel in produzione. |
| `NUOVO_CHECKOUT` | `1`: a Zuccaland il riquadro d'acquisto diventa il link al checkout nuovo, e i vecchi URL di successo portano alla conferma nuova per gli ordini migrati. Spento finché Zuccaland vende (§18.10). |

## Test

```bash
npm run test:db                 # dominio: ordine, esito doppio, importo sbagliato, firma falsa, cambio data
docker compose -f dev/docker-compose.yml up -d --build
npm run test:e2e                # Playwright: acquisto completo, senza moduli, data esaurita, sconto, annullo, scaduto, notifica doppia
```

I test end-to-end ricreano il database locale `proloco_e2e`, avviano un secondo proxy Neon su `:4455` e il sito su `:3210` con il simulatore.
Per lanciarli accanto a un'altra copia: `E2E_PORT=3474 E2E_PROXY_PORT=4462 E2E_DATABASE_URL=postgres://postgres:postgres@localhost:5432/altro_e2e npm run test:e2e` (il nome del database deve finire in `_e2e`).
`e2e/editor-blocchi.spec.ts` prova l'editor dei blocchi (Modifica dal menu, Aggiungi blocco, salvataggio), `e2e/scanner-annullo.spec.ts` l'annullo di un ingresso dallo scanner.
