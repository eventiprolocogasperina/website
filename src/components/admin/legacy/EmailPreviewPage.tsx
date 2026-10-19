'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function EmailPreviewPage() {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/orders/thankyou-preview')
      .then(res => res.text())
      .then(data => setHtml(data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--white)' }}>
        Anteprima Email di Ringraziamento
      </h1>
      <p style={{ color: 'var(--neutral-400)', marginBottom: '1rem' }}>
        Ecco come apparirà l'email inviata agli acquirenti (Esempio: Assaggia & Passeggia).
      </p>
      
      <div style={{ flex: 1, background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        {html ? (
          <iframe 
            srcDoc={html} 
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Email Preview"
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--neutral-500)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
