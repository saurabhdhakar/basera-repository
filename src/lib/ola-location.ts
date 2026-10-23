export type SelectedLocation = {
  address: string;
  locality: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  shortLabel: string;
};
export type LocationSuggestion = { placeId: string; address: string; title: string; subtitle: string };

type Component = { long_name?: string; types?: string[] };
export function normalizeOlaPlace(value: unknown): SelectedLocation | null {
  if (!value || typeof value !== 'object') return null;
  const place = value as { formatted_address?: string; name?: string; types?: string[]; address_components?: Component[]; geometry?: { location?: { lat?: number; lng?: number } } };
  const latitude = place.geometry?.location?.lat;
  const longitude = place.geometry?.location?.lng;
  const address = place.formatted_address || place.name;
  if (!address || typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const components = place.address_components || [];
  const get = (type: string) => components.find(c => c.types?.includes(type))?.long_name || '';
  const city = get('locality') || get('postal_town') || get('administrative_area_level_3') || get('administrative_area_level_2') || (place.types?.includes('locality') ? place.name || '' : '');
  const state = get('administrative_area_level_1');
  const locality = get('sublocality_level_1') || get('sublocality') || get('neighborhood') || get('sublocality_level_2');
  // OLX only ever shows the main locality and city, e.g. "Khandwa Naka, Indore";
  // the full formatted address stays on the saved record for listings and maps.
  const shortLabel = [locality && locality !== city ? locality : '', city].filter(Boolean).join(', ') || state || address;
  return { address, locality, city, state, latitude, longitude, shortLabel };
}