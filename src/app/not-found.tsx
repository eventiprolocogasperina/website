'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

export default function NotFound() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#1A1C29' : '#F9F3E4';
  const textColor = isDark ? 'white' : '#1a1a1a';
  const subtitleColor = isDark ? '#a0aabf' : '#555555';
  const textGradient = isDark 
    ? 'linear-gradient(135deg, #ffffff 0%, #a0aabf 100%)' 
    : 'linear-gradient(135deg, #283983 0%, #1a1a1a 100%)';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: bgColor,
      color: textColor,
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem',
      textAlign: 'center',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      
      {/* Decorative blurred blobs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'rgba(232, 192, 66, 0.15)', // Pro Loco gold
        borderRadius: '50%',
        filter: 'blur(100px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: '300px',
        height: '300px',
        background: 'rgba(40, 57, 131, 0.4)', // Pro Loco blue
        borderRadius: '50%',
        filter: 'blur(100px)',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              fontSize: 'clamp(5rem, 15vw, 12rem)', 
              fontWeight: 800, 
              fontFamily: 'var(--font-display)',
              lineHeight: 1,
              background: textGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            4
          </motion.span>

          {/* Central Logo instead of the '0' */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
            transition={{ 
              scale: { duration: 0.5, ease: 'backOut' },
              rotate: { repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }
            }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <img 
              src="/img/logo_SIMBOLO.png" 
              alt="0" 
              style={{ 
                height: 'clamp(4.5rem, 14vw, 11rem)', 
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.3))'
              }} 
            />
          </motion.div>

          <motion.span 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              fontSize: 'clamp(5rem, 15vw, 12rem)', 
              fontWeight: 800, 
              fontFamily: 'var(--font-display)',
              lineHeight: 1,
              background: textGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            4
          </motion.span>
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
            color: subtitleColor,
            marginBottom: '3rem',
            fontWeight: 500,
            maxWidth: '600px'
          }}
        >
          Questa pagina non esiste... ma magari possiamo crearla insieme.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/iscriviti" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#E8C042',
            color: '#1a1a1a',
            padding: '1.2rem 3rem',
            borderRadius: '999px',
            fontSize: '1.1rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'transform 0.2s, background 0.2s',
            boxShadow: '0 10px 30px rgba(232, 192, 66, 0.2)',
          }}>
            Iscriviti alla Pro Loco
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
