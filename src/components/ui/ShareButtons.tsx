'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Link2, Check } from 'lucide-react';

const FacebookIcon = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

interface ShareButtonsProps {
  title: string;
  text?: string;
}

export default function ShareButtons({ title, text }: ShareButtonsProps) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginRight: '0.5rem', fontWeight: 500 }}>
        Condividi:
      </span>

      <button
        onClick={shareOnFacebook}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
          border: 'none', background: '#1877F2', color: 'white',
          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
          transition: 'all 0.2s'
        }}
      >
        <FacebookIcon size={16} /> Facebook
      </button>
      
      <button
        onClick={shareOnWhatsApp}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
          border: 'none', background: '#25D366', color: 'white',
          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
          transition: 'all 0.2s'
        }}
      >
        <MessageCircle size={16} /> WhatsApp
      </button>

      <button
        onClick={handleCopyLink}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
          border: '1px solid var(--neutral-700)', background: 'transparent',
          color: 'var(--neutral-300)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
          transition: 'all 0.2s'
        }}
      >
        {copied ? <Check size={16} style={{ color: 'var(--gold-500)' }} /> : <Link2 size={16} />}
        {copied ? 'Copiato!' : 'Copia Link'}
      </button>
    </div>
  );
}
