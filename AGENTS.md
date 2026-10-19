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
