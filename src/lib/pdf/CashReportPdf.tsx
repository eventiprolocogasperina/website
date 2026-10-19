import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { CashReport } from '@/server/domain/cash/report';

// Rendiconto della cassa di un'edizione (prompt 14): per giorno, cassa, operatore, metodo e prodotto.
// Registra contributi: niente diciture fiscali (§15).

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
  kpis: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kpi: { flex: 1, borderWidth: 1, borderColor: '#c9ced9', borderRadius: 4, padding: 8 },
  kpiValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: '#8a91a3', textAlign: 'center' },
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

function Group({ title, rows }: { title: string; rows: CashReport['byDay'] }) {
  if (!rows.length) return null;
  return (
    <View style={s.section}>
      <Text style={s.h}>{title}</Text>
      <Row head cells={['', 'Contributi', 'Contanti', 'Carta', 'Totale', 'Omaggi']} />
      {rows.map((g) => (
        <Row key={g.key} cells={[g.label, g.sales, formatMoney(g.cashCents), formatMoney(g.cardCents), formatMoney(g.netCents), formatMoney(g.complimentaryCents)]} />
      ))}
    </View>
  );
}

export function CashReportDocument({ report, generatedAt }: { report: CashReport; generatedAt: string }) {
  const { totals, period } = report;
  const periodLabel = period.from || period.to ? `dal ${period.from ? formatDate(period.from, 'short') : 'inizio'} al ${period.to ? formatDate(period.to, 'short') : 'oggi'}` : 'Tutta l’edizione';
  return (
    <Document title={`Rendiconto cassa - ${report.edition.title}`} author="Pro Loco Gasperina APS">
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Rendiconto della cassa</Text>
        <Text style={s.muted}>
          {report.edition.title} · {periodLabel} · generato il {formatDateTime(generatedAt)}
        </Text>
        <View style={s.kpis}>
          <View style={s.kpi}>
            <Text style={s.muted}>Totale contributi</Text>
            <Text style={s.kpiValue}>{formatMoney(totals.netCents)}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.muted}>Contributi registrati</Text>
            <Text style={s.kpiValue}>{totals.sales}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.muted}>Omaggi (valore)</Text>
            <Text style={s.kpiValue}>{formatMoney(totals.complimentaryCents)}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.muted}>Annullati</Text>
            <Text style={s.kpiValue}>{totals.voided}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h}>Per metodo</Text>
          <Row head cells={['Metodo', 'Contributi', 'Incassato', 'Stornato', 'Netto']} />
          {totals.byMethod.map((m) => (
            <Row key={m.method} cells={[m.label, m.count, formatMoney(m.amountCents), formatMoney(m.refundedCents), formatMoney(m.netCents)]} />
          ))}
        </View>
        <Group title="Per giorno" rows={report.byDay} />
        <Group title="Per cassa" rows={report.byRegister} />
        <Group title="Per operatore" rows={report.byOperator} />
        <View style={s.section}>
          <Text style={s.h}>Per prodotto</Text>
          <Row head cells={['Prodotto', 'Quantità', 'Importo']} />
          {totals.products.map((p) => (
            <Row key={p.productId} cells={[p.name, p.quantity, formatMoney(p.amountCents)]} />
          ))}
        </View>
        {report.flagged.length > 0 && (
          <View style={s.section}>
            <Text style={s.h}>Da controllare ({report.flagged.length})</Text>
            {report.flagged.map((f) => (
              <Row key={f.orderId} cells={[`${f.code}${f.number ? ` (n. ${f.number})` : ''} · ${f.register}`, formatDateTime(f.at), formatMoney(f.totalCents), [f.oversold ? 'oltre la scorta' : '', f.afterClose ? 'dopo la chiusura' : ''].filter(Boolean).join(', ')]} />
            ))}
          </View>
        )}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Pro Loco Gasperina APS · Rendiconto dei contributi · pagina ${pageNumber} di ${totalPages}`} />
      </Page>
    </Document>
  );
}
