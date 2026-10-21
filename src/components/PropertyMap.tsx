import { useEffect, useRef, useState } from 'react';
import { tileProxyUrl } from '@/lib/ola-tiles';
import { normalizeOlaPlace, type SelectedLocation } from '@/lib/ola-location';
import { Button } from '@/components/ui/button';

export function PropertyMap({ location }: { location: SelectedLocation | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!location || !container.current) return;
    if (!normalizeOlaPlace({ formatted_address: location.address, geometry: { location: { lat: location.latitude, lng: location.longitude } } })) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setStatus('loading');
    void import('maplibre-gl').then(({ Map, Marker, NavigationControl, AttributionControl }) => {
      if (cancelled || !container.current) return;
      const map = new Map({ container: container.current, style: tileProxyUrl('/tiles/vector/v1/styles/default-light-standard/style.json'),
        center: [location.longitude, location.latitude], zoom: 15, attributionControl: false, cooperativeGestures: true });
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new AttributionControl({ customAttribution: '© Ola Maps', compact: false }));
      const pin = container.current.ownerDocument.createElement('div');
      pin.className = 'ola-property-pin'; pin.textContent = '📍'; pin.setAttribute('aria-label', location.address);
      new Marker({ element: pin, anchor: 'bottom' }).setLngLat([location.longitude, location.latitude]).addTo(map);
      map.on('load', () => { if (!cancelled) { map.resize(); setStatus('ready'); } });
      map.on('error', () => { if (!cancelled) setStatus('error'); });
      const resize = new ResizeObserver(() => map.resize()); resize.observe(container.current);
      dispose = () => { resize.disconnect(); map.remove(); };
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; dispose?.(); };
  }, [location, attempt]);
  if (!location) return <p className="room-map-note">Exact location has not been added to this listing.</p>;
  return <div className="room-map-wrap">
    <div ref={container} className="room-map" aria-label={`Property map: ${location.address}`} />
    {status !== 'ready' && <div className="room-map-status" role="status">{status === 'loading' ? 'Loading map…' : <>Map unavailable. <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry</Button></>}</div>}
    <p className="room-map-note">{location.address}</p>
  </div>;
}