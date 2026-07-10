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
    padding: '40 40 30 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '4 solid #E8C042'
  },
  headerLeft: { flexDirection: 'column' },
  eventTitle: {
    color: palette.white,
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.5,
  },
  eventSubtitle: {
    color: palette.gold,
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoText: {
    color: palette.gold,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    letterSpacing: 1,
  },
  logoImage: {
    height: 70, // Fatto più grande
    objectFit: 'contain',
  },
  body: {
    padding: '25 40',
    flexDirection: 'column',
    gap: 15,
  },
  ticketCard: {
    backgroundColor: palette.white,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 8, // Margini ridotti per farne stare di più
    border: `1 solid #e5ddd4`,
  },
  ticketStripe: {
    width: 6,
    backgroundColor: palette.primary,
  },
  ticketContent: {
    flex: 1,
    padding: '12 16',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLeft: { flexDirection: 'column', flex: 1 },
  ticketLabel: {
    fontSize: 8,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 16,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  ticketMeta: {
    fontSize: 9,
    color: palette.muted,
    marginBottom: 2,
  },
  ticketPrice: {
    fontSize: 14,
    color: palette.primary,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    padding: '5 10',
    borderLeft: `1 dashed #e5ddd4`,
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 10,
  },
  qrImage: {
    width: 65,
    height: 65,
  },
  qrId: {
    fontSize: 6,
    color: palette.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  buyerSection: {
    backgroundColor: palette.white,
    borderRadius: 8,
    padding: '12 16',
    border: `1 solid #e5ddd4`,
    marginBottom: 10,
  },
  buyerTitle: {
    fontSize: 8,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  buyerRow: {
    flexDirection: 'row',
    gap: 30,
  },
  buyerField: { flexDirection: 'column' },
  buyerFieldLabel: {
    fontSize: 8,
    color: palette.muted,
    marginBottom: 2,
  },
  buyerFieldValue: {
    fontSize: 11,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
  },
  infoBox: {
    backgroundColor: '#fff4e5',
    borderRadius: 8,
    padding: '12 16',
    border: `1 solid #ffd8a8`,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  infoText: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.5,
    flex: 1,
  },
  footer: {
    backgroundColor: palette.dark,
    padding: '16 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    fontSize: 9,
    color: palette.muted,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  cutLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  cutLine: {
    flex: 1,
    borderBottom: '1 dashed #ccc',
  },
  cutText: {
    fontSize: 7,
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
              <Image src={proLocoLogoBase64} style={{ height: 60, objectFit: 'contain' }} />
            ) : (
              <Text style={styles.logoText}>PRO LOCO{'\n'}GASPERINA</Text>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>

          {/* Order reference */}
          <Text style={styles.orderId}>
            Ricevuta Prenotazione: #{orderRef} · Emessa il {paidDate}
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
                    <Text style={styles.ticketLabel}>Ricevuta {index + 1} di {order.tickets.length}</Text>
                    <Text style={styles.ticketType}>{ticket.type}</Text>
                    <Text style={{ fontSize: 9, color: palette.primary, marginBottom: 6, fontFamily: 'Helvetica-Bold' }}>Data: 10 Agosto 2026 - Ritiro dalle ore 19:00</Text>
                    <Text style={styles.ticketMeta}>ID: {ticket.id.substring(0, 16).toUpperCase()}</Text>
                    <Text style={styles.ticketPrice}>€{ticket.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.qrContainer}>
                    {qrDataUris[ticket.id] && (
                      <Image src={qrDataUris[ticket.id]} style={styles.qrImage} />
                    )}
                    <Text style={styles.qrId}>Scansiona in cassa</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Info box */}
          <View style={styles.infoBox} wrap={false}>
            <Text style={styles.infoText}>
              ⚠ ATTENZIONE: Questo documento non è il biglietto finale. 
              Presenta questo documento al botteghino il giorno dell&apos;evento
              per ritirare i tuoi biglietti fisici. La ricevuta è strettamente personale e non cedibile.
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
