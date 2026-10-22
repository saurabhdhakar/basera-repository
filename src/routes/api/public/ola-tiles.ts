import { createFileRoute } from '@tanstack/react-router';
import { rewriteTileResources, validTilePath } from '@/lib/ola-tiles';

export const Route = createFileRoute('/api/public/ola-tiles/$')({
  server: { handlers: { GET: async ({ request }) => {
    const path = new URL(request.url).searchParams.get('path') || '';
    if (!validTilePath(path)) return new Response('Invalid map resource', { status: 400 });
    const gatewayKey = process.env['LOVABLE_API_KEY'];
    const connectionKey = process.env['UDC_OLA_MAPS_API_KEY'];
    if (!gatewayKey || !connectionKey) return new Response('Map unavailable', { status: 503 });
    try {
      const upstream = await fetch(`https://connector-gateway.lovable.dev/udc_ola_maps${path}`, {
        headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey },
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) return new Response('Map unavailable', { status: 502 });
      // This endpoint exposes only public cartographic assets, never user data or credentials.
      const headers = { 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' };
      if (path.endsWith('.json')) return Response.json(rewriteTileResources(await upstream.json()), { headers });
      return new Response(upstream.body, { headers: { ...headers, 'Content-Type': path.endsWith('.png') ? 'image/png' : 'application/x-protobuf' } });
    } catch { return new Response('Map unavailable', { status: 502 }); }
  } } },
});