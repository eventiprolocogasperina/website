import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { type OrderWithTickets, parseOrderNotes } from '@/lib/data/tickets';

const colors = {
  primary: '#1e3a8a', // Deep navy
  primaryLight: '#eff6ff',
  primaryBorder: '#93c5fd',
  orange: '#ea580c', // Zuccaland orange
  orangeLight: '#fff7ed',
  orangeBorder: '#fdba74',
  green: '#15803d', // Emerald
  greenLight: '#f0fdf4',
  greenBorder: '#86efac',
  dark: '#0f172a',
  text: '#1e293b',
  textMuted: '#64748b',
  bgLight: '#f8fafc',
  white: '#ffffff',
  border: '#cbd5e1',
  borderDark: '#94a3b8',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: colors.text,
    fontSize: 7.5,
    lineHeight: 1.25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: 6,
    marginBottom: 6,
  },
  headerLeft: {
    flex: 1,
  },
  orgTitle: {
    color: colors.primary,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  docTitle: {
    color: colors.dark,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.2,
  },
  docSubtitle: {
    color: colors.textMuted,
    fontSize: 7.5,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  badgeA4: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  badgeA4Text: {
    color: colors.primary,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  timestampText: {
    fontSize: 6.5,
    color: colors.textMuted,
  },

  // KPI Summary Bar
  kpiBar: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCardLast: {
    marginRight: 0,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  kpiValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
  },

  // Day Group Header
  dayHeaderBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderTitle: {
    color: '#ffffff',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayHeaderBadge: {
    color: '#93c5fd',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 3,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    alignItems: 'center',
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    minHeight: 22,
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },

  // Column Widths (Fixed pt, total = 793pt)
  colCheck: { width: 22, alignItems: 'center', justifyContent: 'center' },
  colTitolare: { width: 165, paddingRight: 6 },
  colId: { width: 60, paddingRight: 4 },
  colPersone: { width: 42, textAlign: 'center' },
  colBambini: { width: 42, textAlign: 'center' },
  colYouPick: { width: 42, textAlign: 'center' },
  colAttivita: { width: 175, paddingRight: 6 },
  colStato: { width: 85, textAlign: 'center' },
  colNotePenna: { width: 160, paddingLeft: 4 },

  // Cells
  checkboxSquare: {
    width: 8.5,
    height: 8.5,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 1.5,
  },
  buyerSurname: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: colors.dark,
  },
  buyerContactText: {
    fontSize: 6.5,
    color: colors.textMuted,
    marginTop: 0.5,
  },
  orderIdText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.2,
    color: colors.dark,
  },
  orderTimeText: {
    fontSize: 6,
    color: colors.textMuted,
  },
  numBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
  },
  kidsBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
  },
  youPickBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.orange,
  },
  activityText: {
    fontSize: 6.5,
    color: colors.text,
    lineHeight: 1.2,
  },
  statusPaid: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
  },
  statusFree: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
  },
  statusPending: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#b45309',
  },
  amountText: {
    fontSize: 6.2,
    color: colors.textMuted,
  },

  // Note a penna line
  pennaLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: '#94a3b8',
    height: 9,
    width: '100%',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 3,
  },
  footerText: {
    fontSize: 6.5,
    color: colors.textMuted,
  },
});

export interface BookingManifestPdfProps {
  orders: OrderWithTickets[];
  title?: string;
  subtitle?: string;
}

/**
 * Estrae il cognome per l'ordinamento alfabetico.
 * In nomi italiani tipo "Mario Rossi" -> "Rossi"
 * Se il cognome è composto (es. "De Luca", "Di Pietro") o parola singola, gestisce correttamente.
 */
