# Domande ai partecipanti (`attendee-questions`)

Domande configurabili (testo, numero, scelta, età), per ordine o per biglietto. Le risposte stanno in `attendee_answers`. Oggi a Zuccaland: bambini e attività, che la migrazione (prompt 10) ha già portato fuori dalle note.

**Impostazioni** (`editions.module_settings["attendee-questions"]`, form generato dallo schema in `module.ts`): `questions` (elenco: codice, domanda, tipo, opzioni, obbligatoria, per biglietto), `scannerCounters` (pulsanti dello scanner tipo “+1 Bambino”: testo, codice della domanda, quanto aggiunge).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: Nessuna: usa `attendee_answers` del nucleo.

**Dove compare**: Pannello “Risposte” nella pagina ordine, passo “Partecipanti” nel checkout, azioni dello scanner calcolate dalle impostazioni (non più cablate in `src/app/admin/scanner/page.tsx`: lo scanner nuovo le legge con il prompt 15).

Spegnere il modulo non cancella dati né impostazioni.
