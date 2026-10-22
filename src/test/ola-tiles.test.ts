import { describe, expect, it } from 'vitest';
import { rewriteTileResources, tileProxyUrl, validTilePath } from '@/lib/ola-tiles';

describe('secure Ola tile resources', () => {
  it('rejects arbitrary paths and traversal', () => {
    expect(validTilePath('/tiles/vector/v1/data/planet/15/23430/14208.pbf')).toBe(true);
    expect(validTilePath('/places/v1/autocomplete')).toBe(false);
    expect(validTilePath('/tiles/vector/v1/../private.json')).toBe(false);
    expect(validTilePath('/tiles/vector/v1/data/planet.json?api_key=test')).toBe(false);
  });
  it('rewrites all style and TileJSON URLs without passing upstream credentials', () => {
    const data = { glyphs: 'https://api.olamaps.io/tiles/vector/v1/fonts/{fontstack}/{range}.pbf?api_key=test', tiles: ['https://api.olamaps.io/tiles/vector/v1/data/planet/{z}/{x}/{y}.pbf'] };
    expect(rewriteTileResources(data)).toEqual({ glyphs: tileProxyUrl('/tiles/vector/v1/fonts/{fontstack}/{range}.pbf'), tiles: [tileProxyUrl('/tiles/vector/v1/data/planet/{z}/{x}/{y}.pbf')] });
  });
});