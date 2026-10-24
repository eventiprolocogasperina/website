'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Review {
  id: string;
  eventId: string;
  name: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', marginBottom: '2rem', color: 'var(--white)' }}>
        Recensioni Eventi
      </h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--neutral-500)' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-500)', background: 'var(--neutral-900)', borderRadius: '1rem', border: '1px dashed var(--neutral-800)' }}>
          Nessuna recensione ancora ricevuta.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map(review => (
            <div key={review.id} style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={18} style={{ color: review.rating >= star ? 'var(--gold-400)' : 'var(--neutral-700)', fill: review.rating >= star ? 'var(--gold-400)' : 'none' }} />
                    ))}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', color: 'white', margin: 0 }}>
                    {review.name || 'Anonimo'} <span style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>({review.eventId})</span>
                  </h3>
                </div>
                <div style={{ color: 'var(--neutral-500)', fontSize: '0.85rem' }}>
                  {format(new Date(review.createdAt), 'dd MMM yyyy, HH:mm', { locale: it })}
                </div>
              </div>
              
              {review.comment && (
                <p style={{ color: 'var(--neutral-300)', lineHeight: 1.6, margin: 0, padding: '1rem', background: 'var(--neutral-950)', borderRadius: '0.5rem' }}>
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
