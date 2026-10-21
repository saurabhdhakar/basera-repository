<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep pre-home welcome and sign-in views in PreHomeAuth, with email entry separate from method selection, so the existing marketplace and session flow stay intact.
- Legal sign-in links open accessible dialogs until official documents are supplied; never invent contractual policies.
- Keep the splash timer and cleanup in PreHomeAuth; reuse the transparent logo and scope light tokens to all initial authentication views so marketplace theming remains independent.

- Firebase browser authentication lives in src/lib/firebase-auth.ts and initializes only with complete VITE_FIREBASE_* configuration; never fabricate credentials or use Firebase identity as Cloud authorization.
- Preserve legacy Cloud session handling until Firebase is configured; Firebase session subscriptions then own pre-home entry so reloads retain Firebase login.
- Keep location data and optional selection headings in src/data/locations.ts; key rendered rows by name plus position so supplied duplicate names remain distinct.
- Ola location selection uses a shared React context and a narrow document event bridge to the embedded marketplace, so pre-home and marketplace selections share validated coordinates without replacing legacy authentication.
- Keep Ola Places calls in server functions through the linked Ola connector; gateway credentials stay server-only to prevent browser exposure.
- Render property maps with dynamically imported MapLibre and an allowlisted same-origin Ola vector resource proxy; rewrite style/TileJSON resources so fonts, sprites and tiles never expose credentials.
- Use RoomLocationBridge portals and document events for embedded room form and detail maps; persist selected address and coordinates with each listing, never substitute viewer or city-centre coordinates.
