# Proposta di correzione di `/privacy` (da approvare)

**Per Niccolo.** È un testo legale: non è stato pubblicato. Il prompt 17 ha creato `/trasparenza` (elenco dei fornitori e dei cookie) e ha solo aggiunto in fondo a `/privacy` un link a quella pagina.

## Perché

Il riquadro in alto di `src/app/privacy/page.tsx` dice:

> **Non cediamo mai i tuoi dati a terzi né li utilizziamo per profilazione pubblicitaria o marketing commerciale.**

I dati però passano, per conto della Pro Loco, da fornitori tecnici: Vercel (hosting), Neon (database), Nexi (pagamenti), Resend (email), Cloudinary (immagini), Telegram (notifiche interne, oggi solo codici e importi) e Meta/WhatsApp (messaggi). "Cedere" non è il termine sbagliato in senso stretto, perché i responsabili del trattamento non li ricevono "in proprietà". Il lettore però capisce che nessun altro vede i dati, e così la frase contraddice la pagina Trasparenza. Anche la sezione 6 nomina solo Nexi.

## Testo proposto

**Riquadro in alto, ultima frase** (al posto di quella citata):

> **Non vendiamo né cediamo i tuoi dati per pubblicità, marketing o profilazione.** Per far funzionare il sito e gli eventi ci affidiamo ad alcuni fornitori tecnici (hosting, database, pagamenti, invio delle email, archivio delle immagini, messaggistica), che trattano i dati solo per nostro conto e secondo le nostre istruzioni, come responsabili del trattamento (art. 28 GDPR). L'elenco completo, con il paese in cui si trovano i server, è nella pagina [Trasparenza sui dati](/trasparenza).

**Sezione 6, secondo e terzo punto** (al posto di "Fornitori di servizi tecnici…" e "Istituti bancari… (Nexi S.p.A.)"):

> - Fornitori di servizi tecnici nominati responsabili del trattamento: Vercel Inc. (hosting del sito), Neon Inc. (database), Resend Inc. (invio delle email), Cloudinary Ltd. (archivio delle immagini), Telegram (notifiche interne allo staff, senza dati personali dei clienti), Meta Platforms Ireland Ltd. (WhatsApp, solo se ci scrivi tu);
> - Nexi Payments S.p.A., per la sola gestione dei pagamenti con carta;
>
> Alcuni di questi fornitori hanno sede negli Stati Uniti: il trasferimento avviene sulla base del EU-U.S. Data Privacy Framework o delle clausole contrattuali standard della Commissione europea. I dettagli sono nella pagina [Trasparenza sui dati](/trasparenza).

**Sezione 5 (conservazione), da aggiungere** quando la domanda aperta §20.3 è decisa:

> I dati degli acquisti e delle prenotazioni sono conservati per 24 mesi dopo la chiusura dell'edizione e poi resi anonimi; i dati contabili per 10 anni (art. 2220 c.c.).

## Da verificare prima di pubblicare
1. Le basi del trasferimento verso gli Stati Uniti (DPF o clausole standard) nei contratti di Vercel, Neon, Resend e Cloudinary.
2. La regione dei server di Vercel e Neon (oggi indicata come "server in UE" in `/trasparenza`: da confermare nelle impostazioni dei progetti).
3. I 24 mesi di conservazione (§20.3).
