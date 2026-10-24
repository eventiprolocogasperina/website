# Baseline di qualità (prompt 00)

Fotografia del codice al commit `444c7d6`, prima di ogni modifica. Serve come punto di partenza:
questi errori **non** vanno corretti ora.

## `npm run typecheck` (tsc --noEmit)

**0 errori.**

## `npm run lint` (eslint)

**ESLint non parte**, quindi non c'è un conteggio per file:

```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'configs' -> object with constructor 'Object'
    |     property 'flat' -> object with constructor 'Object'
    |     ...
    |     property 'plugins' -> object with constructor 'Object'
    --- property 'react' closes the circle
```

Causa: `eslint.config.mjs` carica `eslint-config-next` 16 tramite `FlatCompat`, ma dalla
versione 16 quel pacchetto esporta già la configurazione "flat". Da sistemare nel prompt 04,
importando direttamente `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`.

## Test

Nessun test esistente. `npm run test` (Vitest) è pronto per i test dei prompt successivi.

## Dopo il prompt 04

- `npm run typecheck`: 0 errori.
- `npm run lint`: **0 errori, circa 495 avvisi**. ESLint ora parte (configurazione flat diretta).
  Sistemati gli errori veri: hook chiamati dopo un `return` in `WhatsAppWidget`, `require()`,
  `@ts-ignore`, `<a href="/">` al posto di `<Link>`, `let` mai riassegnati.
  Nel codice precedente al rifacimento cinque regole (`no-explicit-any`, `no-unescaped-entities`,
  `set-state-in-effect`, `immutability`, `purity`) sono declassate ad avviso: si sistemano quando
  quei file vengono riscritti. Il codice nuovo (`src/server/`, `src/lib/{money,dates,codes}.ts`) le
  ha come errori.
- `npm test`: 43 test.
