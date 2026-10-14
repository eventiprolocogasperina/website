import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const colors = {
  primary: '#1e3a8a', // Deep Blue
  primaryLight: '#eff6ff',
  primaryBorder: '#93c5fd',
  accent: '#d97706', // Amber/Gold
  success: '#059669', // Emerald
  successLight: '#ecfdf5',
  successBorder: '#a7f3d0',
  warning: '#d97706', // Orange
  warningLight: '#fffbeb',
  warningBorder: '#fde68a',
  danger: '#dc2626', // Red
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  info: '#2563eb',
  infoLight: '#eff6ff',
  infoBorder: '#bfdbfe',
  dark: '#0f172a',
  text: '#1e293b',
  textMuted: '#64748b',
  bgLight: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: colors.text,
    fontSize: 9,
    lineHeight: 1.35,
  },
  header: {
    backgroundColor: colors.primary,
    padding: '12 16',
    borderRadius: 6,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  orgTitle: {
    color: '#93c5fd',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  mainTitle: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.3,
  },
  subTitle: {
    color: '#e2e8f0',
    fontSize: 8.5,
    marginTop: 2,
  },
  badgeVersion: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: '4 8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },
  badgeVersionText: {
    color: colors.white,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: 3,
    marginBottom: 6,
  },
  sectionNumber: {
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    width: 15,
    height: 15,
    borderRadius: 3,
    textAlign: 'center',
    marginRight: 6,
    paddingTop: 1.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid2: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 7,
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: colors.dark,
    marginBottom: 3,
  },
  cardText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.3,
  },
  // Color status cards
  statusBox: {
    borderRadius: 5,
    padding: '6 8',
    marginBottom: 5,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  statusFound: {
    backgroundColor: colors.infoLight,
    borderColor: colors.infoBorder,
  },
  statusWarning: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  statusDanger: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusBadge: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },
  statusAction: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    padding: '1 5',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  statusDesc: {
    fontSize: 7.8,
    color: colors.text,
    lineHeight: 1.25,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  bulletDot: {
    width: 10,
    fontSize: 8,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 1.25,
  },
  highlightBox: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: '5 8',
    borderRadius: 3,
    marginBottom: 6,
  },
  highlightText: {
    fontSize: 8,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 26,
    right: 26,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
  },
});

