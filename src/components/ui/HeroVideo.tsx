'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface HeroVideoProps {
  videoId: string | null;
  bgImageUrl: string;
}

export default function HeroVideo({ videoId, bgImageUrl }: HeroVideoProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMute = () => {
    if (!iframeRef.current?.contentWindow) return;
    
    // Command YouTube player via postMessage API
    const command = isMuted ? 'unMute' : 'mute';
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }), 
      '*'
    );
    setIsMuted(!isMuted);
  };

  if (!videoId) {
    return (
       <img src={bgImageUrl} alt="Assaggia e Passeggia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    );
  }

  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', /* IMPORTANT: Prevents user from pausing the video by clicking */
      }}>
        {isMounted && (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&enablejsapi=1`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Mute Toggle Button */}
      <button 
        onClick={toggleMute}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          width: '46px',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
          outline: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
        title={isMuted ? "Attiva audio" : "Disattiva audio"}
        aria-label={isMuted ? "Attiva audio" : "Disattiva audio"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </>
  );
}
