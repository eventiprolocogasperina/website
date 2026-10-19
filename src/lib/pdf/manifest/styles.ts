// Stili del registro presenze A4 orizzontale (estratti da BookingManifestPdf.tsx con il prompt 12, invariati).
import { StyleSheet } from '@react-pdf/renderer';

// Definizioni larghezze colonne per A4 Landscape (Larghezza pagina = 842pt, Margini = 16pt x 2 => Utile = 810pt)
export const colWidths = {
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
export const colWidthsGeneric = {
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

export const styles = StyleSheet.create({
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
