import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { type OrderWithTickets, parseOrderNotes } from '@/lib/data/tickets';

// Definizioni larghezze colonne per A4 Landscape (Larghezza pagina = 842pt, Margini = 16pt x 2 => Utile = 810pt)
const colWidths = {
  data: 58,
  name: 120,
  id: 45,
  persone: 28,
  bambini: 28,
  adulti: 26,
  youPick: 36,
  attivita: 115,
  zuccart: 34,
  zuccaVaso: 40,
  facepainting: 44,
  pagato: 32,
  importo: 44,
  note: 160,
};

// Larghezze alternative per eventi non Zuccaland (es. Assaggia & Passeggia)
const colWidthsGeneric = {
  data: 65,
  name: 155,
  id: 55,
  persone: 35,
  bambini: 35,
  adulti: 35,
  dettaglio: 165,
  pagato: 40,
  importo: 50,
  note: 175,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingLeft: 16,
    paddingRight: 16,
    fontFamily: 'Helvetica',
    fontSize: 7,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2522',
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1c1917',
  },
  headerSubtitle: {
    fontSize: 7,
    color: '#78716c',
  },
  headerPage: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#44403c',
  },

  // Intestazione tabella stile registro scuro (come allegato)
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#2e2522',
    alignItems: 'center',
    minHeight: 21,
    paddingVertical: 3,
  },
  thText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.3,
    textTransform: 'uppercase',
  },

  // Righe tabella con colori alternati e altezza confortevole
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
  },
  rowEven: {
    backgroundColor: '#ffffff',
  },
  rowOdd: {
    backgroundColor: '#f5f5f7', // Grigio chiaro alternato
  },

  // Riga subtotale per giorno (come allegato)
  totaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 23,
    backgroundColor: '#ede7df', // Sabbia/grigio caldo dell'allegato
    borderTopWidth: 1.2,
    borderTopColor: '#78716c',
    borderBottomWidth: 1.2,
    borderBottomColor: '#78716c',
    paddingVertical: 4,
  },
  totaleLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#1c1917',
  },
  totaleValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#1c1917',
    textAlign: 'center',
  },
  totaleImporto: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.8,
    color: '#15803d',
    textAlign: 'right',
  },

  // Tipografia celle
  cellText: {
    fontSize: 7,
    color: '#1e293b',
  },
  cellTextCenter: {
    fontSize: 7,
    color: '#1e293b',
    textAlign: 'center',
  },
  nameBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subContact: {
    fontSize: 5.8,
    color: '#64748b',
    marginTop: 0.5,
  },
  idText: {
    fontSize: 6.8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  amountText: {
    fontSize: 7.2,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  omaggioText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
  },

  // Riga tratteggiata/solida per note a mano al check-in
  penLine: {
    borderBottomWidth: 0.6,
    borderBottomColor: '#cbd5e1',
    width: '92%',
    height: 9,
  },

  // Colonne Zuccaland
  cData: { width: colWidths.data, paddingLeft: 3 },
  cName: { width: colWidths.name, paddingLeft: 3, paddingRight: 4 },
  cId: { width: colWidths.id, paddingLeft: 2 },
  cPersone: { width: colWidths.persone, textAlign: 'center' },
  cBambini: { width: colWidths.bambini, textAlign: 'center' },
  cAdulti: { width: colWidths.adulti, textAlign: 'center' },
  cYouPick: { width: colWidths.youPick, textAlign: 'center' },
  cAttivita: { width: colWidths.attivita, paddingLeft: 3, paddingRight: 4 },
  cZuccart: { width: colWidths.zuccart, alignItems: 'center', justifyContent: 'center' },
  cZuccaVaso: { width: colWidths.zuccaVaso, alignItems: 'center', justifyContent: 'center' },
  cFacep: { width: colWidths.facepainting, alignItems: 'center', justifyContent: 'center' },
  cPagato: { width: colWidths.pagato, alignItems: 'center', justifyContent: 'center' },
  cImporto: { width: colWidths.importo, paddingRight: 4 },
  cNote: { width: colWidths.note, paddingLeft: 4 },
  cTotaleLabel: { width: colWidths.data + colWidths.name + colWidths.id, paddingLeft: 4 },

  // Colonne Generiche
  cGData: { width: colWidthsGeneric.data, paddingLeft: 4 },
  cGName: { width: colWidthsGeneric.name, paddingLeft: 4, paddingRight: 4 },
  cGId: { width: colWidthsGeneric.id, paddingLeft: 3 },
  cGPersone: { width: colWidthsGeneric.persone, textAlign: 'center' },
  cGBambini: { width: colWidthsGeneric.bambini, textAlign: 'center' },
  cGAdulti: { width: colWidthsGeneric.adulti, textAlign: 'center' },
  cGDettaglio: { width: colWidthsGeneric.dettaglio, paddingLeft: 4, paddingRight: 4 },
  cGPagato: { width: colWidthsGeneric.pagato, alignItems: 'center', justifyContent: 'center' },
  cGImporto: { width: colWidthsGeneric.importo, paddingRight: 4 },
  cGNote: { width: colWidthsGeneric.note, paddingLeft: 4 },
  cGTotaleLabel: { width: colWidthsGeneric.data + colWidthsGeneric.name + colWidthsGeneric.id, paddingLeft: 4 },
});

