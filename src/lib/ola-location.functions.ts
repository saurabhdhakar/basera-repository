import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requestOla } from './ola-location.server';
import { normalizeOlaPlace, type LocationSuggestion, type SelectedLocation } from './ola-location';

type Result<T> = { data: T; error: string | null };
const unavailable = 'Location search is unavailable. Please try again.';

export const autocompleteLocations = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(input))
  .handler(async ({ data }): Promise<Result<LocationSuggestion[]>> => {
    const key = process.env['UDC_OLA_MAPS_API_KEY'];
    if (!key) return { data: [], error: unavailable };
    try {
      const result = await requestOla('autocomplete', { input: data.query }, key) as { predictions?: { place_id?: string; description?: string; structured_formatting?: { main_text?: string; secondary_text?: string } }[]; status?: string };
      if (result.status && !['ok', 'OK', 'ZERO_RESULTS'].includes(result.status)) return { data: [], error: unavailable };
      return { data: (result.predictions || []).filter(p => p.place_id && p.description).slice(0, 8).map(p => ({ placeId: p.place_id || '', address: p.description || '', title: p.structured_formatting?.main_text || p.description || '', subtitle: p.structured_formatting?.secondary_text || '' })), error: null };
    } catch { return { data: [], error: unavailable }; }
  });

export const resolveLocation = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('place'), placeId: z.string().min(1).max(300) }),
    z.object({ kind: z.literal('gps'), latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }),
  ]).parse(input))
  .handler(async ({ data }): Promise<Result<SelectedLocation | null>> => {
    const key = process.env['UDC_OLA_MAPS_API_KEY'];
    if (!key) return { data: null, error: unavailable };
    try {
      const result = data.kind === 'place'
        ? await requestOla('details', { place_id: data.placeId }, key) as { result?: unknown }
        : await requestOla('reverse', { latlng: `${data.latitude},${data.longitude}` }, key) as { results?: unknown[] };
      const raw = 'result' in result ? result.result : 'results' in result ? result.results?.[0] : null;
      const location = normalizeOlaPlace(raw);
      if (!location) return { data: null, error: 'No address found for this location. Please choose another place.' };
      // Preserve the actual device position, not the centre of the returned address.
      if (data.kind === 'gps') { location.latitude = data.latitude; location.longitude = data.longitude; }
      return { data: location, error: null };
    } catch { return { data: null, error: unavailable }; }
  });