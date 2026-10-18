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
