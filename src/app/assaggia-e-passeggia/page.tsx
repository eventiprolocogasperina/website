'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Loader2 } from 'lucide-react';

export default function AssaggiaGraziePage() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    
    setIsSubmitting(true);
    setReviewStatus('idle');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'assaggia-passeggia',
          name: reviewName,
          rating,
          comment: reviewComment
        })
      });
      if (!res.ok) throw new Error('Errore server');
      setReviewStatus('success');
      setTimeout(() => setShowReviewForm(false), 3000);
    } catch (e) {
      setReviewStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then((data: any[]) => {
        // Prefer images tagged with "assaggia"
        const evImages = data.filter(d => d.category === 'assaggia').map(d => d.src);
        if (evImages.length > 0) {
          setImages(evImages);
        } else {
          // Fallback to all images (excluding videos)
          const allImages = data.filter(d => d.category !== 'video').map(d => d.src);
          if (allImages.length > 0) {
            setImages(allImages);
          } else {
            // Ultimate fallback hardcoded images just in case
            setImages([
              "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1555507036-ab1f40ce88cb?q=80&w=2940&auto=format&fit=crop"
            ]);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>
      
      {/* Background Slideshow */}
      <AnimatePresence mode="sync">
        {images.length > 0 && (
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt="Assaggia & Passeggia"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0
            }}
          />
        )}
      </AnimatePresence>

      {/* Opacized black overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1,
      }} />

      {/* Centered Big Text */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'clamp(4rem, 15vw, 10rem)', 
            fontWeight: 700, 
            color: 'var(--gold-400)',
            letterSpacing: '0.02em',
            margin: 0,
            textShadow: '0 10px 30px rgba(0,0,0,0.8)'
          }}
        >
          Grazie!
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.0 }}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            color: 'rgba(255,255,255,0.9)',
            marginTop: '1rem',
            maxWidth: '700px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            lineHeight: 1.5
          }}
        >
          L'edizione di Assaggia & Passeggia è stata un successo.<br/>
          Ci vediamo il prossimo anno per brindare ancora insieme.
        </motion.p>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1, delay: 1.5 }}
           style={{ marginTop: '3.5rem', pointerEvents: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <a href="/" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', padding: '0.8rem 2rem' }}>
            Torna alla Home
          </a>
          <button 
            onClick={() => setShowReviewForm(true)} 
            className="btn btn-primary" 
            style={{ padding: '0.8rem 2rem' }}
          >
            Lascia una Recensione
          </button>
        </motion.div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '450px', position: 'relative' }}
            >
              <button 
                onClick={() => setShowReviewForm(false)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>

              {reviewStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Star size={48} style={{ color: 'var(--gold-500)', margin: '0 auto 1rem', fill: 'var(--gold-500)' }} />
                  <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>Grazie!</h3>
                  <p style={{ color: 'var(--neutral-400)' }}>Il tuo feedback è preziosissimo per noi.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'white', margin: 0 }}>La tua esperienza</h3>
                  <p style={{ color: 'var(--neutral-400)', fontSize: '0.9rem', margin: 0 }}>Raccontaci come è andata ad Assaggia & Passeggia.</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'transform 0.1s' }}
                      >
                        <Star 
                          size={36} 
                          style={{ 
                            color: (hoverRating || rating) >= star ? 'var(--gold-400)' : 'var(--neutral-700)',
                            fill: (hoverRating || rating) >= star ? 'var(--gold-400)' : 'none'
                          }} 
                        />
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="label" style={{ color: 'var(--neutral-300)' }}>Nome (Opzionale)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Il tuo nome" 
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                      style={{ background: 'var(--neutral-950)' }}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ color: 'var(--neutral-300)' }}>Cosa ti è piaciuto di più?</label>
                    <textarea 
                      className="input" 
                      rows={4} 
                      placeholder="Scrivi qui..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      style={{ background: 'var(--neutral-950)' }}
                    />
                  </div>

                  {reviewStatus === 'error' && (
                    <div style={{ color: '#f87171', fontSize: '0.9rem' }}>C'è stato un problema. Riprova.</div>
                  )}

                  <button 
                    type="submit" 
                    disabled={rating === 0 || isSubmitting}
                    className="btn btn-primary"
                    style={{ justifyContent: 'center', marginTop: '1rem' }}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Invia Recensione'}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
