# Attività e laboratori (`activities`)

Le regole di Zuccaland: quanti bambini ci sono nell'ordine (al massimo quanti sono gli ingressi), quali attività gratuite si scelgono e il promemoria del laboratorio a pagamento ("You Pick Lab"). Sostituisce il modulo generico "Domande ai partecipanti" (`attendee-questions`): la migrazione 0008 rinomina chiave e impostazioni.

**Impostazioni** (`editions.module_settings["activities"]`):
- `askChildren`: chiede quanti sono i bambini;
- `activities`: elenco con codice, nome, dettagli, per chi (`bambini` o `tutti`), giorni (date dell'edizione; nessuna = tutti) e posti per giorno (0 = senza limite);
- `labProductId`: il laboratorio a pagamento da ricordare; `remindIfMissing`: promemoria prima del pagamento se mancano attività o laboratorio;
- `questions`: altre domande (es. intolleranze); `scannerCounters`: pulsanti dello scanner come "+1 Bambino".

**Regole** (`rules.ts`, controllate dentro createOrder): un'attività si sceglie solo nei suoi giorni; le attività per bambini richiedono almeno un bambino; i posti si contano sui bambini (o sugli ingressi se l'attività è per tutti) degli ordini pagati e in attesa non scaduti. Le risposte migrate contengono il nome dell'attività invece del codice: valgono lo stesso.

**Risposte** in `attendee_answers`: `bambini` (numero, o `{ bambini, iscritti }` dagli ordini migrati) e `attivita` (codici o nomi).

**Eventi ascoltati**: nessuno. **Tabelle proprie**: nessuna.

**Dove compare**: voce "Attività" nella scheda edizione (conteggi per giorno: ordini, ingressi, bambini, posti di ogni attività), pannello nella pagina ordine e passo del checkout (fase 3), pulsanti dello scanner. Richiede `time-slots`.

Il backfill crea le impostazioni di Zuccaland 2026 da `pages_content.zuccaland.freeActivities`, con i giorni filtrati come fa oggi il checkout (Zucca in Vaso il sabato, Facepainting la domenica 11/18, "Altre attività" il 25).

Spegnere il modulo non cancella dati né impostazioni.
