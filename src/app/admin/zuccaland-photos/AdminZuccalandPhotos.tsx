'use client';

import { useState, useEffect } from 'react';
import { CldImage } from 'next-cloudinary';
import { Loader2, Check, X, Filter } from 'lucide-react';

type Photo = {
  id: number;
  cloudinary_public_id: string;
  frame_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function AdminZuccalandPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/zuccaland-photos');
      const data = await res.json();
      setPhotos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const res = await fetch(`/api/admin/zuccaland-photos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPhotos(photos.map(p => p.id === id ? { ...p, status: newStatus } : p));
      }
    } catch (error) {
      console.error(error);
      alert('Errore aggiornamento');
    }
  };

  const filteredPhotos = filter === 'all' ? photos : photos.filter(p => p.status === filter);

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f} ({photos.filter(p => f === 'all' || p.status === f).length})
          </button>
        ))}
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="text-center p-10 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
          Nessuna foto trovata in questa categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map(photo => (
            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="relative aspect-square w-full bg-gray-100">
                <CldImage
                  src={photo.cloudinary_public_id}
                  width="400"
                  height="400"
                  crop="fill"
                  alt={`Photo ${photo.id}`}
                  sizes="400px"
                  overlays={[{
                    publicId: photo.frame_name,
                    flags: ['relative'],
                    width: '1.0',
                    height: '1.0',
                  }]}
                />
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>ID: {photo.id}</span>
                  <span>{new Date(photo.created_at).toLocaleDateString('it-IT')}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  {photo.status !== 'approved' && (
                    <button 
                      onClick={() => updateStatus(photo.id, 'approved')}
                      className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 py-2 rounded-lg flex justify-center items-center gap-1 font-semibold transition-colors"
                    >
                      <Check className="w-4 h-4" /> Approva
                    </button>
                  )}
                  {photo.status !== 'rejected' && (
                    <button 
                      onClick={() => updateStatus(photo.id, 'rejected')}
                      className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-2 rounded-lg flex justify-center items-center gap-1 font-semibold transition-colors"
                    >
                      <X className="w-4 h-4" /> Rifiuta
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
