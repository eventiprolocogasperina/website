import { Anton, Figtree } from 'next/font/google';

// Sito pubblico v3: Anton per i titoli, Figtree per il testo (ARCHITETTURA §14.2, registro decisioni).
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-v3-display', display: 'swap' });
const body = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-v3-body', display: 'swap' });

/** Classi da mettere su ogni contenitore `.v3` (intestazione, pagina, piè di pagina). */
export const v3Fonts = `${display.variable} ${body.variable}`;
