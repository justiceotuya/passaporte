# Convex backend (Passaporte)

Progress, sessions, attempts, and Better Auth live here when
`NEXT_PUBLIC_CONVEX_URL` is set.

## First-time setup

`convex` is a dependency of `@passaporte/web`. Run the CLI from **`apps/web`**
(or `pnpm web:convex` from the monorepo root).

```bash
pnpm install
cd apps/web
pnpm exec convex login   # once per machine
pnpm exec convex dev     # or: pnpm web:convex from root
```

Deployment env (already needed for auth):

```bash
cd apps/web
pnpm exec convex env set SITE_URL http://localhost:3000
pnpm exec convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

`.env.local` (gitignored) should include:

```
CONVEX_DEPLOYMENT=dev:...
NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://....convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Auth cutover (done)

When Convex URL is present:

- `/api/auth/*` → Convex Better Auth handler (`src/lib/auth-server.ts`)
- `ConvexClientProvider` → `ConvexBetterAuthProvider`
- Progress still mirrors via `/api/progress` + `bridgeUserId` (HTTP client)

Without Convex URL (CI/e2e without deployment), Next falls back to SQLite
Better Auth in `src/lib/auth.ts`.

## Google OAuth

Set the same values in `apps/web/.env.local` **and** on the Convex deployment:

```bash
# .env.local
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Convex
cd apps/web
pnpm exec convex env set GOOGLE_CLIENT_ID "..."
pnpm exec convex env set GOOGLE_CLIENT_SECRET "..."
```

Google Cloud redirect URI: `{SITE_URL}/api/auth/callback/google`  
(e.g. `http://localhost:3000/api/auth/callback/google`).

Google is a **trusted** account-linking provider (`requireLocalEmailVerified: false`) so the same email can use password signup then Google sign-in.

The sign-in UI polls `/api/auth/providers` and enables Google when both secrets are set.