function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim().toLowerCase();
  
  // Controlla particelle tipiche del cognome italiano
  const particles = ['de', 'di', 'da', 'della', 'del', 'delle', 'lo', 'la', 'li', 'san', 'sant'];
  if (parts.length >= 3) {
    const secondToLast = parts[parts.length - 2].toLowerCase();
    if (particles.includes(secondToLast)) {
      return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`.toLowerCase();
    }
  }

  return parts[parts.length - 1].toLowerCase();
}

/**
 * Formatta il nome invertito "COGNOME Nome" per leggibilità immediata negli elenchi alfabetici
 */
function formatSurnameFirst(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim().toUpperCase();

  const particles = ['de', 'di', 'da', 'della', 'del', 'delle', 'lo', 'la', 'li', 'san', 'sant'];
  let surname = parts[parts.length - 1];
  let firstNames = parts.slice(0, parts.length - 1).join(' ');

  if (parts.length >= 3) {
    const secondToLast = parts[parts.length - 2].toLowerCase();
    if (particles.includes(secondToLast)) {
      surname = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
      firstNames = parts.slice(0, parts.length - 2).join(' ');
    }
  }

  return `${surname.toUpperCase()} ${firstNames}`;
}

export function BookingManifestPdfDocument({ orders, title = 'REGISTRO PRENOTAZIONI & PRESENZE', subtitle }: BookingManifestPdfProps) {
  // 1. Raggruppa gli ordini per data evento
  const dayGroupsMap: Record<string, { dayLabel: string; dayKey: string; orders: OrderWithTickets[] }> = {};

  let globalPersone = 0;
  let globalBambini = 0;
  let globalYouPick = 0;
  let globalIncasso = 0;

  orders.forEach(o => {
    const parsed = parseOrderNotes(o.notes);
    const dayLabel = parsed.eventDate || 'Data Non Specificata / Altro';
    const dayKey = parsed.dayKey || 'unspecified';
    const groupKey = `${dayKey}___${dayLabel}`;

    if (!dayGroupsMap[groupKey]) {
      dayGroupsMap[groupKey] = {
        dayLabel,
        dayKey,
        orders: []
      };
    }
    dayGroupsMap[groupKey].orders.push(o);

    const isLab = (t: any) => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');
    const admTix = o.tickets.filter(t => !isLab(t)).length;
    const youPickTix = o.tickets.filter(t => isLab(t)).length;
    const count = admTix || o.tickets.length;

    globalPersone += count;
    globalBambini += (parsed.children ?? 0);
    globalYouPick += youPickTix;
    if (o.status === 'PAID') {
      globalIncasso += (o.totalAmount || 0);
    }
  });

  // 2. Ordina gli ordini di ciascun giorno in ordine alfabetico di cognome
  Object.values(dayGroupsMap).forEach(g => {
    g.orders.sort((a, b) => {
      const surnameA = extractLastName(a.buyerName);
      const surnameB = extractLastName(b.buyerName);
      const comp = surnameA.localeCompare(surnameB, 'it');
      if (comp !== 0) return comp;
      return a.buyerName.localeCompare(b.buyerName, 'it');
    });
  });

  // 3. Ordina cronologicamente i gruppi di date
  const dayPriority: Record<string, number> = {
    '10': 1,
    '17': 2,
    '11': 3,
    '18': 4,
    '24': 5,
    '25': 6,
    'unspecified': 99
  };

  const sortedGroups = Object.values(dayGroupsMap).sort((a, b) => {
    const prioA = dayPriority[a.dayKey] ?? 50;
    const prioB = dayPriority[b.dayKey] ?? 50;
    if (prioA !== prioB) return prioA - prioB;
    return a.dayLabel.localeCompare(b.dayLabel, 'it');
  });

  const nowStr = new Date().toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        
        {/* Header ripetuto su ogni pagina */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.orgTitle}>Associazione di Promozione Sociale Pro Loco Gasperina APS</Text>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docSubtitle}>
              {subtitle ? `${subtitle} • ` : ''}Ordinato per data e cognome alfabetico (A-Z) con colonna per spunta e note a penna
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badgeA4}>
              <Text style={styles.badgeA4Text}>STAMPA A4 • FOGLIO PRESENZE</Text>
            </View>
            <Text style={styles.timestampText}>Generato: {nowStr}</Text>
          </View>
        </View>

        {/* KPI Summary Bar (In cima alla prima pagina) */}
        <View style={styles.kpiBar}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ordini Totali</Text>
            <Text style={styles.kpiValue}>{orders.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Totale Persone</Text>
            <Text style={styles.kpiValue}>{globalPersone}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Di cui Bambini</Text>
            <Text style={{ ...styles.kpiValue, color: '#0369a1' }}>{globalBambini}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>You Pick (Lab)</Text>
            <Text style={{ ...styles.kpiValue, color: colors.orange }}>{globalYouPick}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardLast]}>
            <Text style={styles.kpiLabel}>Incasso Pagato</Text>
            <Text style={{ ...styles.kpiValue, color: '#15803d' }}>€{globalIncasso.toFixed(2)}</Text>
          </View>
        </View>

        {/* Sezioni raggruppate per Giorno */}
        {sortedGroups.map((group) => {
          // Subtotali del giorno
          let dayPersone = 0;
          let dayBambini = 0;
          let dayYouPick = 0;
          let dayIncasso = 0;

          group.orders.forEach(o => {
            const parsed = parseOrderNotes(o.notes);
            const isLab = (t: any) => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');
            const admTix = o.tickets.filter(t => !isLab(t)).length;
            const youPickTix = o.tickets.filter(t => isLab(t)).length;
            dayPersone += (admTix || o.tickets.length);
            dayBambini += (parsed.children ?? 0);
            dayYouPick += youPickTix;
            if (o.status === 'PAID') {
              dayIncasso += (o.totalAmount || 0);
            }
          });

          return (
            <View key={group.dayLabel} minPresenceAhead={30}>
              {/* Day Header Banner */}
              <View style={styles.dayHeaderBanner}>
                <Text style={styles.dayHeaderTitle}>
                  {group.dayLabel}
                </Text>
                <Text style={styles.dayHeaderBadge}>
                  {group.orders.length} ordini • {dayPersone} persone ({dayBambini} bambini • {dayYouPick} You Pick) • Incasso: €{dayIncasso.toFixed(2)}
                </Text>
              </View>

              {/* Tabella del Giorno */}
              <View style={styles.table}>
                
                {/* Table Header Row */}
                <View style={styles.tableHeader}>
                  <View style={styles.colCheck}><Text style={styles.th}>OK</Text></View>
                  <View style={styles.colTitolare}><Text style={styles.th}>Titolare Prenotazione (A-Z)</Text></View>
                  <View style={styles.colId}><Text style={styles.th}>N° Ordine</Text></View>
                  <View style={styles.colPersone}><Text style={styles.th}>Persone</Text></View>
                  <View style={styles.colBambini}><Text style={styles.th}>Bambini</Text></View>
                  <View style={styles.colYouPick}><Text style={styles.th}>You Pick</Text></View>
                  <View style={styles.colAttivita}><Text style={styles.th}>Attività Iscritti Bambini</Text></View>
                  <View style={styles.colStato}><Text style={styles.th}>Stato / Importo</Text></View>
                  <View style={styles.colNotePenna}><Text style={styles.th}>Note a Penna / Check-in</Text></View>
                </View>

                {/* Table Rows (Alphabetical by surname) */}
                {group.orders.map((o, idx) => {
                  const parsed = parseOrderNotes(o.notes);
                  const isLab = (t: any) => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');
                  const admTix = o.tickets.filter(t => !isLab(t)).length;
                  const youPickTix = o.tickets.filter(t => isLab(t)).length;
                  const numPersone = admTix || o.tickets.length;
                  const numBambini = parsed.children ?? 0;
                  const shortId = o.id.replace(/-/g, '').substring(0, 8).toUpperCase();
                  const orderDateStr = new Date(o.createdAt).toLocaleDateString('it-IT');
                  const isEven = idx % 2 === 0;

                  const formattedName = formatSurnameFirst(o.buyerName);

                  // Attività / Laboratori
                  const attivitaStr = parsed.activities.length > 0
                    ? parsed.activities.join(' • ')
                    : '—';

                  // Pagamento
                  const isPaid = o.status === 'PAID';
                  const isOmaggio = isPaid && o.totalAmount === 0;

                  return (
                    <View 
                      key={o.id} 
                      style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                      wrap={false}
                    >
                      {/* Checkbox per operatore */}
                      <View style={styles.colCheck}>
                        <View style={styles.checkboxSquare} />
                      </View>

                      {/* Titolare Cognome Nome */}
                      <View style={styles.colTitolare}>
                        <Text style={styles.buyerSurname}>{formattedName}</Text>
                        <Text style={styles.buyerContactText}>
                          {o.buyerPhone ? `${o.buyerPhone} • ` : ''}{o.buyerEmail}
                        </Text>
                      </View>

                      {/* N° Ordine */}
                      <View style={styles.colId}>
                        <Text style={styles.orderIdText}>#{shortId}</Text>
                        <Text style={styles.orderTimeText}>{orderDateStr}</Text>
                      </View>

                      {/* N° Persone */}
                      <View style={styles.colPersone}>
                        <Text style={styles.numBadge}>{numPersone}</Text>
                      </View>

                      {/* N° Bambini */}
                      <View style={styles.colBambini}>
                        <Text style={numBambini > 0 ? styles.kidsBadge : styles.numBadge}>
                          {numBambini > 0 ? numBambini : '0'}
                        </Text>
                      </View>

                      {/* You Pick */}
                      <View style={styles.colYouPick}>
                        <Text style={youPickTix > 0 ? styles.youPickBadge : styles.numBadge}>
                          {youPickTix > 0 ? youPickTix : '0'}
                        </Text>
                      </View>

                      {/* Attività Scelte */}
                      <View style={styles.colAttivita}>
                        <Text style={styles.activityText}>
                          {attivitaStr}
                        </Text>
                      </View>

                      {/* Stato / Importo */}
                      <View style={styles.colStato}>
                        {isOmaggio ? (
                          <Text style={styles.statusFree}>OMAGGIO</Text>
                        ) : isPaid ? (
                          <>
                            <Text style={styles.statusPaid}>PAGATO</Text>
                            <Text style={styles.amountText}>€{o.totalAmount.toFixed(2)}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.statusPending}>{o.status}</Text>
                            <Text style={styles.amountText}>€{o.totalAmount.toFixed(2)}</Text>
                          </>
                        )}
                      </View>

                      {/* Riga per note manoscritte a penna */}
                      <View style={styles.colNotePenna}>
                        <View style={styles.pennaLine} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Footer fisso su ogni pagina */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Pro Loco Gasperina APS • Documento operativo interno per la spunta presenze e laboratori
          </Text>
          <Text 
            style={styles.footerText} 
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} di ${totalPages}`} 
          />
        </View>

      </Page>
    </Document>
  );
}
