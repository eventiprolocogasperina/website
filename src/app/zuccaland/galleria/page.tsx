import type { Metadata } from 'next';
import ZuccalandGalleryClient from './ZuccalandGalleryClient';

export const metadata: Metadata = {
  title: 'Galleria – Zuccaland 2026',
  description: 'Le foto più belle scattate dai partecipanti di Zuccaland 2026!',
};

export default function ZuccalandGalleryPage() {
  return <ZuccalandGalleryClient />;
}
