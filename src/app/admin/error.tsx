'use client';

import ErrorView from '@/components/errors/ErrorView';

export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} homeHref="/admin" homeLabel="Torna alla dashboard" />;
}
