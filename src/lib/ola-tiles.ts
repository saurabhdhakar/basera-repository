/** Keep every Ola tile resource on our origin, including TileJSON and fonts. */
export function tileProxyUrl(path: string): string {
  return `/api/public/ola-tiles?path=${encodeURIComponent(path).replace(/%7B/g, '{').replace(/%7D/g, '}')}`;
}

export function validTilePath(path: string): boolean {
  return path.startsWith('/tiles/vector/v1/') && path.length < 600 && !path.includes('..') && !/[?#\\\x00-\x1f]/.test(path)
    && /\.(json|pbf|png)$/.test(path);
}

export function rewriteTileResources(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('https://api.olamaps.io/tiles/vector/v1/')) {
    const url = new URL(value);
    return tileProxyUrl(decodeURI(url.pathname));
  }
  if (Array.isArray(value)) return value.map(rewriteTileResources);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteTileResources(item)]));
  return value;
}