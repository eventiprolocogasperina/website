import { Inter, Outfit } from 'next/font/google';

// Font dei format che non sono già caricati da globals.css (Cormorant Garamond e DM Sans lo sono):
// Outfit e Inter di Assaggia e Passeggia, come in produzione (edizione-2026/layout.tsx). Le variabili
// --font-outfit e --font-inter si usano tramite --ev-font-display/--ev-font-body (src/lib/edition-theme.ts).
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const brandFontVariables = `${outfit.variable} ${inter.variable}`;
