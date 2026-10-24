// Biglietti in PDF degli ordini del nucleo nuovo (prompt 13): stesso aspetto di TicketPdfDocument,
// ma con i dati dell'edizione invece di testi scritti per Zuccaland e Assaggia e Passeggia.
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export type OrderTicketsPdfData = {
  code: string;
  editionTitle: string;
  location: string | null;
  /** "sabato 17 ottobre 2026, 15:00" o null. */
  when: string | null;
  buyerName: string | null;
  issuedOn: string;
  totalLabel: string;
  /** "Totale pagato" se l'ordine è pagato, altrimenti "Totale". */
  totalTitle?: string;
  /** "Codice SPONSOR26: −5,00 €" se l'ordine ha usato un codice sconto. */
  discountLabel?: string | null;
  tickets: Array<{ id: string; name: string; when: string | null; priceLabel: string; qrDataUri: string }>;
  /** Righe senza biglietto (es. consumazioni), solo nel riepilogo. */
  otherLines: Array<{ name: string; quantity: number; totalLabel: string }>;
  /** Colore del testo in evidenza e della striscia dei biglietti (contrasto AA sul bianco). */
  accent: string;
  /** Fondo della testata (scuro, dal tema del format). */
  header: string;
  /** Colore pieno del format: bordo della testata. */
  highlight: string;
  /** Logo Pro Loco (chiaro, per la testata scura). */
  logo?: string;
  /** Logo del format per fondi scuri, se c'è. */
  eventLogo?: string;
  /** "Ingresso dalle ore 10:30": evidenziato sotto la testata. */
  opening?: string | null;
};

const c = { dark: '#1a1a1a', muted: '#6b6b6b', light: '#f7f7f5', white: '#ffffff', line: '#dcdcdc' };

const s = StyleSheet.create({
  page: { backgroundColor: c.light, fontFamily: 'Helvetica', fontSize: 10, color: c.dark },
  header: { padding: '32 40 24 40', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: c.white, fontSize: 24, fontFamily: 'Helvetica-Bold' },
  subtitle: { color: c.white, fontSize: 10, marginTop: 4, opacity: 0.85 },
  logo: { height: 48, objectFit: 'contain' },
  eventLogo: { height: 54, maxWidth: 260, objectFit: 'contain', marginBottom: 6 },
  opening: { borderRadius: 6, padding: '10 14', marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: '24 40' },
  ref: { fontSize: 9, color: c.muted, marginBottom: 12 },
  box: { backgroundColor: c.white, borderRadius: 6, padding: 14, marginBottom: 14, border: `1 solid ${c.line}` },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 8, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  value: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  cut: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  cutLine: { flex: 1, borderTop: `1 dashed ${c.line}` },
  cutText: { fontSize: 7, color: c.muted, marginHorizontal: 6 },
  ticket: { backgroundColor: c.white, borderRadius: 6, flexDirection: 'row', border: `1 solid ${c.line}` },
  stripe: { width: 6, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  ticketBody: { flex: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  meta: { fontSize: 8, color: c.muted, marginTop: 2 },
  qr: { width: 110, height: 110 },
  footer: { fontSize: 8, color: c.muted, marginTop: 12, lineHeight: 1.4 },
});

export function OrderTicketsPdf({ data }: { data: OrderTicketsPdfData }) {
  const n = data.tickets.length;
  return (
    <Document title={`Biglietti ${data.editionTitle} - ${data.code}`} author="Pro Loco Gasperina">
      <Page size="A4" style={s.page}>
        <View style={[s.header, { backgroundColor: data.header, borderBottom: `4 solid ${data.highlight}` }]}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image di react-pdf: niente alt nel PDF */}
            {data.eventLogo ? <Image src={data.eventLogo} style={s.eventLogo} /> : <Text style={s.title}>{data.editionTitle}</Text>}
            <Text style={s.subtitle}>
              {data.eventLogo ? `${data.editionTitle} · ` : ''}Pro Loco Gasperina{data.location ? ` · ${data.location}` : ''}
            </Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image di react-pdf: niente alt nel PDF */}
          {data.logo ? <Image src={data.logo} style={s.logo} /> : null}
        </View>
        <View style={s.body}>
          <Text style={s.ref}>
            Ordine {data.code} · emesso il {data.issuedOn}
          </Text>
          {data.when && data.opening ? (
            <View style={[s.opening, { backgroundColor: data.accent }]}>
              <Text style={{ color: c.white, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{data.when}</Text>
              <Text style={{ color: c.white, fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{data.opening}</Text>
            </View>
          ) : null}
          <View style={s.box}>
            <View style={s.row}>
              <View>
                <Text style={s.label}>Intestato a</Text>
                <Text style={s.value}>{data.buyerName ?? '—'}</Text>
              </View>
              <View>
                <Text style={s.label}>Quando</Text>
                <Text style={s.value}>{data.when ?? 'Vedi i biglietti'}</Text>
              </View>
              <View>
                <Text style={s.label}>{data.totalTitle ?? 'Totale'}</Text>
                <Text style={s.value}>{data.totalLabel}</Text>
              </View>
            </View>
            {data.discountLabel && <Text style={s.meta}>{data.discountLabel}</Text>}
            {data.otherLines.map((l, i) => (
              <Text key={i} style={s.meta}>
                {l.quantity}× {l.name} · {l.totalLabel}
              </Text>
            ))}
          </View>

          {data.tickets.map((t, i) => (
            <View key={t.id} wrap={false}>
              <View style={s.cut}>
                <View style={s.cutLine} />
                <Text style={s.cutText}>✂ Biglietto {i + 1} di {n}</Text>
                <View style={s.cutLine} />
              </View>
              <View style={s.ticket}>
                <View style={[s.stripe, { backgroundColor: data.accent }]} />
                <View style={s.ticketBody}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={s.ticketName}>{t.name}</Text>
                    {t.when ? <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: data.accent }}>{t.when}</Text> : null}
                    <Text style={s.meta}>
                      {data.code} · {t.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={s.meta}>{t.priceLabel}</Text>
                  </View>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- Image di react-pdf */}
                  <Image src={t.qrDataUri} style={s.qr} />
                </View>
              </View>
            </View>
          ))}

          <Text style={s.footer}>
            Mostra il QR all&apos;ingresso, dal telefono o stampato. Ogni QR vale per una persona e si può usare una sola volta.
            {'\n'}Puoi rivedere e scaricare i biglietti in qualsiasi momento dal link “I miei biglietti” nell&apos;email di conferma.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
