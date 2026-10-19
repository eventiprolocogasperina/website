# Moduli delle edizioni

Riferimento: `docs/ARCHITETTURA.md` §7. Un modulo è una funzione in più che si accende per una singola edizione (fasce orarie, inviti, foto…). Il nucleo (ordini, cassa, scanner) non conosce le edizioni per nome: chiede ai moduli attivi.

## Dove stanno

| File | Cosa contiene |
|---|---|
| `src/modules/types.ts` | Il contratto `EditionModule` e i tipi dei punti di estensione |
| `src/modules/registry.ts` | L'elenco dei moduli, `moduleSettings`, le dipendenze e i **punti di estensione** (`extensionPoints.orderPanels`, `orderActions`, `checkoutSteps`, `scannerActions`, `posActions`, `closingChecks`, `dashboardWidgets`, `nav`) |
| `src/modules/settings-form.ts` | Lo schema zod delle impostazioni diventa la descrizione del form (booleani, numeri, testi, scelte, elenchi ripetibili) |
| `src/modules/handlers.ts` | Gli handler sugli eventi di dominio, attivi solo se il modulo è acceso; `getEnabledModules(editionId)` |
| `src/modules/<key>/module.ts` | La definizione: dati, nessun accesso al database. La leggono server e interfaccia |
| `src/modules/<key>/server.ts` | I servizi del modulo (es. `sendInvites`, `moveAllOrders`) |
| `src/modules/<key>/README.md` | Cosa fa, impostazioni, eventi, tabelle |
| `src/server/domain/editions/modules.ts` | `setModuleEnabled`, `saveModuleSettings` (permesso `modules.manage`) |

## Regole

- Accendere un modulo che dipende da un altro spento è rifiutato, e così spegnere un modulo da cui dipende uno acceso.
- **Spegnere non cancella niente**: dati e impostazioni tornano com'erano quando si riaccende.
- Le impostazioni si salvano solo se passano lo schema del modulo. Valori che non lo passano più (schema cambiato) tornano al default in lettura.
- I servizi del nucleo controllano il modulo, non solo l'interfaccia: un invito, un pay-link o un cambio data su un'edizione senza il modulo sono rifiutati.
- Ogni cambio finisce nel registro attività (`edition.module_enabled`, `edition.module_disabled`, `edition.module_settings_saved`).

## Aggiungere un modulo

1. Aggiungi la chiave a `ModuleKey` in `types.ts`.
2. Crea `src/modules/<key>/module.ts` con `defineModule({...})`: schema con un default per ogni campo, etichette in `settingsLabels` (anche `lista.campo`).
3. Registralo in `registry.ts`. Se ha una pagina nell'admin, aggiungi `admin.nav` e la pagina in `src/app/admin/e/[edition]/m/[module]/page.tsx`.
4. Handler sugli eventi: un file `handlers.ts` nella cartella e una riga in `src/modules/handlers.ts`.
5. Tabelle proprie con prefisso `mod_<key>_`.
6. Scrivi il `README.md` e i test (`src/modules/registry.test.ts` controlla che ogni campo abbia un'etichetta).

## Stato del prompt 11

Fatto: registro, punti di estensione, interruttori e form nelle Impostazioni, i servizi di inviti, pay-link, rinvio in blocco e destinatari dei messaggi, l'email automatica del rinvio.

Dopo la prova di Niccolo (19-10-2026) due moduli generici sono diventati su misura per le regole di Zuccaland:
- **Attività e laboratori** (`activities`, prima `attendee-questions`): attività gratuite con i loro giorni e posti, bambini, laboratorio a pagamento. Pagina "Attività" con i conteggi per giorno.
- **Rinvio per maltempo** (`postponement`): giornata rinviata collegata alla data di recupero (10 → 17, 11 → 18), rinvio in un passo, rimborso al secondo rinvio. Pagina "Rinvii".

Il form delle impostazioni sa anche scegliere date (`.meta({ widget: 'sessions' })`) e un prodotto (`.meta({ widget: 'product' })`) dell'edizione.

Le pagine che usano i punti di estensione arrivano con i prompt successivi: pagina ordine (12), checkout (13), scanner e cassa (15), checklist di chiusura (16). Fino ad allora le funzioni di oggi restano dove sono: inviti e foto da Moduli nella scheda edizione, pay-link e messaggi WhatsApp dalla pagina Ordini, "+1 Bambino" nello scanner di oggi.

Restano nomi di edizione nel codice, motivati:
- `src/server/domain/editions/backfill.ts`: dati della migrazione (quali edizioni creare e con quali moduli);
- `src/server/domain/pricing/legacyCatalog.ts`: il catalogo che usa oggi l'acquisto di Zuccaland, in vendita (§18.10); sparisce con il checkout nuovo (prompt 13);
- `src/components/admin/OrderManager.tsx`: la pagina Ordini di oggi, sostituita dal prompt 12;
- `src/components/admin/GalleryForm.tsx`: `baguette26` è una categoria della galleria, non un'edizione.

## Reparti nella nuova cassa (prompt 14)

Con `departments` attivo le righe di cassa con un reparto partono "da preparare" e compaiono in `/cassa/reparto/<reparto>` (da preparare → in preparazione → pronte → consegnate). L'impostazione **Schermo Pronti** (`readyScreen`, spenta di default) accende lo schermo pubblico `/cassa/pronti/<edizione>`, che mostra solo i numeri. Vedi `docs/cassa.md`.
