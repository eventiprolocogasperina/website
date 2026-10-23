import QRCode from 'qrcode';
import {
  Document, Page, Text, View, Image, StyleSheet, Font
} from '@react-pdf/renderer';
import { type OrderWithTickets, parseOrderNotes } from '@/lib/data/tickets';

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
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    marginRight: 16,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
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
    height: 70,
    maxWidth: 260,
    objectFit: 'contain',
  },
  proLocoLogoImage: {
    height: 60,
    maxWidth: 140,
    objectFit: 'contain',
  },
  body: {
    padding: '24 40 60 40',
    flexDirection: 'column',
    gap: 12,
  },
  ticketCard: {
    backgroundColor: palette.white,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 8,
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
  ticketLeft: {
    flexDirection: 'column',
    flex: 1,
    paddingRight: 14,
  },
  ticketLabel: {
    fontSize: 8,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 15,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  ticketMeta: {
    fontSize: 8.5,
    color: palette.muted,
    marginBottom: 2,
  },
  ticketPrice: {
    fontSize: 13,
    color: palette.primary,
    fontFamily: 'Helvetica-Bold',
    marginTop: 3,
  },
  qrContainer: {
    alignItems: 'center',
    padding: '4 8',
    borderLeft: `1 dashed #e5ddd4`,
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 10,
    width: 80,
  },
  qrImage: {
    width: 64,
    height: 64,
  },
  qrId: {
    fontSize: 6.5,
    color: palette.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  buyerSection: {
    backgroundColor: palette.white,
    borderRadius: 8,
    padding: '14 16',
    border: `1 solid #e5ddd4`,
    marginBottom: 6,
  },
  buyerTitle: {
    fontSize: 8,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  buyerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  buyerCol: {
    width: '48%',
    flexDirection: 'column',
  },
  buyerFieldLabel: {
    fontSize: 7.5,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  buyerFieldValue: {
    fontSize: 10.5,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
  },
  infoBox: {
    backgroundColor: '#fff4e5',
    borderRadius: 8,
    padding: '10 14',
    border: `1 solid #ffd8a8`,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 8.5,
    color: '#92400e',
    lineHeight: 1.45,
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
    fontSize: 8.5,
    color: palette.muted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  cutLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  cutLine: {
    flex: 1,
    borderBottom: '1 dashed #d1c7bc',
  },
  cutText: {
    fontSize: 7,
    color: '#9ca3af',
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

  const isZuccaland = order.tickets.some(t => t.eventId?.includes('zuccaland'));
  const parsedNotes = parseOrderNotes(order.notes);

  const admissionTickets = order.tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio'));
  const extraTickets = order.tickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio'));
  const admissionCount = admissionTickets.length;
  const youPickCount = extraTickets.length;

  // Zuccaland overrides for palette
  const headerBg = isZuccaland ? '#1a0d05' : palette.primary;
  const accentColor = isZuccaland ? '#f97316' : palette.gold;
  const stripeColor = isZuccaland ? '#f97316' : palette.primary;
  const priceColor = isZuccaland ? '#f97316' : palette.primary;
  const eventTitle = isZuccaland ? 'Zuccaland 2026' : 'Assaggia & Passeggia';
  const eventSubtitle = isZuccaland 
    ? (parsedNotes.dayKey !== 'unspecified' ? `Pro Loco Gasperina · ${parsedNotes.eventDate}${parsedNotes.dayKey === '24' ? ' (Ore 11:00 - 17:00)' : ''}` : 'Pro Loco Gasperina · Sabato 17, Domenica 18 o Domenica 25 Ottobre 2026') 
    : 'Pro Loco Gasperina · Gasperina (CZ)';
  const eventDate = isZuccaland ? parsedNotes.fullDateWithTime : '10 Agosto 2026 - Ritiro dalle ore 19:00';

  return (
    <Document
      title={`Biglietti ${eventTitle} - Ord. ${orderRef}`}
      author="Pro Loco Gasperina"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: headerBg, borderBottom: `4 solid ${accentColor}` }]}>
          <View style={styles.headerLeft}>
            {eventLogoBase64 ? (
              <Image src={eventLogoBase64} style={styles.logoImage} />
            ) : (
              <>
                <Text style={styles.eventTitle}>{eventTitle}</Text>
                <Text style={[styles.eventSubtitle, { color: accentColor }]}>{eventSubtitle}</Text>
              </>
            )}
          </View>
          <View style={styles.headerRight}>
            {proLocoLogoBase64 ? (
              <Image src={proLocoLogoBase64} style={styles.proLocoLogoImage} />
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

          {/* Buyer info — Structured 2x2 Grid so fields never collide or overlap */}
          <View style={styles.buyerSection} wrap={false}>
            <Text style={styles.buyerTitle}>Dati acquirente</Text>
            
            {/* Riga 1: Nome e Cognome + Email */}
            <View style={styles.buyerRow}>
              <View style={styles.buyerCol}>
                <Text style={styles.buyerFieldLabel}>Nome e Cognome</Text>
                <Text style={styles.buyerFieldValue}>{order.buyerName}</Text>
              </View>
              <View style={styles.buyerCol}>
                <Text style={styles.buyerFieldLabel}>Email</Text>
                <Text style={styles.buyerFieldValue}>{order.buyerEmail}</Text>
              </View>
            </View>

            {/* Riga 2: Data/Orario Ingresso + N° Biglietti */}
            <View style={[styles.buyerRow, { marginTop: 10 }]}>
              <View style={styles.buyerCol}>
                <Text style={styles.buyerFieldLabel}>
                  {isZuccaland ? 'Giorno & Orario Ingresso' : 'Data & Orario Ritiro'}
                </Text>
                <Text style={[styles.buyerFieldValue, { color: isZuccaland ? '#ea580c' : priceColor }]}>
                  {isZuccaland 
                    ? (parsedNotes.fullDateWithTime || (parsedNotes.eventDate ? `${parsedNotes.eventDate} · Ore 10:30` : 'Sabato 17, Domenica 18 o Domenica 25 Ottobre · Ore 10:30'))
                    : eventDate}
                </Text>
                {isZuccaland && parsedNotes.isPostponed && (
                  <Text style={{ fontSize: 7.5, color: '#c2410c', marginTop: 2, fontFamily: 'Helvetica-Bold' }}>
                    (Data di recupero dal {parsedNotes.originalDayKey === '10' ? '10' : '11'} Ottobre)
                  </Text>
                )}
              </View>

              <View style={styles.buyerCol}>
                <Text style={styles.buyerFieldLabel}>{isZuccaland ? 'N° Ingressi & Extra' : 'N° Biglietti'}</Text>
                <Text style={styles.buyerFieldValue}>
                  {isZuccaland ? (
                    `${admissionCount} ${admissionCount === 1 ? 'ingresso' : 'ingressi'}${parsedNotes.numChildren > 0 ? ` (${parsedNotes.numChildren} bimbi)` : ''}${youPickCount > 0 ? ` + ${youPickCount} You Pick` : ''}`
                  ) : (
                    `${order.tickets.length} ${parsedNotes.numChildren > 0 ? `(di cui ${parsedNotes.numChildren} ${parsedNotes.numChildren === 1 ? 'bambino' : 'bambini'})` : ''}`
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Selected Activities Box */}
          {parsedNotes.activities.length > 0 && (
            <View style={[styles.buyerSection, { backgroundColor: isZuccaland ? '#fff9f5' : '#f4f6fa', borderColor: isZuccaland ? '#fed7aa' : '#dbe2ef' }]} wrap={false}>
              <Text style={[styles.buyerTitle, { color: isZuccaland ? '#ea580c' : palette.primary, marginBottom: 4 }]}>
                Attività e Laboratori Riservati
              </Text>
              {parsedNotes.target ? (
                <Text style={{ fontSize: 8, color: isZuccaland ? '#9a3412' : '#4b5563', marginBottom: 6 }}>
                  Destinatari: {parsedNotes.target}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {parsedNotes.activities.map((act, idx) => (
                  <View key={idx} style={{ backgroundColor: isZuccaland ? '#ffedd5' : '#e0e7ff', borderRadius: 4, padding: '3 8' }}>
                    <Text style={{ fontSize: 8, color: isZuccaland ? '#9a3412' : '#1e3a8a', fontFamily: 'Helvetica-Bold' }}>
                      • {act}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Individual tickets */}
          {(() => {
            let admissionIdx = 0;
            let extraIdx = 0;
            return order.tickets.map((ticket) => {
              const isExtra = ticket.type.toLowerCase().includes('you pick') || ticket.type.toLowerCase().includes('laboratorio');
              if (isExtra) extraIdx++;
              else admissionIdx++;

              const labelText = isZuccaland
                ? isExtra
                  ? `Voucher Attività Extra ${extraIdx} di ${youPickCount}`
                  : `Ingresso Villaggio ${admissionIdx} di ${admissionCount}`
                : `Ricevuta ${admissionIdx} di ${order.tickets.length}`;

              return (
                <View key={ticket.id} wrap={false}>
                  <View style={styles.cutLineContainer}>
                    <View style={styles.cutLine} />
                    <Text style={styles.cutText}>Taglia qui</Text>
                    <View style={styles.cutLine} />
                  </View>

                  <View style={[styles.ticketCard, { borderLeft: 'none' }]}>
                    <View style={[styles.ticketStripe, { backgroundColor: isExtra ? '#ea580c' : stripeColor }]} />
                    <View style={styles.ticketContent}>
                      <View style={styles.ticketLeft}>
                        <Text style={styles.ticketLabel}>{labelText}</Text>
                        <Text style={styles.ticketType}>{ticket.type}</Text>
                        {isExtra && (
                          <Text style={{ fontSize: 8.5, color: '#c2410c', marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>
                            • Include 1 sola zucca da intagliare o dipingere
                          </Text>
                        )}
                        <Text style={{ fontSize: 9, color: priceColor, marginBottom: 5, fontFamily: 'Helvetica-Bold' }}>Data: {eventDate}</Text>
                        <Text style={styles.ticketMeta}>ID: {ticket.id.substring(0, 16).toUpperCase()}</Text>
                        <Text style={[styles.ticketPrice, { color: priceColor }]}>€{ticket.price.toFixed(2)}</Text>
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
              );
            });
          })()}

          {/* Location & GPS in PDF */}
          <View style={[styles.infoBox, { backgroundColor: isZuccaland ? '#fffaf5' : '#f0f4fc', borderColor: isZuccaland ? '#fed7aa' : '#dbe2ef' }]} wrap={false}>
            <Text style={[styles.infoText, { color: isZuccaland ? '#9a3412' : '#1e3a8a' }]}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Luogo dell&apos;evento: </Text>
              Gasperina (CZ) · Coordinate GPS per navigatore: 38.743791, 16.481122
            </Text>
          </View>

          {/* Day 24 Special Opening Time Alert */}
          {isZuccaland && parsedNotes.dayKey === '24' && (
            <View style={[styles.infoBox, { backgroundColor: '#fff7ed', borderColor: '#ea580c', borderWidth: 1.5 }]} wrap={false}>
              <Text style={[styles.infoText, { color: '#c2410c' }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>ORARIO INGRESSO SABATO 24 OTTOBRE: </Text>
                L&apos;orario ufficiale di apertura cancelli e svolgimento dell&apos;evento per Sabato 24 Ottobre è dalle ore 11:00 alle ore 17:00.
              </Text>
            </View>
          )}

          {/* Info box */}
          {isZuccaland && youPickCount > 0 && (
            <View style={[styles.infoBox, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]} wrap={false}>
              <Text style={[styles.infoText, { color: '#9a3412' }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>NOTA YOU PICK LAB: </Text>
                Ogni biglietto You Pick Lab dà diritto ad una sola zucca da scegliere nel campo e intagliare o dipingere nell&apos;area laboratorio.
              </Text>
            </View>
          )}

          <View style={styles.infoBox} wrap={false}>
            <Text style={styles.infoText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>AVVISO IMPORTANTE: </Text>
              Questo documento non è il biglietto finale. 
              Presenta questo documento al botteghino il giorno dell&apos;evento
              per ritirare i tuoi biglietti fisici. La ricevuta è strettamente personale e non cedibile.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>prolocogasperina.it · info@prolocogasperina.it</Text>
          <Text style={styles.footerBrand}>PRO LOCO GASPERINA</Text>
        </View>
      </Page>
    </Document>
  );
}