// Icona spunta vettoriale SVG (affidabile e ad alta risoluzione in stampa)
const CheckIcon = ({ color = '#15803d' }: { color?: string }) => (
  <Svg width={8.5} height={8.5} viewBox="0 0 24 24">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={3.2}
      fill="none"
    />
  </Svg>
);

export interface BookingManifestPdfProps {
  orders: OrderWithTickets[];
  title?: string;
  subtitle?: string;
}

/**
 * Estrae il cognome da una stringa italiana considerando particelle composti (es. De Luca, Di Pietro)
 */
function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim().toLowerCase();

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
 * Formatta il nome per il foglio presenze mettendo in evidenza il cognome
 */
function formatDisplayName(fullName: string): { surnameFirst: string; original: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { surnameFirst: fullName.trim(), original: fullName.trim() };
  }

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

  return {
    surnameFirst: `${surname.toUpperCase()} ${firstNames}`,
    original: fullName.trim()
  };
}

/**
 * Formatta la data abbreviata tipo 'sab 10/10/2026' o 'dom 11/10/2026' come nell'allegato
 */
function formatShortDate(eventDate: string | null, dayKey?: string): string {
  if (!eventDate) return 'N/D';

  const d = eventDate.toLowerCase();
  if (d.includes('10')) return 'sab 10/10/2026';
  if (d.includes('11')) return 'dom 11/10/2026';
  if (d.includes('17')) return 'sab 17/10/2026';
  if (d.includes('18')) return 'dom 18/10/2026';
  if (d.includes('24')) return 'sab 24/10/2026';
  if (d.includes('25')) return 'dom 25/10/2026';

  if (dayKey === '10') return 'sab 10/10/2026';
  if (dayKey === '11') return 'dom 11/10/2026';
  if (dayKey === '17') return 'sab 17/10/2026';
  if (dayKey === '18') return 'dom 18/10/2026';
  if (dayKey === '24') return 'sab 24/10/2026';
  if (dayKey === '25') return 'dom 25/10/2026';

  // Fallback: se la data contiene già 'sab' o 'dom' o gg/mm/aaaa
  const match = eventDate.match(/(\d{1,2})[\/\-\s]([A-Za-z]+|\d{1,2})[\/\-\s]?(\d{4})?/);
  if (match) {
    return eventDate.length > 15 ? eventDate.substring(0, 15) : eventDate;
  }

  return eventDate;
}

