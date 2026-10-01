import type { Metadata } from 'next';
import ZuccalandPhotoClient from './ZuccalandPhotoClient';

export const metadata: Metadata = {
  title: 'Scatta la tua foto – Zuccaland 2026',
  description: 'Carica o scatta la tua foto e aggiungila all\'album magico di Zuccaland!',
};

export default function ZuccalandPhotoPage() {
  return <ZuccalandPhotoClient />;
}
