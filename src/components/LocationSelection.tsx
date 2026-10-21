import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Check, Crosshair, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { autocompleteLocations, resolveLocation } from '@/lib/ola-location.functions';
import { useLocationState } from './LocationState';
import type { LocationSuggestion, SelectedLocation } from '@/lib/ola-location';
import './PreHomeAuth.css';
import './LocationSelection.css';

export function LocationSelection({ onDone, onSelect, inline = false }: { onDone: () => void; onSelect?: (location: SelectedLocation | null) => void; inline?: boolean }) {
  const { location, select } = useLocationState();
  const autocomplete = useServerFn(autocompleteLocations);
  const resolve = useServerFn(resolveLocation);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [busy, setBusy] = useState<'search' | 'gps' | 'place' | null>(null);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState<SelectedLocation | null>(inline ? null : location);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const version = useRef(0);
  const alive = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { alive.current = true; input.current?.focus(); return () => { alive.current = false; version.current++; }; }, []);
  useEffect(() => {
    if (chosen && query === chosen.address) return;
    if (query.trim().length < 2) { setSuggestions([]); setSearched(false); return; }
    const id = version.current;
    const timer = window.setTimeout(async () => {
      setBusy('search');
      try {
        const result = await autocomplete({ data: { query: query.trim() } });
        if (!alive.current || id !== version.current) return;
        setSuggestions(result.data); setError(result.error || ''); setSearched(true); setBusy(null);
      } catch {
        if (alive.current && id === version.current) { setError('Location search is unavailable. Please try again.'); setBusy(null); }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, chosen, autocomplete]);

  const commit = (value: SelectedLocation) => {
    setChosen(value); setQuery(value.address); setSuggestions([]); setBusy(null); setError('');
    if (!inline) select(value);
    onSelect?.(value);
  };
  const resolveChoice = async (data: { kind: 'place'; placeId: string } | { kind: 'gps'; latitude: number; longitude: number }, id: number) => {
    try {
      const result = await resolve({ data });
      if (!alive.current || id !== version.current) return;
      if (result.data) commit(result.data);
      else { setError(result.error || 'No address found. Try another location.'); setBusy(null); }
    } catch { if (alive.current && id === version.current) { setError('Could not fetch this address. Please try again.'); setBusy(null); } }
  };
  const pick = (suggestion: LocationSuggestion) => {
    const id = ++version.current;
    setBusy('place'); setError('');
    void resolveChoice({ kind: 'place', placeId: suggestion.placeId }, id);
  };
  const detect = () => {
    const id = ++version.current;
    setError(''); setSuggestions([]);
    if (!navigator.geolocation) { setError('Location is not supported on this device. Please search instead.'); return; }
    setBusy('gps');
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (alive.current && id === version.current) void resolveChoice({ kind: 'gps', latitude: position.coords.latitude, longitude: position.coords.longitude }, id);
      }, failure => {
        if (!alive.current || id !== version.current) return;
        setBusy(null);
        setError(failure.code === 1 ? 'Location permission was denied. Allow location access or search for your city.' : failure.code === 3 ? 'Location detection timed out. Please try again or search for your city.' : 'Could not detect your location. Please search for your city.');
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    } catch { setBusy(null); setError('Could not access your location. Please search instead.'); }
  };
  const edit = (value: string) => {
    if (inline) onSelect?.(null);
    version.current++; setQuery(value); setChosen(null); setSuggestions([]); setActive(-1); setSearched(false); setBusy(null); setError('');
  };
  const resolving = busy === 'gps' || busy === 'place';
  return <main className={inline ? 'room-location ola-screen' : 'prehome-auth loc-screen ola-screen'} aria-label="Select your location">
    <section className="loc-panel">
      {!inline && <header className="loc-header"><Button variant="ghost" size="icon" className="loc-icon" aria-label="Close location selector" onClick={onDone}><X /></Button><h1>Location</h1></header>}
      <div className="ola-search">
        <Search size={22} aria-hidden="true" />
        <input ref={input} role="combobox" aria-label="Search city, area or neighbourhood" aria-autocomplete="list" aria-controls="ola-suggestions" aria-expanded={suggestions.length > 0} aria-activedescendant={active >= 0 ? `ola-option-${active}` : undefined} placeholder="Search city, area or neighbourhood" maxLength={120} value={query || (chosen?.address ?? '')} disabled={resolving} onChange={e => edit(e.target.value)} onKeyDown={e => {
          if (e.key === 'Escape') { setSuggestions([]); setActive(-1); }
          if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setActive(i => (i + 1) % suggestions.length); }
          if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActive(i => (i <= 0 ? suggestions.length : i) - 1); }
          if (e.key === 'Enter' && active >= 0 && suggestions[active]) { e.preventDefault(); pick(suggestions[active]); }
        }} />
        {busy === 'search' ? <LoaderCircle className="animate-spin" aria-label="Searching locations" /> : (query || chosen) && <Button variant="ghost" size="icon" aria-label="Clear location search" onClick={() => { edit(''); input.current?.focus(); }}><X /></Button>}
      </div>
      <Button variant="ghost" className="ola-gps" disabled={resolving} onClick={detect}>
        {busy === 'gps' ? <LoaderCircle className="animate-spin" /> : <Crosshair />}
        <span><strong>Use current location</strong><small>{busy === 'gps' ? 'Detecting your location…' : 'Enable Location'}</small></span>
      </Button>
      {error && <p className="ola-error" role="alert">{error}</p>}
      {busy === 'place' && <p className="ola-status" role="status">Fetching address…</p>}
      <ul className="ola-suggestions" id="ola-suggestions" role="listbox" aria-label="Location suggestions">
        {suggestions.map((item, index) => <li key={`${item.placeId}-${index}`} id={`ola-option-${index}`} role="option" aria-selected={active === index}>
          <Button variant="ghost" className="ola-option" disabled={resolving} onClick={() => pick(item)}><MapPin /><span><strong>{item.title}</strong>{item.subtitle && <small>{item.subtitle}</small>}</span></Button>
        </li>)}
      </ul>
      {searched && !busy && !error && !chosen && suggestions.length === 0 && <p className="ola-status" role="status">No locations found.</p>}
      {chosen && <div className="ola-selected"><Check aria-hidden="true" /><span><strong>{chosen.address}</strong><small>{[chosen.city, chosen.state].filter(Boolean).join(', ')}</small></span>{!inline && <Button className="ola-confirm" onClick={onDone}>Done</Button>}</div>}
    </section>
  </main>;
}
