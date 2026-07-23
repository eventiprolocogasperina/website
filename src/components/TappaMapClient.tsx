'use client';

import dynamic from 'next/dynamic';

const MapInner = dynamic(() => import('./TappaMapInner'), { ssr: false });

export default function TappaMapClient(props: any) {
  return <MapInner {...props} />;
}
