import type { Metadata } from 'next';
import Showcase from './Showcase';

export const metadata: Metadata = { title: 'Design system · Admin', robots: { index: false } };

// /admin/_ui: vetrina del design system (prompt 05). Come tutto /admin richiede la sessione admin
// (src/proxy.ts); la cartella si chiama %5Fui perché le cartelle che iniziano con "_" sono private.
export default function DesignSystemPage() {
  return <Showcase />;
}
