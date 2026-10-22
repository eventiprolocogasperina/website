# Guida agli eventi

> Stesso testo della pagina dell'admin **/admin/guida** (fonte: `src/lib/admin-guide.ts`). Se cambi una delle due, aggiorna anche l'altra.

Da dove si parte e in che ordine: **Format → Edizione → Date → Biglietti/Extra → Pagina → Cassa/Ingresso → Durante l'evento → Dopo l'evento**.

## Procedura guidata "Nuova edizione"

1. **Che evento è?** Un format esistente (Zuccaland, Assaggia e Passeggia, Gite…), un nuovo format, oppure solo una pagina informativa.
2. **Da dove parti.** Per un format: "Parti dall'edizione precedente" copia l'ultima edizione e sposta le date di un anno.
3. Poi un passo alla volta, ognuno con **Salta per ora**: Date e luogo · Biglietti e prezzi · Extra e attività · Pagina e grafica · Regolamento · Casse · Codici sconto e inviti · Pubblica e apri le vendite. Ogni passo porta alla pagina dell'admin dove si fa (luogo e link al regolamento si scrivono direttamente nel passo).

Tutto resta in bozza. La panoramica dell'edizione mostra **Da completare**: i passi in ordine con lo stato (fatto, da fare, saltato), calcolato dai dati. Un passo saltato resta da fare.

**Le vendite non si aprono** (il server lo rifiuta e dice cosa manca) finché mancano: date con la capienza e il luogo, un biglietto in vendita online, la pagina (salvata, o la descrizione per la scheda nel calendario), il regolamento. Casse, extra e codici sono facoltativi per aprire le vendite. La riapertura automatica dopo "Esaurita" non è bloccata.

Un evento solo informativo ha tre passi: date e luogo, pagina, pubblica.

### Cosa copia "Parti dall'edizione precedente"

| Si copia | Non si copia |
|---|---|
| Pagina a blocchi (anno della copertina e conto alla rovescia aggiornati), copertina, descrizione, categoria | Ordini, pagamenti, rimborsi |
| Moduli e loro impostazioni (attività per giorno, laboratorio…), notifiche | Venduti, biglietti, ingressi |
| Date (stesso giorno della settimana, un anno dopo) con le capienze, quote | Turni di cassa e chiusure Z |
| Biglietti, extra e prodotti della cassa con i prezzi | Codici sconto (sono unici e hanno i loro utilizzi) |
| Casse con i loro prodotti, liste di check-in | Passi saltati della procedura |

L'edizione di partenza non cambia, anche se è archiviata. Logo e colori stanno nel format, quindi valgono già per la nuova edizione.

## 1. Format

L’evento che si ripete ogni anno: Zuccaland, Assaggia e Passeggia, Gite. Ha logo, colori e una pagina pubblica stabile.

- Si crea una volta sola, in Format (o nella procedura “Nuova edizione” → Nuovo format).
- Logo e colori cambiano poco ogni anno: si aggiornano nel format e valgono per tutte le sue edizioni.
- Un evento solo informativo (senza vendite) può anche non avere un format.

## 2. Edizione

Un anno del format (Zuccaland 2027). Si crea almeno 2 settimane prima, nasce in bozza e non si vede sul sito finché non la pubblichi.

- Edizioni → Nuova edizione: scegli il format e “Parti dall’edizione precedente”. Si copiano pagina, grafica, moduli, regolamento, biglietti e prezzi, attività, casse e notifiche; le date si spostano di un anno, stesso giorno della settimana.
- Non si copiano ordini, venduti, ingressi né codici sconto.
- Ogni passo della procedura ha “Salta per ora”: la panoramica dell’edizione mostra “Da completare” con quello che manca, in ordine.

## 3. Date e posti

Ogni giorno (o fascia) è una data con la sua capienza, presa dal piano di sicurezza.

- Date e capienze: aggiungi i giorni, gli orari e i posti. Una data senza capienza blocca l’apertura delle vendite.
- Rinvio per maltempo (modulo): la data rinviata passa alla data di recupero e i clienti ricevono l’email.
- Esaurita: scatta da sola quando i posti finiscono e si toglie se se ne liberano.

## 4. Biglietti ed extra

Nel Catalogo: il biglietto d’ingresso (es. “Intero”) e gli extra (You-Pick Lab, calice di vino).

- Prezzi in euro, canali: online, cassa, inviti. Lo stesso prezzo vale online e all’ingresso.
- Attività gratuite per giorno con i loro posti: Impostazioni → Moduli → Attività e laboratori.
- Codici sconto per gli sponsor nel Catalogo; biglietti omaggio per enti e sponsor nel modulo Inviti.

## 5. Pagina e regolamento

La pagina pubblica dell’edizione, a blocchi: copertina, programma, menu e tappe, prezzi (letti dal catalogo), allegati.

- Pagina pubblica: modifica i blocchi copiati dall’anno scorso e salva.
- Regolamento (foto, comportamento, partecipazione, rinvii): è la voce “Regolamento” del blocco Allegati. Il checkout chiede di accettarlo.
- Le vendite si aprono solo con date e capienze, un biglietto online, la pagina e il regolamento.

## 6. Cassa e ingresso

Per il giorno dell’evento: almeno due casse e lo scanner all’ingresso.

- Cassa: la principale all’ingresso vende tutto, le secondarie solo i prodotti scelti.
- Abbina i telefoni con il QR e il PIN; ogni volontario entra con il suo PIN.
- Check-in: liste d’ingresso e telefoni dello scanner.

## 7. Durante l’evento

Segna l’edizione “in corso”: in panoramica trovi ingressi, capienza e attività del giorno.

- Tutto esaurito: proponi un’altra data (la lista d’attesa nel sito non c’è ancora).
- Rinvio deciso dal direttivo: Rinvio per maltempo, poi avviso sui social e email ai clienti.
- Vendita all’ingresso dalla cassa, allo stesso prezzo dell’online.

## 8. Dopo l’evento

Dichiara conclusa, chiudi i conti, poi archivia.

- Recensioni: chiedile con il link alla galleria delle foto.
- Rimborsi (pochi, con bonifico) nella sezione Rimborsi.
- Rendiconto per il direttivo (PDF e CSV): a edizione conclusa, da Impostazioni → Chiusura e archivio; puoi rigenerarlo finché non archivi. I costi non ci sono ancora.
- Archivia: l’edizione diventa di sola lettura per sempre.

## Per chi sviluppa

- Checklist e guardia: `src/lib/edition-setup.ts` (puro), `src/server/domain/editions/setup.ts` (lettura dei dati, passi, `assertSalesReady` chiamata da `changeEditionStatus`).
- Stato della procedura salvato in `editions.module_settings._setup` (`{ kind: 'sales' | 'info', skipped: [...] }`): nessuna migrazione.
- Procedura: `/admin/edizioni/nuova` (tipo e punto di partenza), poi `/admin/e/<edizione>/procedura/<passo>`.
