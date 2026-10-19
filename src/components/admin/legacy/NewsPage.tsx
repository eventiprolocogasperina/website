'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import NewsForm from '@/components/admin/NewsForm';
import type { NewsArticle } from '@/lib/data/news';

export default function AdminNotiziePage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNews, setEditingNews] = useState<NewsArticle | null | 'new'>(null);

  const fetchNews = () => {
    setLoading(true);
    fetch('/api/news')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setNews(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchNews(); }, []);

  return (
    <div>
      <AdminHeader
        title="Notizie"
        actions={
          <button onClick={() => setEditingNews('new')} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}>
            + Nuova notizia
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '1rem' }}>{news.length} notizie totali</p>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titolo</th>
                  <th>Data Pubblicazione</th>
                  <th>In Evidenza</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {news.map(n => (
                  <tr key={n.id}>
                    <td style={{ color: 'var(--color-heading)', fontWeight: 500 }}>{n.title}</td>
                    <td>{new Date(n.publishedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td><span style={{ color: n.featured ? '#4ade80' : 'var(--neutral-400)', fontSize: '0.82rem' }}>{n.featured ? 'Sì' : 'No'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/notizie/${n.slug}`} target="_blank" style={{ fontSize: '0.78rem', color: 'var(--blue-500)', textDecoration: 'underline' }}>Vedi</Link>
                        <button onClick={() => setEditingNews(n)} style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }}>Modifica</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {news.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--neutral-500)', padding: '2rem' }}>Nessuna notizia presente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingNews && (
        <NewsForm
          initialData={editingNews === 'new' ? undefined : editingNews}
          onClose={() => setEditingNews(null)}
          onSave={() => { setEditingNews(null); fetchNews(); }}
          onDelete={async (id) => {
            if (!confirm('Eliminare questa notizia?')) return;
            await fetch(`/api/news/${id}`, { method: 'DELETE' });
            setEditingNews(null);
            fetchNews();
          }}
        />
      )}
    </div>
  );
}
