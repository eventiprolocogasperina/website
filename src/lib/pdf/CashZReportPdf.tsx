import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { DENOMINATIONS_CENTS, denominationLabel } from '@/lib/cash/denominations';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

// Chiusura Z di un turno di cassa (§12.1), A4 stampabile. Registra contributi: niente diciture fiscali (§15).

export type ZReportData = {
  editionTitle: string;
  registerName: string;
  zReportNumber: number;
  openedAt: string;
  openedByName: string | null;
  closedAt: string;
  closedByName: string | null;
  openingFloatCents: number;
  expectedCashCents: number;
  countedCashCents: number;
  differenceCents: number;
  denominations: Record<string, number>;
  notes: string | null;
  totals: {
    sales: number;
    voided: number;
    flagged: number;
    netCents: number;
    complimentaryCents: number;
    byMethod: Array<{ label: string; count: number; amountCents: number; refundedCents: number; netCents: number }>;
    products: Array<{ name: string; quantity: number; amountCents: number }>;
  };
};

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', fontSize: 9, color: '#151a2b' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#5b6377' },
  section: { marginTop: 14 },
  h: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e5ec', paddingVertical: 3 },
  head: { fontFamily: 'Helvetica-Bold', backgroundColor: '#eef0f5' },
  c1: { flex: 3 },
  c: { flex: 1, textAlign: 'right' },
  big: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  box: { borderWidth: 1, borderColor: '#c9ced9', borderRadius: 4, padding: 8, marginTop: 10 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: '#8a91a3', textAlign: 'center' },
});

function Row({ cells, head }: { cells: Array<string | number>; head?: boolean }) {
  return (
    <View style={head ? [s.row, s.head] : s.row}>
      {cells.map((c, i) => (
        <Text key={i} style={i === 0 ? s.c1 : s.c}>
          {String(c)}
        </Text>
      ))}
    </View>
  );
}

export function CashZReportDocument({ z }: { z: ZReportData }) {
  const diffLabel = z.differenceCents === 0 ? 'in pari' : z.differenceCents > 0 ? 'in più' : 'in meno';
  return (
    <Document title={`Chiusura Z n. ${z.zReportNumber} - ${z.registerName}`} author="Pro Loco Gasperina APS">
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Chiusura Z n. {z.zReportNumber}</Text>
        <Text style={s.muted}>
          {z.editionTitle} · {z.registerName}
        </Text>
        <Text style={[s.muted, { marginTop: 4 }]}>
          Turno aperto {formatDateTime(z.openedAt)}
          {z.openedByName ? ` da ${z.openedByName}` : ''} · chiuso {formatDateTime(z.closedAt)}
          {z.closedByName ? ` da ${z.closedByName}` : ''}
        </Text>

        <View style={s.section}>
          <Text style={s.h}>Contributi per metodo</Text>
          <Row head cells={['Metodo', 'Contributi', 'Incassato', 'Stornato', 'Netto']} />
          {z.totals.byMethod.map((m) => (
            <Row key={m.label} cells={[m.label, m.count, formatMoney(m.amountCents), formatMoney(m.refundedCents), formatMoney(m.netCents)]} />
          ))}
          <Row cells={['Totale contributi (contanti + carta)', z.totals.sales, '', '', formatMoney(z.totals.netCents)]} />
          <Text style={[s.muted, { marginTop: 4 }]}>
            Omaggi a valore: {formatMoney(z.totals.complimentaryCents)} · Annullati: {z.totals.voided}
            {z.totals.flagged ? ` · Da controllare: ${z.totals.flagged}` : ''}
          </Text>
        </View>

        <View style={s.box}>
          <Row cells={['Fondo cassa all’apertura', formatMoney(z.openingFloatCents)]} />
          <Row cells={['Contante atteso', formatMoney(z.expectedCashCents)]} />
          <Row cells={['Contante contato', formatMoney(z.countedCashCents)]} />
          <View style={s.row}>
            <Text style={[s.c1, s.big]}>Differenza ({diffLabel})</Text>
            <Text style={[s.c, s.big]}>{formatMoney(z.differenceCents)}</Text>
          </View>
          {z.notes ? <Text style={{ marginTop: 6 }}>Nota: {z.notes}</Text> : null}
        </View>

        <View style={s.section}>
          <Text style={s.h}>Conteggio per taglio</Text>
          <Row head cells={['Taglio', 'Pezzi', 'Valore']} />
          {DENOMINATIONS_CENTS.filter((d) => (z.denominations[String(d)] ?? 0) > 0).map((d) => (
            <Row key={d} cells={[denominationLabel(d), z.denominations[String(d)], formatMoney(d * z.denominations[String(d)])]} />
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.h}>Pezzi venduti per prodotto</Text>
          <Row head cells={['Prodotto', 'Pezzi', 'Importo']} />
          {z.totals.products.map((p, i) => (
            <Row key={`${i}-${p.name}`} cells={[p.name, p.quantity, formatMoney(p.amountCents)]} />
          ))}
          {z.totals.products.length > 0 && <Row head cells={['Totale pezzi', z.totals.products.reduce((n, p) => n + p.quantity, 0), formatMoney(z.totals.products.reduce((n, p) => n + p.amountCents, 0))]} />}
        </View>

        <Text style={s.footer} fixed>
          Pro Loco Gasperina APS · Registro dei contributi raccolti in cassa · Chiusura Z n. {z.zReportNumber}
        </Text>
      </Page>
    </Document>
  );
}
