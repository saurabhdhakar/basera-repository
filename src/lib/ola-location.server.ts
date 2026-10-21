const paths = { autocomplete: '/places/v1/autocomplete', details: '/places/v1/details', reverse: '/places/v1/reverse-geocode' } as const;

export async function requestOla(kind: keyof typeof paths, params: Record<string, string>, key: string): Promise<unknown> {
  const url = new URL(paths[kind], 'https://connector-gateway.lovable.dev/udc_ola_maps');
  url.pathname = '/udc_ola_maps' + paths[kind];
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  // Never log a URL, upstream body or exception: they may include credentials.
  const gatewayKey = process.env['LOVABLE_API_KEY'];
  if (!gatewayKey) throw new Error('Location service is unavailable.');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': key, 'X-Request-Id': crypto.randomUUID() }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Location service is unavailable. Please try again.');
  return response.json();
}