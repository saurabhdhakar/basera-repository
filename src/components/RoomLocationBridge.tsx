import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocationSelection } from './LocationSelection';
import { PropertyMap } from './PropertyMap';
import type { SelectedLocation } from '@/lib/ola-location';
import { normalizeOlaPlace } from '@/lib/ola-location';
import locationCss from './LocationSelection.css?url';
import roomCss from './RoomLocation.css?url';
import mapCss from 'maplibre-gl/dist/maplibre-gl.css?url';

export function RoomLocationBridge({ document: doc }: { document: Document }) {
  const [formVersion, setFormVersion] = useState(0);
  const [mapTarget, setMapTarget] = useState<HTMLElement | null>(null);
  const [mapLocation, setMapLocation] = useState<SelectedLocation | null>(null);
  useEffect(() => {
    const links = [locationCss, roomCss, mapCss].map(href => {
      const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = href; doc.head.append(link); return link;
    });
    const reset = () => setFormVersion(value => value + 1);
    const detail = (event: Event) => {
      const value = (event as CustomEvent<{ location?: SelectedLocation; latitude?: number; longitude?: number; address?: string; locality?: string; city?: string; state?: string }>).detail;
      const saved = value?.location || value;
      const normalized = normalizeOlaPlace({ formatted_address: saved?.address || [value?.locality, value?.city].filter(Boolean).join(', '), geometry: { location: { lat: saved?.latitude, lng: saved?.longitude } } });
      setMapLocation(normalized); setMapTarget(doc.getElementById('roomPropertyMap'));
    };
    const close = () => setMapTarget(null);
    doc.addEventListener('basera-post-reset', reset);
    doc.addEventListener('basera-property-map', detail);
    doc.addEventListener('basera-detail-close', close);
    return () => { links.forEach(link => link.remove()); doc.removeEventListener('basera-post-reset', reset); doc.removeEventListener('basera-property-map', detail); doc.removeEventListener('basera-detail-close', close); };
  }, [doc]);
  const field = doc.getElementById('roomLocationField');
  return <>
    {field && createPortal(<LocationSelection key={formVersion} inline onDone={() => {}} onSelect={location => doc.dispatchEvent(new CustomEvent('basera-room-location', { detail: location }))} />, field)}
    {mapTarget && createPortal(<PropertyMap location={mapLocation} />, mapTarget)}
  </>;
}