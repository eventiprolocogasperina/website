# Edizioni, format e catalogo (prompt 08)

## Modello

- **Format** (`series`): un evento che si ripete (Zuccaland, Assaggia e Passeggia). Ha slug, nome, indirizzo pubblico (`landing_path`) e il colore del pallino nell'admin.
- **Edizione** (`editions`): un anno di un format, o un evento singolo senza format. Lo slug non cambia mai: lo usano URL dell'admin, ruoli, dispositivi e registro.
- **Date** (`sessions`): giorni o turni con orario, capienza e stato (aperta, esaurita, chiusa).
- **Prodotti** (`products`): biglietti, extra, prodotti della cassa, donazioni. Prezzo in centesimi, canali di vendita, se richiede una data, se emette un QR.
- **Quote** (`quotas` + `quota_products`): posti condivisi tra più prodotti. La capienza di una data è una quota implicita sui biglietti che richiedono la data. Un prodotto si vende fino alla quota più piccola.
- **Codici sconto** (`discounts_v2`): per edizione o per tutta l'associazione.
- **`legacy_id_map`**: collega le righe nuove a quelle delle tabelle di oggi (eventi, giorni Zuccaland, articoli della cassa).

## Servizi

| Cosa | Dove |
|---|---|
| Lista, creazione, duplicazione, modifica, stato | `src/server/domain/editions/index.ts` |
| Ciclo di vita (§9) | `src/server/domain/editions/lifecycle.ts` |
| Duplicazione delle date | `src/server/domain/editions/duplicate.ts` |
| Format | `src/server/domain/editions/series.ts` |
| Date, prodotti, quote, sconti | `src/server/domain/catalog/index.ts` |
| Disponibilità | `src/server/domain/quotas/availability.ts` (calcolo puro) + `legacy-sold.ts` (vendite dalle tabelle di oggi) |
| Import dal vecchio sistema | `src/server/domain/editions/backfill.ts` + `scripts/backfill-editions.ts` |

Ogni scrittura: permesso → validazione zod → transazione → edizione bloccata con `FOR UPDATE` (rifiuta le archiviate) → scrittura → registro attività.

## Cosa non cambia ancora

Le vendite, la cassa e il sito pubblico continuano a usare le tabelle di oggi. Le edizioni importate mostrano le vendite lette da lì; il passaggio agli ordini nuovi arriva con i prompt 09 e 10, il sito pubblico con la fase 4. Lo stato di un'edizione per ora non cambia né il sito né la cassa.

## Pagine dell'admin

`/admin/edizioni` (lista, nuova edizione da format, duplicando o vuota), `/admin/format`, e per ogni edizione `date`, `catalogo` (prodotti, quote, codici sconto) e `impostazioni` (generale, pagina pubblica, stato, moduli). La vecchia gestione delle schede del calendario resta in `/admin/edizioni/calendario`.
