import type { Metadata } from 'next';
import AdminZuccalandPhotos from './AdminZuccalandPhotos';

export const metadata: Metadata = {
  title: 'Moderazione Foto Zuccaland – Admin',
};

export default function AdminZuccalandPhotosPage() {
  return <AdminZuccalandPhotos />;
}
