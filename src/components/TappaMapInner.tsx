'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

interface TappaMapInnerProps {
  lat: number;
  lng: number;
  themeColor: string;
  locationName: string;
  mapUrl: string;
}

export default function TappaMapInner({ lat, lng, themeColor, locationName, mapUrl }: TappaMapInnerProps) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '1.5rem', boxShadow: '0 15px 30px rgba(0,0,0,0.06)', marginBottom: '2rem', height: '300px', zIndex: 1 }}>
      <MapContainer center={[lat, lng]} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Marker ref={markerRef} position={[lat, lng]} icon={
          new L.DivIcon({
            html: `<div style="background-color: ${themeColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }>
          <Popup closeButton={false}>
            <strong style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>{locationName}</strong>
          </Popup>
        </Marker>
      </MapContainer>
      <a href={mapUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '0.75rem 1.25rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a', fontWeight: 600, fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textDecoration: 'none', zIndex: 1000, cursor: 'pointer' }}>
        <MapPin size={18} color={themeColor} />
        Apri Navigatore
      </a>
    </div>
  );
}
