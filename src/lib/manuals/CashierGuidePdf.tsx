import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const colors = {
  primary: '#0f766e', // Teal / Dark Emerald
  primaryLight: '#f0fdfa',
  primaryBorder: '#99f6e4',
  accent: '#d97706', // Amber
  accentLight: '#fffbeb',
  accentBorder: '#fde68a',
  blue: '#1d4ed8',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',
  success: '#059669',
  successLight: '#ecfdf5',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
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
    color: '#99f6e4',
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
  grid3: {
    flexDirection: 'row',
    gap: 6,
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
  // Pay cards
  payBox: {
    borderRadius: 5,
    padding: '6 8',
    marginBottom: 5,
    borderWidth: 1,
  },
  payCash: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  payPos: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  payGift: {
    backgroundColor: '#fdf4ff',
    borderColor: '#f5d0fe',
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
    backgroundColor: colors.primaryLight,
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

export function CashierGuideDocument() {
  return (
    <Document title="Manuale Cassa e Comande - Pro Loco Gasperina" author="Pro Loco Gasperina APS">
      {/* ── PAGINA 1: ACCESSO, CARRELLO E PAGAMENTI ── */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.orgTitle}>PRO LOCO GASPERINA APS • STAND GASTRONOMICI &amp; CASSA</Text>
            <Text style={styles.mainTitle}>Manuale Operativo: Punto Cassa &amp; POS</Text>
            <Text style={styles.subTitle}>Guida completa per la gestione ordini, pagamenti e stampa comande durante gli eventi</Text>
          </View>
          <View style={styles.badgeVersion}>
            <Text style={styles.badgeVersionText}>REV. 2026.1</Text>
            <Text style={[styles.badgeVersionText, { fontSize: 6.5, marginTop: 1 }]}>CASSA &amp; STAND</Text>
          </View>
        </View>

        {/* 1. Accesso & Apertura Turno */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>1</Text>
            <Text style={styles.sectionTitle}>Accesso &amp; Apertura Postazione Cassa</Text>
          </View>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🌐 Indirizzo di Accesso</Text>
                <Text style={styles.cardText}>
                  Apri il browser su: <Text style={{ fontFamily: 'Helvetica-Bold', color: colors.primary }}>https://www.prolocogasperina.it/cashier</Text>
                </Text>
                <Text style={[styles.cardText, { marginTop: 3 }]}>
                  Ottimizzato per Tablet (iPad/Android), Touchscreen, Smartphone o PC. Tocca l&apos;icona a quattro frecce per la modalità a schermo intero.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔐 Schermata di Login Cassa</Text>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>1.</Text>
                  <Text style={styles.bulletText}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>Postazione:</Text> Seleziona la cassa (es. <Text style={{ fontFamily: 'Helvetica-Bold' }}>Cassa 1, Cassa 2, Cassa Bar</Text>).
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>2.</Text>
                  <Text style={styles.bulletText}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIN Evento:</Text> Inserisci il codice comunicato dal direttivo.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>3.</Text>
                  <Text style={styles.bulletText}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>Operatore:</Text> Digita il tuo nome per associare il turno.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Composizione dell'Ordine & Menù */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>2</Text>
            <Text style={styles.sectionTitle}>Composizione del Carrello &amp; Selezione Prodotti</Text>
          </View>

          <View style={styles.grid3}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏷️ Categorie Rapide</Text>
                <Text style={styles.cardText}>
                  Usa i filtri orizzontali in alto (<Text style={{ fontFamily: 'Helvetica-Bold' }}>Tutti, Primi, Panini, Dolci, Bibite</Text>) per isolare al volo le pietanze desiderate.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>➕ Aggiunta con 1 Tocco</Text>
                <Text style={styles.cardText}>
                  Tocca la scheda del piatto per aggiungere 1 porzione. Tocca ripetutamente per incrementare velocemente la quantità.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📦 Stock &amp; Esaurito</Text>
                <Text style={styles.cardText}>
                  I piatti terminati mostrano la dicitura rossa &quot;Esaurito&quot; e non possono essere selezionati, prevenendo ordini non evadibili dalla cucina.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { marginTop: 4 }]}>
            <Text style={styles.cardTitle}>🛒 Gestione del Carrello (Colonna Destra)</Text>
            <Text style={styles.cardText}>
              Nel pannello di destra trovi l&apos;elenco degli articoli scelti: usa i tasti <Text style={{ fontFamily: 'Helvetica-Bold' }}>[ + ]</Text> e <Text style={{ fontFamily: 'Helvetica-Bold' }}>[ - ]</Text> per modificare le dosi, l&apos;icona del cestino per rimuovere un singolo piatto, o <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Svuota&quot;</Text> per azzerare l&apos;intero ordine.
            </Text>
          </View>
        </View>

        {/* 3. Modalità di Pagamento & Chiusura */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>3</Text>
            <Text style={styles.sectionTitle}>Modalità di Pagamento &amp; Calcolo Resto</Text>
          </View>

          {/* Contanti */}
          <View style={[styles.payBox, styles.payCash]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: colors.success }}>💵 1. CONTANTI (CON CALCOLO RESTO AUTOMATICO)</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: colors.success }}>NESSUN ERRORE SUL RESTO</Text>
            </View>
            <Text style={styles.cardText}>
              Seleziona <Text style={{ fontFamily: 'Helvetica-Bold' }}>CONTANTI</Text>. Inserisci la somma consegnata dal cliente oppure tocca i tagli rapidi (€5, €10, €20, €50). Il sistema calcola ed evidenzia a caratteri giganti il <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESTO DA RENDERE</Text>. Premi <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Conferma Ordine&quot;</Text>.
            </Text>
          </View>

          {/* POS */}
          <View style={[styles.payBox, styles.payPos]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: colors.blue }}>💳 2. POS / CARTE BANCARIE (BANCOMAT / CONTACLESS)</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: colors.blue }}>TRANSAZIONE ELETTRONICA</Text>
            </View>
            <Text style={styles.cardText}>
              Seleziona <Text style={{ fontFamily: 'Helvetica-Bold' }}>POS</Text>. Digita l&apos;importo esatto sul terminale POS bancario / SumUp / Nexi e fai avvicinare la carta o lo smartphone al cliente. <Text style={{ fontFamily: 'Helvetica-Bold' }}>Solo dopo</Text> che il terminale POS emette lo scontrino di transazione approvata, premi sul tablet <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Conferma Ordine&quot;</Text>.
            </Text>
          </View>

          {/* Omaggio */}
          <View style={[styles.payBox, styles.payGift]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#9333ea' }}>🎁 3. OMAGGIO (OSPITI, SPONSOR &amp; VOLONTARI)</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#9333ea' }}>NOTA OBBLIGATORIA</Text>
            </View>
            <Text style={styles.cardText}>
              Riservato ai casi autorizzati dal Direttivo. Seleziona <Text style={{ fontFamily: 'Helvetica-Bold' }}>OMAGGIO</Text> e inserisci obbligatoriamente il beneficiario nella casella di testo (es. <Text style={{ fontStyle: 'italic' }}>&quot;Staff Service Audio&quot;</Text> o <Text style={{ fontStyle: 'italic' }}>&quot;Ospiti d&apos;onore&quot;</Text>) per la trasparenza contabile.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pro Loco Gasperina APS • Modulo Cassa &amp; Comande • info@prolocogasperina.it</Text>
          <Text style={styles.footerText}>Pagina 1 di 2</Text>
        </View>
      </Page>

      {/* ── PAGINA 2: STAMPANTE, STORICO E CHIUSURA CASSA ── */}
      <Page size="A4" style={styles.page}>
        {/* Header compatto */}
        <View style={[styles.header, { padding: '8 14', marginBottom: 10 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.orgTitle}>PRO LOCO GASPERINA APS • STAMPA, STORICO &amp; CHIUSURA</Text>
            <Text style={[styles.mainTitle, { fontSize: 13 }]}>Punto Cassa: Stampante Bluetooth &amp; Quadratura Turno</Text>
          </View>
          <Text style={[styles.badgeVersionText, { fontSize: 8 }]}>PAGINA 2/2</Text>
        </View>

        {/* 4. Stampante Termica & Talloncini Reparto */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>4</Text>
            <Text style={styles.sectionTitle}>Stampante Termica Bluetooth &amp; Comande Reparti</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🖨️ Connessione Stampante Termica Bluetooth (58mm / 80mm)</Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>1.</Text>
              <Text style={styles.bulletText}>
                Accendi la stampante termica portatile e attiva il Bluetooth sul tablet/telefono.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>2.</Text>
              <Text style={styles.bulletText}>
                Tocca l&apos;icona <Text style={{ fontFamily: 'Helvetica-Bold' }}>Bluetooth</Text> nella barra superiore della cassa e seleziona il dispositivo (es. <Text style={{ fontStyle: 'italic' }}>POS-58, MTP-II o RPP02N</Text>).
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>3.</Text>
              <Text style={styles.bulletText}>
                L&apos;icona diventerà verde con la scritta <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Connessa&quot;</Text>. Puoi stampare un ticket di prova per verificare l&apos;allineamento.
              </Text>
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
                <Text style={styles.cardTitle}>🧾 Scontrino Cliente (con QR)</Text>
                <Text style={styles.cardText}>
                  Riepiloga i prodotti acquistati, importo totale, numero progressivo d&apos;ordine e codice QR per consultare la ricevuta digitale su smartphone.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
                <Text style={styles.cardTitle}>🎫 Talloncini Comanda Reparti</Text>
                <Text style={styles.cardText}>
                  Il sistema stampa talloncini separati per stand: il cliente consegna il talloncino <Text style={{ fontFamily: 'Helvetica-Bold' }}>Panini</Text> alla griglia e il talloncino <Text style={{ fontFamily: 'Helvetica-Bold' }}>Bevande</Text> al bar!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Storico Ordini, Ristampe & Storni */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>5</Text>
            <Text style={styles.sectionTitle}>Storico Ordini, Ristampe &amp; Annullamenti (Storni)</Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔄 Ristampa Scontrino Smarrito</Text>
                <Text style={styles.cardText}>
                  Se la carta finisce durante la stampa o il cliente perde lo scontrino: tocca il tasto <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Storico&quot;</Text> in alto, individua il numero d&apos;ordine e clicca sull&apos;icona stampante per rigenerare immediatamente tutti i talloncini.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={[styles.card, { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.cardTitle, { color: colors.danger }]}>🚫 Annullamento Ordine (Storno)</Text>
                <Text style={styles.cardText}>
                  Se un cliente cambia idea subito dopo la battuta, apri l&apos;ordine dallo Storico e tocca <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Storna Ordine&quot;</Text>. L&apos;ordine viene contrassegnato come annullato e l&apos;importo viene stornato dal fondo cassa.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6. Chiusura Cassa & Quadratura Fondo Contanti */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>6</Text>
            <Text style={styles.sectionTitle}>Chiusura Cassa &amp; Quadratura Fine Serata</Text>
          </View>

          <View style={[styles.card, { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' }]}>
            <Text style={[styles.cardTitle, { color: colors.primary }]}>📊 Procedura di Chiusura Turno</Text>
            <Text style={styles.cardText}>
              A fine turno o a chiusura manifestazione, tocca l&apos;icona con il grafico <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Statistiche / Chiusura Cassa&quot;</Text>:
            </Text>
            <View style={{ marginTop: 4 }}>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>1.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Totale Incassato Cassa:</Text> Verifica il totale complessivo battuto dalla tua postazione.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>2.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Quadratura Contanti:</Text> Conta i soldi fisici nel cassetto (escludendo il fondo cassa iniziale). Il valore deve corrispondere esattamente alla voce <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Incasso Contanti&quot;</Text>.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>3.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Totale Transazioni POS:</Text> Fai la chiusura giornaliera sul POS bancario e confronta il totale con la voce <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Incasso POS&quot;</Text>.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletDot}>4.</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Report Piatti:</Text> Consulta la tabella dei pezzi venduti per comunicare alla cucina i consumi esatti della serata.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7. Regole & Buone Prassi */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionNumber}>7</Text>
            <Text style={styles.sectionTitle}>Regole di Condotta &amp; Sicurezza in Cassa</Text>
          </View>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔒 Non lasciare la cassa incustodita</Text>
                <Text style={styles.cardText}>
                  In caso di pausa o cambio turno, premi il tasto rosso <Text style={{ fontFamily: 'Helvetica-Bold' }}>&quot;Esci&quot;</Text> per bloccare la schermata e consegna il cassetto al responsabile.
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🧾 Cambio Rotolo Carta Termica</Text>
                <Text style={styles.cardText}>
                  Tieni sempre 1 rotolo di scorta accanto alla stampante. Se compare la riga rosa sul bordo della carta, sostituisci il rotolo prima che si esaurisca durante una comanda.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Supporto Tecnico Pro Loco Gasperina • In caso di anomalie contattare il responsabile cassa</Text>
          <Text style={styles.footerText}>Pagina 2 di 2</Text>
        </View>
      </Page>
    </Document>
  );
}