export function ScannerGuideDocument() {
  return (
    <Document title="Manuale Scanner Biglietti - Pro Loco Gasperina" author="Pro Loco Gasperina APS">
      {/* ── PAGINA 1: MODALITÀ D'USO E RICERCA ── */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.orgTitle}>PRO LOCO GASPERINA APS • GESTIONE INGRESSI</Text>
            <Text style={styles.mainTitle}>Manuale Operativo: Scanner Biglietti</Text>
            <Text style={styles.subTitle}>Istruzioni, logica di validazione e ricerca per volontari e operatori all&apos;ingresso</Text>
          </View>
          <View style={styles.badgeVersion}>
            <Text style={styles.badgeVersionText}>REV. 2026.1</Text>
            <Text style={[styles.badgeVersionText, { fontSize: 6.5, marginTop: 1 }]}>PORTALE WEB</Text>
          </View>
        </View>

        {/* 1. Accesso & Preparazione */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>1</Text>
            <Text style={styles.sectionTitle}>Accesso & Dispositivi Consigliati</Text>
          </View>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🌐 Indirizzo di Accesso Diretto</Text>
                <Text style={styles.cardText}>
                  Apri il browser su: <Text style={{ fontFamily: 'Helvetica-Bold', color: colors.primary }}>https://www.prolocogasperina.it/admin/scanner</Text>
                </Text>
                <Text style={[styles.cardText, { marginTop: 3 }]}>
                  Funziona su qualsiasi dispositivo collegato a Internet (Wi-Fi Pro Loco o Hotspot 4G/5G): smartphone Android, iPhone, tablet iPad o PC portatile.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚙️ Configurazione Postazione</Text>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>Volume Audio Attivo:</Text> Mantieni il volume del dispositivo alto per sentire il bip di conferma o errore.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>Focus Automatico:</Text> Il campo di scansione riprende il focus da solo ad ogni click.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Le 3 Modalità di Acquisizione */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>2</Text>
            <Text style={styles.sectionTitle}>Le 3 Modalità di Acquisizione del Biglietto</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>A. Lettore Barcode / QR fisico (Consigliato per varchi rapidi)</Text>
            <Text style={styles.cardText}>
              Collega la pistola barcode/QR via cavo USB o Bluetooth al PC/Tablet. Punta il raggio sul QR code stampato o mostrato sullo schermo dello smartphone del cliente. La lettura e la convalida avvengono all&apos;istante in frazioni di secondo.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>B. Fotocamera integrata (Smartphone e Tablet)</Text>
            <Text style={styles.cardText}>
              Tocca il tasto azzurro <Text style={{ fontFamily: 'Helvetica-Bold' }}>Fotocamera</Text> in alto a destra nella schermata. Inquadra il QR code con la camera. Appena intercettato, il sistema valida il biglietto e chiude automaticamente l&apos;anteprima video per la lettura successiva.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[styles.cardTitle, { color: colors.success }]}>C. Ricerca per Numero Ordine o per Nome Ordinante (NOVITÀ)</Text>
            <Text style={styles.cardText}>
              Se il visitatore non trova l&apos;email o ha il telefono scarico, puoi cercarlo manualmente nel campo di input:
            </Text>
            <View style={{ marginTop: 4 }}>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>1.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Per Nome e Cognome:</Text> Digita il cognome o nome dell&apos;ordinante (es. <Text style={{ fontFamily: 'Helvetica-Bold' }}>Mario Rossi</Text> o solo <Text style={{ fontFamily: 'Helvetica-Bold' }}>Rossi</Text>) e premi Cerca.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>2.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Per Numero Ordine:</Text> Digita il codice ordine visibile sulla ricevuta (es. <Text style={{ fontFamily: 'Helvetica-Bold' }}>#4B7E8D32</Text> o senza cancelletto).
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>3.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Gestione Omonimi:</Text> Se più persone corrispondono al cognome digitato, lo scanner mostra l&apos;elenco con dettagli (data, biglietti, email) e il pulsante azzurro <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Seleziona Ordine&quot;</Text>.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Logica degli Stati e Colori */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>3</Text>
            <Text style={styles.sectionTitle}>Logica di Convalida: Significato dei Colori & Azioni</Text>
          </View>

          {/* Verde */}
          <View style={[styles.statusBox, styles.statusSuccess]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusBadge, { color: colors.success }]}>🟢 VERDE • BIGLIETTO VALIDO (CHECK-IN EFFETTUATO)</Text>
              <Text style={[styles.statusAction, { color: colors.success }]}>SUONO: Bip acuto • FAI ENTRARE</Text>
            </View>
            <Text style={styles.statusDesc}>
              Il biglietto appartiene a un ordine regolarmente pagato ed entra per la prima volta. Il sistema registra data e ora esatta del passaggio e incrementa il contatore degli ingressi in tempo reale.
            </Text>
          </View>

          {/* Blu */}
          <View style={[styles.statusBox, styles.statusFound]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusBadge, { color: colors.info }]}>🔵 BLU • ORDINE TROVATO (GESTIONE GRUPPI & FAMIGLIE)</Text>
              <Text style={[styles.statusAction, { color: colors.info }]}>ATTESA CONFERMA VOLONTARIO</Text>
            </View>
            <Text style={styles.statusDesc}>
              Compare quando cerchi per Nominativo/N° Ordine, oppure se l&apos;ordine contiene più ingressi. Mostra il riepilogo grafico (Adulti, Bambini, You-Pick Lab, Attività) e permette di cliccare <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Valida tutti i rimanenti&quot;</Text> se il gruppo entra insieme, o <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Valida&quot;</Text> sui singoli componenti.
            </Text>
          </View>

          {/* Giallo */}
          <View style={[styles.statusBox, styles.statusWarning]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusBadge, { color: colors.warning }]}>🟠 GIALLO • GIÀ UTILIZZATO (ALLERTA DOPPIO INGRESSO)</Text>
              <Text style={[styles.statusAction, { color: colors.warning }]}>SUONO: Bip grave • STOP</Text>
            </View>
            <Text style={styles.statusDesc}>
              Il biglietto o tutti i biglietti dell&apos;ordine sono già stati convalidati in precedenza. Lo scanner riporta l&apos;orario esatto del primo accesso (es. &quot;Validato alle 16:42&quot;) per smascherare screenshot duplicati o copie inoltrate.
            </Text>
          </View>

          {/* Rosso */}
          <View style={[styles.statusBox, styles.statusDanger]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusBadge, { color: colors.danger }]}>🔴 ROSSO • NON VALIDO / ERRORE</Text>
              <Text style={[styles.statusAction, { color: colors.danger }]}>SUONO: Bip d&apos;errore • NON FAR ENTRARE</Text>
            </View>
            <Text style={styles.statusDesc}>
              QR code non riconosciuto, ordine respinto da Nexi/Banca, o connessione internet interrotta. Chiedi al cliente la ricevuta ufficiale o invialo al punto informazioni.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pro Loco Gasperina APS • Via Regina Margherita, Gasperina (CZ) • info@prolocogasperina.it</Text>
          <Text style={styles.footerText}>Pagina 1 di 2</Text>
        </View>
      </Page>

      {/* ── PAGINA 2: SERVIZI EXTRA, BADGE E TROUBLESHOOTING ── */}
      <Page size="A4" style={styles.page}>
        {/* Header compatto */}
        <View style={[styles.header, { padding: '8 14', marginBottom: 10 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.orgTitle}>PRO LOCO GASPERINA APS • SERVIZI & RISOLUZIONE PROBLEMI</Text>
            <Text style={[styles.mainTitle, { fontSize: 13 }]}>Scanner Biglietti: Servizi Extra & Procedure Speciali</Text>
          </View>
          <Text style={[styles.badgeVersionText, { fontSize: 8 }]}>PAGINA 2/2</Text>
        </View>

        {/* 4. Lettura Badge Smart & Attività */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>4</Text>
            <Text style={styles.sectionTitle}>Interpretazione dei Badge Smart a Schermo</Text>
          </View>
          <Text style={[styles.cardText, { marginBottom: 5 }]}>
            Quando viene visualizzato un ordine, lo scanner decodifica automaticamente le note di prenotazione in comodi riquadri colorati per gli operatori di varco:
          </Text>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#3b82f6' }]}>
                <Text style={styles.cardTitle}>👨 Adulti &amp; 🧒 Bambini</Text>
                <Text style={styles.cardText}>
                  Indica con cifre grandi il numero esatto di adulti paganti e di bambini dichiarati per verificare a colpo d&apos;occhio la composizione del nucleo familiare.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }]}>
                <Text style={styles.cardTitle}>🎃 You-Pick Lab &amp; Attività</Text>
                <Text style={styles.cardText}>
                  Evidenzia se l&apos;ordine comprende la zucca da intaglio (Laboratorio You-Pick) o attività specifiche (Truccabimbi, Caccia al Tesoro), facilitando la consegna dei braccialetti/talloncini.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Aggiunta Servizi Extra sul Posto */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>5</Text>
            <Text style={styles.sectionTitle}>Aggiunta Servizi Extra &amp; Integrazioni sul Posto</Text>
          </View>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              Cosa fare se un visitatore si presenta con un ospite in più o desidera acquistare un laboratorio direttamente al varco?
            </Text>
          </View>
          <View style={styles.card}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>1.</Text>
              <Text style={styles.bulletText}>
                Dopo aver trovato l&apos;ordine, tocca il pulsante dorato <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;+ Aggiungi Servizi Extra (Pagamento in loco)&quot;</Text>.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>2.</Text>
              <Text style={styles.bulletText}>
                Scegli uno dei tag rapidi preimpostati (<Text style={{ fontFamily: 'Helvetica-Bold' }}>+1 Adulto</Text>, <Text style={{ fontFamily: 'Helvetica-Bold' }}>+1 Bambino</Text>, <Text style={{ fontFamily: 'Helvetica-Bold' }}>+1 You-Pick Lab</Text>, <Text style={{ fontFamily: 'Helvetica-Bold' }}>+1 Truccabimbi</Text>) oppure scrivi la descrizione personalizzata.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>3.</Text>
              <Text style={styles.bulletText}>
                Verifica o modifica l&apos;importo in Euro da incassare.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>4.</Text>
              <Text style={styles.bulletText}>
                Seleziona il metodo di riscossione: <Text style={{ fontFamily: 'Helvetica-Bold' }}>CONTANTI</Text> o <Text style={{ fontFamily: 'Helvetica-Bold' }}>POS / CARTA</Text> e premi <Text style={{ fontFamily: 'Helvetica-Bold' }}>Conferma &amp; Salva</Text>.
              </Text>
            </View>
            <Text style={[styles.cardText, { marginTop: 4, fontStyle: 'italic', color: colors.textMuted }]}>
              L&apos;importo viene aggiunto alla scheda contabile dell&apos;ordine per la quadratura finale del rendiconto festa.
            </Text>
          </View>
        </View>

        {/* 6. Annullamento Validazione (Ripristino) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>6</Text>
            <Text style={styles.sectionTitle}>Annullamento di una Convalida Errata</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Se convalidi un biglietto ma la persona deve uscire momentaneamente per aspettare amici o se hai scansionato per errore il biglietto sbagliato:
            </Text>
            <View style={[styles.bulletItem, { marginTop: 3 }]}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                Accanto al biglietto con stato verde <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;ENTRATO&quot;</Text>, premi la piccola icona rossa con la freccia di ripristino.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                Il biglietto tornerà immediatamente allo stato <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;DA VALIDARE&quot;</Text> e il conteggio generale degli ingressi verrà scalato di 1.
              </Text>
            </View>
          </View>
        </View>

        {/* 7. Risoluzione Problemi Rapida (FAQ Volontari) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>7</Text>
            <Text style={styles.sectionTitle}>Risoluzione dei Problemi più Comuni (FAQ)</Text>
          </View>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={[styles.card, { borderColor: colors.warningBorder }]}>
                <Text style={[styles.cardTitle, { color: colors.warning }]}>⚠️ Schermo con barra rossa &quot;Offline&quot;</Text>
                <Text style={styles.cardText}>
                  La connessione a internet è caduta. Verifica che il dispositivo sia connesso alla rete Wi-Fi dedicata allo staff o attiva l&apos;Hotspot 4G/5G sul telefono. Appena torna la linea la barra rossa scompare da sola.
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📱 Schermo del cliente troppo scuro o graffiato</Text>
                <Text style={styles.cardText}>
                  Chiedi al visitatore di alzare la luminosità dello smartphone al massimo. Se il vetro è rotto e il lettore non legge, digita il cognome nel campo di ricerca manuale.
                </Text>
              </View>
            </View>

            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔍 Il lettore laser non invia il codice</Text>
                <Text style={styles.cardText}>
                  Fai un tocco sullo schermo nel rettangolo bianco per riattivare il cursore di testo. Assicurati che il cavo USB sia inserito saldamente nella porta del computer o tablet.
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 Dove controllare gli ingressi totali?</Text>
                <Text style={styles.cardText}>
                  Nella parte alta dello schermo è sempre presente il riquadro: <Text style={{ fontFamily: 'Helvetica-Bold' }}>Ingressi (Entrati / Totale Biglietti)</Text> e il conteggio dei visitatori attesi rimanenti.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Supporto Tecnico Pro Loco Gasperina • In caso di anomalie contattare il referente tecnico di turno</Text>
          <Text style={styles.footerText}>Pagina 2 di 2</Text>
        </View>
      </Page>
    </Document>
  );
}
