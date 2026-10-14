import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
import { ScannerGuideDocument } from '../src/lib/manuals/ScannerGuidePdf';
import { CashierGuideDocument } from '../src/lib/manuals/CashierGuidePdf';

async function main() {
  const outputDir = path.join(process.cwd(), 'public', 'manuali');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating Scanner Guide PDF...');
  const scannerPdfPath = path.join(outputDir, 'guida-scanner-biglietti.pdf');
  await ReactPDF.renderToFile(<ScannerGuideDocument />, scannerPdfPath);
  console.log(`✓ Scanner Guide created at: ${scannerPdfPath}`);

  console.log('Generating Cashier Guide PDF...');
  const cashierPdfPath = path.join(outputDir, 'guida-cassa.pdf');
  await ReactPDF.renderToFile(<CashierGuideDocument />, cashierPdfPath);
  console.log(`✓ Cashier Guide created at: ${cashierPdfPath}`);

  console.log('All PDF manuals successfully generated!');
}

main().catch((err) => {
  console.error('Error generating manuals:', err);
  process.exit(1);
});
