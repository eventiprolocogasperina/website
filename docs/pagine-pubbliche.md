# Pagine pubbliche a blocchi (prompt 17b)

Pagine del format e dell'edizione (§13.2–13.4) composte con blocchi dall'admin.

## URL

| URL | Cosa mostra | Attiva |
|---|---|---|
| `/zuccaland`, `/assaggia-e-passeggia` | edizione in stagione (`live` > `on_sale` > `sold_out` > `published`) o pagina fuori stagione del format | solo con `site_settings.public_v2 = 'true'`; spento = pagina di oggi |
| `/zuccaland/<anno>`, `/assaggia-e-passeggia/<anno>` | pagina dell'edizione (anche archiviata) | sempre |
| `/<format>`, `/<format>/<anno>` | come sopra, per i format nuovi con `series.landing_path = '/<format>'` | sempre (404 se non è un format) |
| `/avvisami/annulla/<token>` | disiscrizione dall'avviso, con clic di conferma | sempre |

Bozze e edizioni sospese non hanno pagina. Senza blocchi salvati si usa una struttura di partenza
(`defaultEditionBlocks`, `defaultOffseasonBlocks` in `src/server/domain/pages/resolve.ts`).

## Codice

- `src/components/public/blocks/schema.ts`: zod di ogni blocco, `readBlocks` (scarta i non validi).
- `src/components/public/blocks/*.tsx`: i componenti, senza stato (tranne Countdown e Avvisami), usati sia dalla pagina sia dall'anteprima. `BlockPage` applica i token `--brand*` del format (`brandThemeStyle` in `src/lib/edition-theme.ts`) e `@container`.
- `src/server/domain/pages/`: risoluzione degli URL e dati dei blocchi (`resolve.ts`), flag, editor e salvataggio (`index.ts`), Avvisami (`notify.ts`, handler in `handlers.ts`), conversione dei contenuti di oggi (`convert.ts`).
- Editor: `src/components/admin/page-editor/` su `/admin/e/[edition]/pagina` e `/admin/format/[slug]/pagina`. Interruttore `public_v2` in `/admin/format`.

Blocchi: Copertina (Hero), Testo, Programma, Prezzi, Acquista, Domande frequenti, Mappa, Galleria, Video, Sponsor, Conto alla rovescia, Regolamento e allegati, Recensioni, Numeri chiave, Tappe, Schede, Edizioni passate, Avvisami.
Prezzi, sponsor, foto della galleria (per categoria), recensioni (per evento) ed edizioni si leggono dal database.

## Migrazione dei contenuti

```bash
npx tsx scripts/convert-pages-to-blocks.ts              # prova
npx tsx scripts/convert-pages-to-blocks.ts --conferma   # scrive (solo dove non ci sono blocchi; --sovrascrivi per rifare)
BASE=http://localhost:3000 OUT=dev/screenshots node scripts/compare-block-pages.mjs   # pagine di oggi e nuove affiancate
```

## Dopo l'accensione di `public_v2` (dopo il 25 ottobre)

Rimuovere: `src/app/zuccaland/ZuccalandClient.tsx`, `src/app/assaggia-e-passeggia/AssaggiaGrazieClient.tsx`,
`src/app/assaggia-e-passeggia/edizione-2026/page.tsx` (con redirect a `/assaggia-e-passeggia/2026`), gli editor
di oggi `ZuccalandPageEditor` e `AssaggiaArchivePage` e il ramo `?editor=oggi` di `/admin/e/[edition]/pagina`.
Le sottopagine (`/zuccaland/rimborso`, `/photo`, `/galleria`, `/success`, tappe A&P) restano.
