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

Set `OLA_API_KEY` in your server environment (Lovable secret settings or your independent host's environment settings). It is read only inside TanStack server functions. Do not use `VITE_OLA_API_KEY`: Vite embeds those variables in publicly readable JavaScript.

Autocomplete and place details supply addresses and coordinates; GPS uses reverse geocoding and preserves the actual device coordinates. Selection lives in React state and optional tab-scoped session storage; it is not uploaded to an application database.

Independent deployment needs a TanStack Start-compatible server runtime, not static-only hosting. A Capacitor client must call a hosted secure service rather than bundle this private key, and must configure native location permissions. This change does not provide a native Android build or a Vercel deployment configuration.

Use HTTPS for browser geolocation (localhost is allowed during development). After changing a secret, publish again to update the published app. Rotate any key previously shared in chat through Ola Maps, then replace `OLA_API_KEY` in secret settings.
