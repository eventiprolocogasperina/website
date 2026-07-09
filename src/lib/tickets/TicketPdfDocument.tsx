import QRCode from 'qrcode';
import {
  Document, Page, Text, View, Image, StyleSheet, Font
} from '@react-pdf/renderer';
import type { OrderWithTickets } from '@/lib/data/tickets';

// Register an elegant italic/serif for the title
Font.register({
  family: 'Georgia',
  src: 'https://fonts.gstatic.com/s/georgia/v14/uU9eCBsR6Z2vfE9aq3bpd3Y.woff2',
});

const palette = {
  primary: '#283983',
  dark: '#1a1a1a',
  gold: '#E8C042',
  light: '#F9F3E4',
  muted: '#6b6b6b',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.light,
    padding: 0,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: palette.primary,
    padding: '30 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'column' },
  eventTitle: {
    color: palette.white,
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  eventSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  logoText: {
    color: palette.gold,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    letterSpacing: 1,
  },
  body: {
    padding: '30 40',
    flexDirection: 'column',
    gap: 20,
  },
  ticketCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 16,
    border: `1 solid #e5ddd4`,
  },
  ticketStripe: {
    width: 8,
    backgroundColor: palette.primary,
  },
  ticketContent: {
    flex: 1,
    padding: '20 24',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLeft: { flexDirection: 'column', flex: 1 },
  ticketLabel: {
    fontSize: 9,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 18,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  ticketMeta: {
    fontSize: 10,
    color: palette.muted,
    marginBottom: 2,
  },
  ticketPrice: {
    fontSize: 20,
    color: palette.primary,
    fontFamily: 'Helvetica-Bold',
  },
  qrContainer: {
    alignItems: 'center',
    padding: '10 16 10 24',
    borderLeft: `1 dashed #ccc`,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrId: {
    fontSize: 7,
    color: palette.muted,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buyerSection: {
    backgroundColor: palette.white,
    borderRadius: 8,
    padding: '16 20',
    border: `1 solid #e5ddd4`,
    marginBottom: 16,
  },
  buyerTitle: {
    fontSize: 9,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  buyerRow: {
    flexDirection: 'row',
    gap: 40,
  },
  buyerField: { flexDirection: 'column' },
  buyerFieldLabel: {
    fontSize: 8,
    color: palette.muted,
    marginBottom: 3,
  },
  buyerFieldValue: {
    fontSize: 11,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
  },
  infoBox: {
    backgroundColor: '#fef9f0',
    borderRadius: 8,
    padding: '14 20',
    border: `1 solid #e8d9b8`,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    fontSize: 8,
    color: '#7a6040',
    lineHeight: 1.5,
    flex: 1,
  },
  footer: {
    backgroundColor: palette.dark,
    padding: '16 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
  },
  footerBrand: {
    color: palette.gold,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  orderId: {
    fontSize: 8,
    color: palette.muted,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  cutLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  cutLine: {
    flex: 1,
    borderBottom: '1 dashed #ccc',
  },
  cutText: {
    fontSize: 8,
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuBox: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: '20',
    border: `1 solid #e5ddd4`,
    marginBottom: 16,
    minHeight: 120,
  },
  menuTitle: {
    fontSize: 12,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuContent: {
    fontSize: 9,
    color: palette.muted,
    lineHeight: 1.6,
  },
  logoImage: {
    height: 40,
    objectFit: 'contain',
  }
});

/**
 * Generate a base64 PNG data URI for a QR code string.
 */
export async function generateQrDataUri(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 200,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });
}

interface TicketPdfProps {
  order: OrderWithTickets;
  qrDataUris: Record<string, string>; // ticketId -> data URI
  eventLogoBase64?: string;
  proLocoLogoBase64?: string;
}

export function TicketPdfDocument({ order, qrDataUris, eventLogoBase64, proLocoLogoBase64 }: TicketPdfProps) {
  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const paidDate = order.paidAt
    ? new Date(order.paidAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document
      title={`Biglietti Assaggia & Passeggia - Ord. ${orderRef}`}
      author="Pro Loco Gasperina"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {eventLogoBase64 ? (
              <Image src={eventLogoBase64} style={styles.logoImage} />
            ) : (
              <>
                <Text style={styles.eventTitle}>Assaggia &amp; Passeggia</Text>
                <Text style={styles.eventSubtitle}>Pro Loco Gasperina · Gasperina (CZ)</Text>
              </>
            )}
          </View>
          <View>
            {proLocoLogoBase64 ? (
              <Image src={proLocoLogoBase64} style={{ height: 45, objectFit: 'contain' }} />
            ) : (
              <Text style={styles.logoText}>PRO LOCO{'\n'}GASPERINA</Text>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>

          {/* Order reference */}
          <Text style={styles.orderId}>
            Riferimento ordine: #{orderRef} · Acquistato il {paidDate}
          </Text>

          {/* Buyer info */}
          <View style={styles.buyerSection}>
            <Text style={styles.buyerTitle}>Dati acquirente</Text>
            <View style={styles.buyerRow}>
              <View style={styles.buyerField}>
                <Text style={styles.buyerFieldLabel}>Nome e Cognome</Text>
                <Text style={styles.buyerFieldValue}>{order.buyerName}</Text>
              </View>
              <View style={styles.buyerField}>
                <Text style={styles.buyerFieldLabel}>Email</Text>
                <Text style={styles.buyerFieldValue}>{order.buyerEmail}</Text>
              </View>
              <View style={styles.buyerField}>
                <Text style={styles.buyerFieldLabel}>N° Biglietti</Text>
                <Text style={styles.buyerFieldValue}>{order.tickets.length}</Text>
              </View>
            </View>
          </View>

          {/* Individual tickets */}
          {order.tickets.map((ticket, index) => (
            <View key={ticket.id} wrap={false}>
              <View style={styles.cutLineContainer}>
                <View style={styles.cutLine} />
                <Text style={styles.cutText}>✂ Taglia qui</Text>
                <View style={styles.cutLine} />
              </View>

              <View style={styles.ticketCard}>
                <View style={styles.ticketStripe} />
                <View style={styles.ticketContent}>
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketLabel}>Biglietto {index + 1} di {order.tickets.length}</Text>
                    <Text style={styles.ticketType}>{ticket.type}</Text>
                    <Text style={{ fontSize: 9, color: palette.primary, marginBottom: 8, fontFamily: 'Helvetica-Bold' }}>Data: 10 Agosto 2026 - Inizio percorso ore 19:00</Text>
                    <Text style={styles.ticketMeta}>ID: {ticket.id.substring(0, 16).toUpperCase()}</Text>
                    <Text style={styles.ticketPrice}>€{ticket.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.qrContainer}>
                    {qrDataUris[ticket.id] && (
                      <Image src={qrDataUris[ticket.id]} style={styles.qrImage} />
                    )}
                    <Text style={styles.qrId}>Scansiona all&apos;ingresso</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.menuBox} wrap={false}>
            <Text style={styles.menuTitle}>Menù / Timbri Tappe</Text>
            <Text style={styles.menuContent}>
              Usa questo spazio per prendere nota dei piatti assaggiati, dei tuoi vini preferiti o per raccogliere i timbri delle varie tappe del percorso enogastronomico.
            </Text>
          </View>

          {/* Info box */}
          <View style={styles.infoBox} wrap={false}>
            <Text style={styles.infoText}>
              ⚠ Questo biglietto è personale e non cedibile. Presentare il QR code all&apos;ingresso per la verifica.
              Il biglietto è valido solo se integro e leggibile. L'acquirente dichiara di non avere intolleranze alimentari 
              e si assume ogni responsabilità legata alla consumazione dei prodotti offerti lungo il percorso. 
              In caso di maltempo l'evento potrà subire variazioni; nessun rimborso è previsto per mancata partecipazione.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>prolocogasperina.it · info@prolocogasperina.it</Text>
          <Text style={styles.footerBrand}>PRO LOCO GASPERINA</Text>
        </View>
      </Page>
    </Document>
  );
}
