# Basera Importer

Import basera

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/add3e133-686f-4812-8f8d-b64f6a4f350c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Ola Maps location selection

Ola Places and vector tiles use the linked Ola Maps connector. Set `LOVABLE_API_KEY` and `UDC_OLA_MAPS_API_KEY` in the server environment for the connector gateway; neither belongs in browser code. Do not use `VITE_OLA_API_KEY`: Vite embeds those variables in publicly readable JavaScript.

Autocomplete and place details supply addresses and coordinates; GPS preserves the actual device coordinates. Browsing selection uses tab-scoped session storage. Room selection stays separate and is saved with the listing by the existing Firebase listing flow, which still requires Firebase configuration. Listing maps use those saved coordinates, never a guessed city centre; older listings without coordinates show an unavailable-location notice. MapLibre loads Ola vector tiles via an allowlisted same-origin proxy that rewrites style, TileJSON, sprite and font URLs.

Independent deployment needs a TanStack Start-compatible server runtime, not static-only hosting. A Capacitor client must call a hosted secure service rather than bundle this private key, and must configure native location permissions. This change does not provide a native Android build or a Vercel deployment configuration.

Use HTTPS for browser geolocation (localhost is allowed during development). After changing a secret, publish again to update the published app. Rotate any key previously shared in chat through Ola Maps, then update the Ola Maps connection securely.
