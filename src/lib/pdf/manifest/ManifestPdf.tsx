import { Document, Page, Path, Svg, Text, View } from '@react-pdf/renderer';
import { dayTotals, formatDisplayName, pdfMoney, type ManifestGroup, type ManifestRow } from './rows';
import { colWidths, styles } from './styles';

// Registro presenze A4 orizzontale: un foglio per giorno, righe alternate, totali del giorno e spazio
// per le note a penna. Layout "activities" (bambini, laboratorio, una colonna per attività, come
// Zuccaland) o "generic" (dettaglio biglietti, come Assaggia e Passeggia).

const CheckIcon = ({ color = '#15803d' }: { color?: string }) => (
  <Svg width={8.5} height={8.5} viewBox="0 0 24 24">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3.2} fill="none" />
  </Svg>
);

/** Spazio delle colonne attività: quello delle tre colonne fisse di oggi (Zuccart, Zucca in Vaso, Facepainting). */
const ACTIVITY_SPACE = colWidths.zuccart + colWidths.zuccaVaso + colWidths.facepainting;

export type ManifestPdfProps = {
  groups: ManifestGroup[];
  title: string;
  subtitle?: string;
  layout: 'activities' | 'generic';
  /** Colonne con la spunta, una per attività (solo layout "activities"). */
  activityColumns?: Array<{ key: string; label: string }>;
  labLabel?: string;
};

function Paid({ row }: { row: ManifestRow }) {
  if (row.paid && row.free) return <Text style={styles.omaggioText}>OMAGGIO</Text>;
  if (row.paid) return <CheckIcon />;
  return <Text style={[styles.cellText, { color: '#b45309', fontSize: 6.5 }]}>{row.statusLabel}</Text>;
}

export function ManifestPdfDocument({ groups, title, subtitle, layout, activityColumns = [], labLabel = 'YOU PICK LAB' }: ManifestPdfProps) {
  const acts = layout === 'activities' ? activityColumns : [];
  const actWidth = acts.length ? ACTIVITY_SPACE / acts.length : 0;
  const actCell = { width: actWidth, alignItems: 'center' as const, justifyContent: 'center' as const };
  const attivita = [styles.cAttivita, acts.length ? {} : { width: colWidths.attivita + ACTIVITY_SPACE }];
  const g = layout === 'generic';
  const c = g
    ? { data: styles.cGData, name: styles.cGName, id: styles.cGId, persone: styles.cGPersone, bambini: styles.cGBambini, adulti: styles.cGAdulti, pagato: styles.cGPagato, importo: styles.cGImporto, note: styles.cGNote, totale: styles.cGTotaleLabel }
    : { data: styles.cData, name: styles.cName, id: styles.cId, persone: styles.cPersone, bambini: styles.cBambini, adulti: styles.cAdulti, pagato: styles.cPagato, importo: styles.cImporto, note: styles.cNote, totale: styles.cTotaleLabel };

  return (
    <Document>
      {groups.map((group) => {
        const t = dayTotals(group.rows);
        return (
          <Page key={group.shortDate} size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header} fixed>
              <View>
                <Text style={styles.headerTitle}>{`${title} — Registro prenotazioni`}</Text>
                {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
              </View>
              <Text style={styles.headerPage} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} di ${totalPages}`} />
            </View>

            <View style={styles.thRow} fixed>
              <View style={c.data}><Text style={styles.thText}>DATA EVENTO</Text></View>
              <View style={c.name}><Text style={styles.thText}>PRENOTAZIONE</Text></View>
              <View style={c.id}><Text style={styles.thText}>{g ? 'N° ORDINE' : 'N° ORD.'}</Text></View>
              <View style={c.persone}><Text style={styles.thText}>PERSONE</Text></View>
              <View style={c.bambini}><Text style={styles.thText}>BAMBINI</Text></View>
              <View style={c.adulti}><Text style={styles.thText}>ADULTI</Text></View>
              {g ? (
                <View style={styles.cGDettaglio}><Text style={styles.thText}>DETTAGLIO BIGLIETTI</Text></View>
              ) : (
                <>
                  <View style={styles.cYouPick}><Text style={styles.thText}>{labLabel}</Text></View>
                  <View style={attivita}><Text style={styles.thText}>ATTIVITÀ PRENOTATE</Text></View>
                  {acts.map((a) => (
                    <View key={a.key} style={actCell}><Text style={styles.thText}>{a.label}</Text></View>
                  ))}
                </>
              )}
              <View style={c.pagato}><Text style={styles.thText}>PAGATO</Text></View>
              <View style={c.importo}><Text style={[styles.thText, { textAlign: 'right' }]}>IMPORTO</Text></View>
              <View style={c.note}><Text style={styles.thText}>NOTE A PENNA</Text></View>
            </View>

            {group.rows.map((r, idx) => (
              <View key={r.id} style={[styles.row, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]} wrap={false}>
                <View style={c.data}><Text style={styles.cellText}>{group.shortDate}</Text></View>
                <View style={c.name}>
                  <Text style={styles.nameBold}>{formatDisplayName(r.name).surnameFirst}</Text>
                  {r.phone ? <Text style={styles.subContact}>{r.phone}</Text> : null}
                </View>
                <View style={c.id}><Text style={styles.idText}>{r.code}</Text></View>
                <View style={c.persone}><Text style={[styles.nameBold, { textAlign: 'center' }]}>{r.persons}</Text></View>
                <View style={c.bambini}><Text style={styles.cellTextCenter}>{r.children}</Text></View>
                <View style={c.adulti}><Text style={styles.cellTextCenter}>{Math.max(0, r.persons - r.children)}</Text></View>
                {g ? (
                  <View style={styles.cGDettaglio}><Text style={styles.cellText}>{r.detail}</Text></View>
                ) : (
                  <>
                    <View style={styles.cYouPick}><Text style={styles.cellTextCenter}>{r.labs}</Text></View>
                    <View style={attivita}><Text style={styles.cellText}>{r.activities.length ? r.activities.map((a) => a.replace(/\s*\([^)]*\)/g, '')).join(', ') : '—'}</Text></View>
                    {acts.map((a) => (
                      <View key={a.key} style={actCell}>{r.activityKeys.includes(a.key) ? <CheckIcon /> : null}</View>
                    ))}
                  </>
                )}
                <View style={c.pagato}><Paid row={r} /></View>
                <View style={c.importo}><Text style={styles.amountText}>{pdfMoney(r.amountCents)}</Text></View>
                <View style={c.note}><View style={styles.penLine} /></View>
              </View>
            ))}

            <View style={styles.totaleRow} wrap={false}>
              <View style={c.totale}><Text style={styles.totaleLabel}>{`Totale ${group.shortDate.replace(/^[a-z]{3}\s+/i, '')}`}</Text></View>
              <View style={c.persone}><Text style={styles.totaleValue}>{t.persons}</Text></View>
              <View style={c.bambini}><Text style={styles.totaleValue}>{t.children}</Text></View>
              <View style={c.adulti}><Text style={styles.totaleValue}>{t.adults}</Text></View>
              {g ? (
                <View style={styles.cGDettaglio} />
              ) : (
                <>
                  <View style={styles.cYouPick}><Text style={styles.totaleValue}>{t.labs}</Text></View>
                  <View style={attivita} />
                  {acts.map((a) => (
                    <View key={a.key} style={actCell} />
                  ))}
                </>
              )}
              <View style={c.pagato}><CheckIcon /></View>
              <View style={c.importo}><Text style={styles.totaleImporto}>{pdfMoney(t.amountCents)}</Text></View>
              <View style={c.note} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