export function BookingManifestPdfDocument({
  orders,
  title = 'Zuccaland 2026',
  subtitle
}: BookingManifestPdfProps) {
  const isZuccaland = title.toLowerCase().includes('zuccaland') || (subtitle && subtitle.toLowerCase().includes('zuccaland'));

  // 1. Raggruppa gli ordini per data dell'evento
  const groupsMap: Record<string, { dayLabel: string; shortDate: string; dayKey: string; orders: OrderWithTickets[] }> = {};

  orders.forEach(o => {
    const parsed = parseOrderNotes(o.notes);
    const dayLabel = parsed.eventDate || 'Data Non Specificata';
    const dayKey = parsed.dayKey || 'unspecified';
    const shortDate = formatShortDate(parsed.eventDate, dayKey);
    const groupKey = `${dayKey}___${shortDate}`;

    if (!groupsMap[groupKey]) {
      groupsMap[groupKey] = {
        dayLabel,
        shortDate,
        dayKey,
        orders: []
      };
    }
    groupsMap[groupKey].orders.push(o);
  });

  // 2. Ordina gli ordini di ciascun giorno in ordine alfabetico di cognome (A-Z)
  Object.values(groupsMap).forEach(g => {
    g.orders.sort((a, b) => {
      const surnameA = extractLastName(a.buyerName);
      const surnameB = extractLastName(b.buyerName);
      const comp = surnameA.localeCompare(surnameB, 'it');
      if (comp !== 0) return comp;
      return a.buyerName.localeCompare(b.buyerName, 'it');
    });
  });

  // 3. Ordina cronologicamente le date
  const dayPriority: Record<string, number> = {
    '10': 1,
    '11': 2,
    '17': 3,
    '18': 4,
    '24': 5,
    '25': 6,
    'unspecified': 99
  };

  const sortedGroups = Object.values(groupsMap).sort((a, b) => {
    const prioA = dayPriority[a.dayKey] ?? 50;
    const prioB = dayPriority[b.dayKey] ?? 50;
    if (prioA !== prioB) return prioA - prioB;
    return a.shortDate.localeCompare(b.shortDate, 'it');
  });

  const displayTitle = isZuccaland ? 'Zuccaland 2026 — Registro prenotazioni' : `${title} — Registro prenotazioni`;

  return (
    <Document>
      {sortedGroups.map((group) => {
        // Calcola i totali del giorno per la riga finale
        let dayPersone = 0;
        let dayBambini = 0;
        let dayAdulti = 0;
        let dayYouPick = 0;
        let dayIncasso = 0;

        group.orders.forEach(o => {
          const parsed = parseOrderNotes(o.notes);
          const isLab = (t: any) => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');
          const admTix = o.tickets.filter(t => !isLab(t)).length;
          const youPickTix = o.tickets.filter(t => isLab(t)).length;
          const count = admTix || o.tickets.length;
          const numBambini = parsed.children ?? 0;
          const numAdulti = Math.max(0, count - numBambini);

          dayPersone += count;
          dayBambini += numBambini;
          dayAdulti += numAdulti;
          dayYouPick += youPickTix;
          if (o.status === 'PAID') {
            dayIncasso += (o.totalAmount || 0);
          }
        });

        const totaleDateLabel = `Totale ${group.shortDate.replace(/^[a-z]{3}\s+/i, '') || group.dayLabel}`;

        return (
          <Page key={group.shortDate} size="A4" orientation="landscape" style={styles.page}>
            {/* Intestazione fissa su ogni pagina */}
            <View style={styles.header} fixed>
              <View>
                <Text style={styles.headerTitle}>{displayTitle}</Text>
                {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
              </View>
              <Text
                style={styles.headerPage}
                render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} di ${totalPages}`}
              />
            </View>

            {/* Intestazione colonne tabella fissa su ogni pagina */}
            {isZuccaland ? (
              <View style={styles.thRow} fixed>
                <View style={styles.cData}><Text style={styles.thText}>DATA EVENTO</Text></View>
                <View style={styles.cName}><Text style={styles.thText}>PRENOTAZIONE</Text></View>
                <View style={styles.cId}><Text style={styles.thText}>N° ORD.</Text></View>
                <View style={styles.cPersone}><Text style={styles.thText}>PERSONE</Text></View>
                <View style={styles.cBambini}><Text style={styles.thText}>BAMBINI</Text></View>
                <View style={styles.cAdulti}><Text style={styles.thText}>ADULTI</Text></View>
                <View style={styles.cYouPick}><Text style={styles.thText}>YOU PICK LAB</Text></View>
                <View style={styles.cAttivita}><Text style={styles.thText}>ATTIVITÀ PRENOTATE</Text></View>
                <View style={styles.cZuccart}><Text style={styles.thText}>Zuccart</Text></View>
                <View style={styles.cZuccaVaso}><Text style={styles.thText}>Zucca in Vaso</Text></View>
                <View style={styles.cFacep}><Text style={styles.thText}>Facepainting</Text></View>
                <View style={styles.cPagato}><Text style={styles.thText}>PAGATO</Text></View>
                <View style={styles.cImporto}><Text style={[styles.thText, { textAlign: 'right' }]}>IMPORTO</Text></View>
                <View style={styles.cNote}><Text style={styles.thText}>NOTE A PENNA</Text></View>
              </View>
            ) : (
              <View style={styles.thRow} fixed>
                <View style={styles.cGData}><Text style={styles.thText}>DATA EVENTO</Text></View>
                <View style={styles.cGName}><Text style={styles.thText}>PRENOTAZIONE</Text></View>
                <View style={styles.cGId}><Text style={styles.thText}>N° ORDINE</Text></View>
                <View style={styles.cGPersone}><Text style={styles.thText}>PERSONE</Text></View>
                <View style={styles.cGBambini}><Text style={styles.thText}>BAMBINI</Text></View>
                <View style={styles.cGAdulti}><Text style={styles.thText}>ADULTI</Text></View>
                <View style={styles.cGDettaglio}><Text style={styles.thText}>DETTAGLIO BIGLIETTI</Text></View>
                <View style={styles.cGPagato}><Text style={styles.thText}>PAGATO</Text></View>
                <View style={styles.cGImporto}><Text style={[styles.thText, { textAlign: 'right' }]}>IMPORTO</Text></View>
                <View style={styles.cGNote}><Text style={styles.thText}>NOTE A PENNA</Text></View>
              </View>
            )}

            {/* Righe delle prenotazioni del giorno */}
            {group.orders.map((o, idx) => {
              const parsed = parseOrderNotes(o.notes);
              const isLab = (t: any) => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');
              const admTix = o.tickets.filter(t => !isLab(t)).length;
              const youPickTix = o.tickets.filter(t => isLab(t)).length;
              const numPersone = admTix || o.tickets.length;
              const numBambini = parsed.children ?? 0;
              const numAdulti = Math.max(0, numPersone - numBambini);
              const shortId = `#${o.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
              const isEven = idx % 2 === 0;

              const { surnameFirst } = formatDisplayName(o.buyerName);

              // Attività singole e testo
              const actsLower = parsed.activities.map(a => a.toLowerCase());
              const hasZuccart = actsLower.some(a => a.includes('zuccart'));
              const hasZuccaVaso = actsLower.some(a => a.includes('vaso'));
              const hasFacepainting = actsLower.some(a => a.includes('facepainting') || a.includes('thriller'));

              let attivitaTesto = '—';
              if (parsed.activities.length > 0) {
                attivitaTesto = parsed.activities
                  .map(a => a.replace(/\s*\([^)]*\)/g, ''))
                  .join(', ');
              }

              // Stato pagamento
              const isPaid = o.status === 'PAID';
              const isOmaggio = isPaid && o.totalAmount === 0;

              // Stringa You Pick (come nell'allegato: '3', '1', o '0 —')
              const youPickDisplay = youPickTix > 0 ? `${youPickTix}` : '0';

              if (isZuccaland) {
                return (
                  <View
                    key={o.id}
                    style={[styles.row, isEven ? styles.rowEven : styles.rowOdd]}
                    wrap={false}
                  >
                    {/* DATA EVENTO */}
                    <View style={styles.cData}>
                      <Text style={styles.cellText}>{group.shortDate}</Text>
                    </View>

                    {/* PRENOTAZIONE (COGNOME Nome in evidenza con telefono) */}
                    <View style={styles.cName}>
                      <Text style={styles.nameBold}>{surnameFirst}</Text>
                      {o.buyerPhone ? <Text style={styles.subContact}>{o.buyerPhone}</Text> : null}
                    </View>

                    {/* N° ORDINE */}
                    <View style={styles.cId}>
                      <Text style={styles.idText}>{shortId}</Text>
                    </View>

                    {/* PERSONE */}
                    <View style={styles.cPersone}>
                      <Text style={[styles.nameBold, { textAlign: 'center' }]}>{numPersone}</Text>
                    </View>

                    {/* BAMBINI */}
                    <View style={styles.cBambini}>
                      <Text style={styles.cellTextCenter}>{numBambini}</Text>
                    </View>

                    {/* ADULTI */}
                    <View style={styles.cAdulti}>
                      <Text style={styles.cellTextCenter}>{numAdulti}</Text>
                    </View>

                    {/* YOU PICK LAB */}
                    <View style={styles.cYouPick}>
                      <Text style={styles.cellTextCenter}>{youPickDisplay}</Text>
                    </View>

                    {/* ATTIVITÀ PRENOTATE */}
                    <View style={styles.cAttivita}>
                      <Text style={styles.cellText}>{attivitaTesto}</Text>
                    </View>

                    {/* Zuccart */}
                    <View style={styles.cZuccart}>
                      {hasZuccart ? <CheckIcon /> : null}
                    </View>

                    {/* Zucca in Vaso */}
                    <View style={styles.cZuccaVaso}>
                      {hasZuccaVaso ? <CheckIcon /> : null}
                    </View>

                    {/* Facepainting */}
                    <View style={styles.cFacep}>
                      {hasFacepainting ? <CheckIcon /> : null}
                    </View>

                    {/* PAGATO */}
                    <View style={styles.cPagato}>
                      {isOmaggio ? (
                        <Text style={styles.omaggioText}>OMAGGIO</Text>
                      ) : isPaid ? (
                        <CheckIcon />
                      ) : (
                        <Text style={[styles.cellText, { color: '#b45309', fontSize: 6.5 }]}>{o.status}</Text>
                      )}
                    </View>

                    {/* IMPORTO */}
                    <View style={styles.cImporto}>
                      <Text style={styles.amountText}>€ {o.totalAmount.toFixed(2).replace('.', ',')}</Text>
                    </View>

                    {/* NOTE A PENNA */}
                    <View style={styles.cNote}>
                      <View style={styles.penLine} />
                    </View>
                  </View>
                );
              }

              // Evento Generico (es. Assaggia & Passeggia)
              const ticketDetail = o.tickets.map(t => t.type).join(', ');
              return (
                <View
                  key={o.id}
                  style={[styles.row, isEven ? styles.rowEven : styles.rowOdd]}
                  wrap={false}
                >
                  <View style={styles.cGData}>
                    <Text style={styles.cellText}>{group.shortDate}</Text>
                  </View>
                  <View style={styles.cGName}>
                    <Text style={styles.nameBold}>{surnameFirst}</Text>
                    {o.buyerPhone ? <Text style={styles.subContact}>{o.buyerPhone}</Text> : null}
                  </View>
                  <View style={styles.cGId}>
                    <Text style={styles.idText}>{shortId}</Text>
                  </View>
                  <View style={styles.cGPersone}>
                    <Text style={[styles.nameBold, { textAlign: 'center' }]}>{numPersone}</Text>
                  </View>
                  <View style={styles.cGBambini}>
                    <Text style={styles.cellTextCenter}>{numBambini}</Text>
                  </View>
                  <View style={styles.cGAdulti}>
                    <Text style={styles.cellTextCenter}>{numAdulti}</Text>
                  </View>
                  <View style={styles.cGDettaglio}>
                    <Text style={styles.cellText}>{ticketDetail}</Text>
                  </View>
                  <View style={styles.cGPagato}>
                    {isOmaggio ? (
                      <Text style={styles.omaggioText}>OMAGGIO</Text>
                    ) : isPaid ? (
                      <CheckIcon />
                    ) : (
                      <Text style={[styles.cellText, { color: '#b45309', fontSize: 6.5 }]}>{o.status}</Text>
                    )}
                  </View>
                  <View style={styles.cGImporto}>
                    <Text style={styles.amountText}>€ {o.totalAmount.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={styles.cGNote}>
                    <View style={styles.penLine} />
                  </View>
                </View>
              );
            })}

            {/* RIGA SUBTOTALE GIORNATA (Esattamente come in calce a ciascuna data nell'allegato) */}
            {isZuccaland ? (
              <View style={styles.totaleRow} wrap={false}>
                <View style={styles.cTotaleLabel}>
                  <Text style={styles.totaleLabel}>{totaleDateLabel}</Text>
                </View>
                <View style={styles.cPersone}>
                  <Text style={styles.totaleValue}>{dayPersone}</Text>
                </View>
                <View style={styles.cBambini}>
                  <Text style={styles.totaleValue}>{dayBambini}</Text>
                </View>
                <View style={styles.cAdulti}>
                  <Text style={styles.totaleValue}>{dayAdulti}</Text>
                </View>
                <View style={styles.cYouPick}>
                  <Text style={styles.totaleValue}>{dayYouPick}</Text>
                </View>
                <View style={styles.cAttivita} />
                <View style={styles.cZuccart} />
                <View style={styles.cZuccaVaso} />
                <View style={styles.cFacep} />
                <View style={styles.cPagato}>
                  <CheckIcon />
                </View>
                <View style={styles.cImporto}>
                  <Text style={styles.totaleImporto}>€ {dayIncasso.toFixed(2).replace('.', ',')}</Text>
                </View>
                <View style={styles.cNote} />
              </View>
            ) : (
              <View style={styles.totaleRow} wrap={false}>
                <View style={styles.cGTotaleLabel}>
                  <Text style={styles.totaleLabel}>{totaleDateLabel}</Text>
                </View>
                <View style={styles.cGPersone}>
                  <Text style={styles.totaleValue}>{dayPersone}</Text>
                </View>
                <View style={styles.cGBambini}>
                  <Text style={styles.totaleValue}>{dayBambini}</Text>
                </View>
                <View style={styles.cGAdulti}>
                  <Text style={styles.totaleValue}>{dayAdulti}</Text>
                </View>
                <View style={styles.cGDettaglio} />
                <View style={styles.cGPagato}>
                  <CheckIcon />
                </View>
                <View style={styles.cGImporto}>
                  <Text style={styles.totaleImporto}>€ {dayIncasso.toFixed(2).replace('.', ',')}</Text>
                </View>
                <View style={styles.cGNote} />
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}
