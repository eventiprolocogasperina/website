'use client';

import { motion, MotionConfig, useReducedMotion, type HTMLMotionProps, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

/*
 * Movimento delle pagine pubbliche dei format (guida di design P0.5), come in ZuccalandClient.tsx di produzione:
 * ingressi fade-up, molla per i pop-in, whileTap sui pulsanti. Con prefers-reduced-motion MotionConfig
 * (reducedMotion="user") toglie spostamenti e scale e lascia solo le dissolvenze.
 */

/** Molla morbida (bounce .35): ingressi di card, icone che ruotano, pop-in. */
export const spring: Transition = { type: 'spring', bounce: 0.35, duration: 0.5 };
/** Molla più viva per pulsanti e contatori. */
export const springTap: Transition = { type: 'spring', stiffness: 500, damping: 22 };
export const easeSmooth = [0.4, 0, 0.2, 1] as const;

/** Da mettere una volta in cima alla pagina: rispetta prefers-reduced-motion per tutti i figli. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

type RevealProps = HTMLMotionProps<'div'> & { delay?: number; y?: number };

/** Ingresso in dissolvenza dal basso (fadeUp di produzione, più breve: 0.5 s). */
export function Reveal({ delay = 0, y = 16, children, ...props }: RevealProps) {
  return (
    <motion.div initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeSmooth, delay }} {...props}>
      {children}
    </motion.div>
  );
}

/** Ingresso con scala a molla (scaleIn): logo, check della conferma. */
export function PopIn({ delay = 0, children, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay }} {...props}>
      {children}
    </motion.div>
  );
}

/** Ritardo dello stagger tra card (60–80 ms come in produzione). */
export const stagger = (i: number, base = 0) => base + Math.min(i, 8) * 0.07;

/**
 * Icone del format che cadono lentamente sullo sfondo (FallingPumpkins di produzione, più sobrie):
 * poche, trasparenti, solo da desktop e mai con prefers-reduced-motion.
 */
export function FallingMarks({ src, count = 8 }: { src: string; count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden lg:block">
      {Array.from({ length: count }, (_, i) => {
        // Posizioni deterministiche (niente Math.random): stesso HTML sul server e nel browser.
        const left = (i * 37 + 7) % 100;
        const size = 36 + ((i * 23) % 40);
        const duration = 22 + ((i * 7) % 14);
        return (
          <motion.img
            key={i}
            src={src}
            alt=""
            width={size}
            height={size}
            className="absolute -top-24 object-contain opacity-[0.12]"
            style={{ left: `${left}%` }}
            animate={{ y: ['0vh', '120vh'], rotate: [0, i % 2 ? 360 : -360] }}
            transition={{ duration, repeat: Infinity, ease: 'linear', delay: (i * 3) % 13 }}
          />
        );
      })}
    </div>
  );
}
