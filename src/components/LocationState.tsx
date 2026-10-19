import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { normalizeOlaPlace, type SelectedLocation } from '@/lib/ola-location';

type LocationState = { location: SelectedLocation | null; select: (location: SelectedLocation) => void };
const Context = createContext<LocationState>({ location: null, select: () => {} });
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem('basera:selected-location') || 'null') as SelectedLocation | null;
      if (saved && normalizeOlaPlace({ formatted_address: saved.address, geometry: { location: { lat: saved.latitude, lng: saved.longitude } } })) setLocation(saved);
    } catch { /* Storage is optional. */ }
  }, []);
  const select = (value: SelectedLocation) => {
    setLocation(value);
    try { window.sessionStorage.setItem('basera:selected-location', JSON.stringify(value)); } catch { /* Keep the in-memory selection. */ }
  };
  return <Context.Provider value={{ location, select }}>{children}</Context.Provider>;
}
export const useLocationState = () => useContext(Context);