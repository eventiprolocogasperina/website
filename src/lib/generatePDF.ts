import { jsPDF } from 'jspdf';

interface SubscriptionData {
  nome: string;
  cognome: string;
  luogoNascita: string;
  provNascita: string;
  dataNascita: string;
  residenza: string;
  provResidenza: string;
  cap: string;
  indirizzo: string;
  civico: string;
  codiceFiscale: string;
  cellulare: string;
  email: string;
  tipoSocio: string;
  quotaSostenitore: string;
}

export function generateSubscriptionPDF(data: SubscriptionData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const MARGIN = 20;
  const CW = W - MARGIN * 2; // content width
  let y = 18;

  const anno = new Date().getFullYear();
  const quotaBase = 20;
  const quotaExtra = data.tipoSocio === 'sostenitore' && data.quotaSostenitore ? parseInt(data.quotaSostenitore) : 0;
  const quotaTotale = quotaBase + quotaExtra;
  const dataNascitaFormatted = data.dataNascita
    ? new Date(data.dataNascita + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  // ── Header ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRO LOCO', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(14);
  doc.text('GASPERINA', W / 2, y, { align: 'center' });
  y += 10;

  // Title box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(MARGIN, y, CW, 18, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MODULO DI RICHIESTA DI ISCRIZIONE ALL\'ASSOCIAZIONE', W / 2, y + 6, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`PRO LOCO DI GASPERINA APS PER L'ANNO ${anno}`, W / 2, y + 12, { align: 'center' });

  // Richiesta N.
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`RICHIESTA N. ____ / ${anno}`, W - MARGIN - 2, y + 16, { align: 'right' });
  y += 26;

  // ── Sottotitolo ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IL/LA SOTTOSCRITTO/A', W / 2, y, { align: 'center' });
  y += 8;

  // ── Helper functions ──
  const drawField = (label: string, value: string, x: number, fieldY: number, w: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x, fieldY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(value || '', x, fieldY + 5);
    doc.setDrawColor(180, 180, 180);
    doc.line(x, fieldY + 6.5, x + w, fieldY + 6.5);
  };

  // Row 1: Nome e Cognome
  drawField('Nome e Cognome', `${data.nome} ${data.cognome}`, MARGIN, y, CW);
  y += 14;

  // Row 2: Nato/a - Prov - il
  const col1 = CW * 0.5;
  const col2 = 25;
  const col3 = CW - col1 - col2;
  drawField('Nato/a', data.luogoNascita, MARGIN, y, col1 - 3);
  drawField('Prov.', data.provNascita, MARGIN + col1, y, col2 - 3);
  drawField('il', dataNascitaFormatted, MARGIN + col1 + col2, y, col3);
  y += 14;

  // Row 3: Residente a - Prov - CAP
  drawField('Residente a', data.residenza, MARGIN, y, col1 - 3);
  drawField('Prov.', data.provResidenza, MARGIN + col1, y, col2 - 3);
  drawField('CAP', data.cap, MARGIN + col1 + col2, y, col3);
  y += 14;

  // Row 4: Indirizzo + N.
  const addrW = CW * 0.8;
  drawField('In via', data.indirizzo, MARGIN, y, addrW - 3);
  drawField('N.', data.civico, MARGIN + addrW, y, CW - addrW);
  y += 14;

  // Row 5: C.F. - Cellulare - Email
  const thirdW = CW / 3;
  drawField('C.F.', data.codiceFiscale.toUpperCase(), MARGIN, y, thirdW - 3);
  drawField('Cellulare', data.cellulare, MARGIN + thirdW, y, thirdW - 3);
  drawField('E-mail', data.email, MARGIN + thirdW * 2, y, thirdW);
  y += 18;

  // ── Dichiarazione ──
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const declaration = 'Presa visione dello Statuto dell\'Associazione Pro Loco di Gasperina APS, accettato integralmente in ogni sua parte e tenuto conto, in particolare, delle finalità dell\'Associazione (art. 2) nella volontà di voler contribuire attivamente alla loro realizzazione,';
  const declLines = doc.splitTextToSize(declaration, CW);
  doc.text(declLines, MARGIN, y);
  y += declLines.length * 3.5 + 2;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CHIEDE DI ADERIRE ALL\'ASSOCIAZIONE IN QUALITÀ DI', W / 2, y, { align: 'center' });
  y += 10;

  // ── Tipo Socio boxes ──
  const boxW = CW / 2 - 5;

  // Ordinario
  doc.setDrawColor(27, 75, 170);
  doc.roundedRect(MARGIN, y, boxW, 18, 2, 2, 'S');
  if (data.tipoSocio === 'ordinario') {
    doc.setFillColor(27, 75, 170);
    doc.roundedRect(MARGIN + 3, y + 3, 6, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('✓', MARGIN + 5, y + 7.5);
  } else {
    doc.roundedRect(MARGIN + 3, y + 3, 6, 6, 1, 1, 'S');
  }
  doc.setTextColor(27, 75, 170);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SOCIO ORDINARIO', MARGIN + 12, y + 7.5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('quota annuale €20', MARGIN + 12, y + 13);

  // Sostenitore
  const sosX = MARGIN + boxW + 10;
  doc.setDrawColor(27, 75, 170);
  doc.roundedRect(sosX, y, boxW, 18, 2, 2, 'S');
  if (data.tipoSocio === 'sostenitore') {
    doc.setFillColor(27, 75, 170);
    doc.roundedRect(sosX + 3, y + 3, 6, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('✓', sosX + 5, y + 7.5);
  } else {
    doc.roundedRect(sosX + 3, y + 3, 6, 6, 1, 1, 'S');
  }
  doc.setTextColor(27, 75, 170);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SOCIO SOSTENITORE', sosX + 12, y + 7.5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`quota annuale €20 + €${quotaExtra}`, sosX + 12, y + 13);
  y += 26;

  // ── Quota totale ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('E A TAL FINE VERSA LA QUOTA CONVENUTA TOTALE', W / 2, y, { align: 'center' });
  y += 5;
  doc.text(`DI € ${quotaTotale} AL MOMENTO DELLA SOTTOSCRIZIONE DEL PRESENTE MODULO.`, W / 2, y, { align: 'center' });
  y += 10;

  // ── Note validità ──
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text("L'iscrizione si intende effettiva al momento della comunicazione dell'accettazione da parte del Consiglio Direttivo.", MARGIN, y);
  y += 4;
  const validityNote = `L'iscrizione, nonché la tessera UNPLI, è valida fino al 31 dicembre ${anno}: il rinnovo per l'anno successivo avverrà senza ulteriori formalità mediante la corresponsione della quota annuale stabilita dall'Associazione.`;
  const validityLines = doc.splitTextToSize(validityNote, CW);
  doc.setFont('helvetica', 'bold');
  doc.text(validityLines, MARGIN, y);
  y += validityLines.length * 3.5 + 8;

  // ── Luogo e data + firma ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`GASPERINA (CZ), il ${today}`, MARGIN, y);
  doc.text('Il/la richiedente', W - MARGIN, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(180, 180, 180);
  doc.line(W - MARGIN - 55, y + 1, W - MARGIN, y + 1);
  y += 14;

  // ── Informativa Privacy ──
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 5;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Informativa ex art. 13 D. Lgs 30.06.2003 n. 196 "Codice in materia di protezione dei dati personali"', MARGIN, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  const privacyText = 'I dati personali raccolti con il presente questionario anagrafico verranno trattati per esclusive finalità associative, gestionali e statistiche. L\'acquisizione dei dati personali è presupposto per lo svolgimento dei rapporti cui l\'acquisizione è finalizzata. I dati potranno essere comunicati esclusivamente per motivi associativi alle altre Pro Loco aderenti UNPLI, ed alle strutture organizzative UNPLI. Il trattamento sarà svolto manualmente (es. compilazione di registri, libri sociali ecc.) ed eventualmente anche mediante strumenti elettronici e previa adozione delle misure minime e idonee di sicurezza prescritte dall\'art. 31 e seg. T.U. e dall\'allegato Disciplinare Tecnico. Diritti dell\'interessato: nella qualità di interessato sono garantiti tutti i diritti specificati all\'art. 7 T.U. Il titolare inoltre ha diritto di opporsi, in tutto o in parte, per motivi legittimi, al trattamento dei dati personali che lo riguardano, ancorché pertinenti allo scopo della raccolta. Titolare del trattamento dei dati e responsabile è il Presidente della Pro Loco di Gasperina APS.';
  const privLines = doc.splitTextToSize(privacyText, CW);
  doc.text(privLines, MARGIN, y);
  y += privLines.length * 2.5 + 5;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Consenso al trattamento dei dati raccolti', MARGIN, y);
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  const consentText = 'Con la sottoscrizione della presente si consente il trattamento dei dati raccolti per le attività statutarie della Pro Loco di Gasperina e dell\'UNPLI.';
  doc.text(consentText, MARGIN, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Il/la richiedente', W - MARGIN, y, { align: 'right' });
  y += 3;
  doc.line(W - MARGIN - 55, y + 1, W - MARGIN, y + 1);
  y += 12;

  // ── Footer ──
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 4;
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text('Associazione Pro Loco di Gasperina APS — Sede legale in Gasperina (CZ), via Raffaele Milano, SNC - C.F. 99330790793 - Contatti: 3279783232 oppure prolocogasperina@gmail.com', W / 2, y, { align: 'center' });

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
