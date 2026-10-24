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
type RawPlace = { formatted_address?: string; name?: string; types?: string[]; address_components?: Component[]; distance_meters?: number; geometry?: { location?: { lat?: number; lng?: number } } };

// Reverse geocoding returns the nearest venue first, and a single venue can carry a
// neighbouring area's name. OLX-style GPS labels therefore vote on the area across ALL
// returned results and keep the majority name, tie-broken by the nearest distance.
export function pickBestGpsPlace(results: unknown): RawPlace | null {
  if (!Array.isArray(results)) return null;
  const entries = results.filter((r): r is RawPlace => !!r && typeof r === 'object' && Array.isArray((r as RawPlace).address_components));
  if (!entries.length) return null;
  const areaOf = (place: RawPlace) => {
    const get = (type: string) => place.address_components?.find(c => c.types?.includes(type))?.long_name || '';
    return get('sublocality_level_1') || get('sublocality') || get('neighborhood') || get('sublocality_level_2') || '';
  };
  const distanceOf = (place: RawPlace) => (typeof place.distance_meters === 'number' && place.distance_meters >= 0 ? place.distance_meters : Infinity);
  const tally = new Map<string, { count: number; nearest: RawPlace }>();
  for (const place of entries) {
    const area = areaOf(place);
    const key = area || '\u0000'; // places without any sub-locality all share one bucket
    const seen = tally.get(key);
    if (seen) {
      seen.count += 1;
      if (distanceOf(place) < distanceOf(seen.nearest)) seen.nearest = place;
    } else {
      tally.set(key, { count: 1, nearest: place });
    }
  }
  let winner: { count: number; nearest: RawPlace } | null = null;
  for (const candidate of tally.values()) {
    if (!winner || candidate.count > winner.count || (candidate.count === winner.count && distanceOf(candidate.nearest) < distanceOf(winner.nearest))) winner = candidate;
  }
  return winner?.nearest ?? null;
}

export function normalizeOlaPlace(value: unknown): SelectedLocation | null {
  if (!value || typeof value !== 'object') return null;
  const place = value as RawPlace;
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