import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// Rendiconto finale di un'edizione (§9), A4. Solo numeri aggregati: nessun dato personale.
// Registra contributi: niente diciture fiscali (§15).

export type FinalReportData = {
  editionTitle: string;
  period: string | null;
  status: string;
  generatedAt: string;
  generatedBy: string | null;
  totals: Array<{ label: string; value: string }>;
  tables: Array<{ title: string; head: string[]; rows: Array<Array<string | number>> }>;
};

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 48, fontFamily: 'Helvetica', fontSize: 9, color: '#151a2b' },
  band: { backgroundColor: '#283983', color: '#ffffff', padding: '16 18', borderRadius: 4 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  sub: { fontSize: 9, color: '#ffffff', opacity: 0.85, marginTop: 3 },
  meta: { marginTop: 8, color: '#5b6377', fontSize: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 8 },
  stat: { width: '31.5%', borderWidth: 1, borderColor: '#e2e5ec', borderRadius: 4, padding: 8 },
  statLabel: { fontSize: 7, color: '#5b6377', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  section: { marginTop: 16 },
  h: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e5ec', paddingVertical: 3 },
  head: { fontFamily: 'Helvetica-Bold', backgroundColor: '#eef0f5' },
  c1: { flex: 3, paddingLeft: 3 },
  c: { flex: 1, textAlign: 'right', paddingRight: 3 },
  empty: { color: '#8a91a3' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 7, color: '#8a91a3', flexDirection: 'row', justifyContent: 'space-between' },
});

function Row({ cells, head }: { cells: Array<string | number>; head?: boolean }) {
  return (
    <View style={head ? [s.row, s.head] : s.row} wrap={false}>
      {cells.map((c, i) => (
        <Text key={i} style={i === 0 ? s.c1 : s.c}>
          {String(c)}
        </Text>
      ))}
    </View>
  );
}

export function FinalReportDocument({ r }: { r: FinalReportData }) {
  return (
    <Document title={`Rendiconto finale - ${r.editionTitle}`} author="Pro Loco Gasperina">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <Text style={s.title}>Rendiconto finale</Text>
          <Text style={s.sub}>
            {r.editionTitle}
            {r.period ? ` · ${r.period}` : ''}
          </Text>
        </View>
        <Text style={s.meta}>
          Generato il {r.generatedAt}
          {r.generatedBy ? ` da ${r.generatedBy}` : ''} · stato dell’edizione: {r.status}
        </Text>
        <View style={s.grid}>
          {r.totals.map((t) => (
            <View key={t.label} style={s.stat}>
              <Text style={s.statLabel}>{t.label}</Text>
              <Text style={s.statValue}>{t.value}</Text>
            </View>
          ))}
        </View>
        {r.tables.map((t) => (
          <View key={t.title} style={s.section}>
            <Text style={s.h}>{t.title}</Text>
            <Row cells={t.head} head />
            {t.rows.length ? t.rows.map((row, i) => <Row key={i} cells={row} />) : <Text style={[s.row, s.empty]}>Nessun dato</Text>}
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text>Pro Loco Gasperina · contributi raccolti, documento non fiscale</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

