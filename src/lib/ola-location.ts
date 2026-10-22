export type SelectedLocation = {
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
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
  return { address, latitude, longitude, city: get('locality') || get('postal_town') || get('administrative_area_level_3') || get('administrative_area_level_2') || (place.types?.includes('locality') ? place.name || '' : ''), state: get('administrative_area_level_1') };
}