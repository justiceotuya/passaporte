# Convex backend (Passaporte)

Progress, sessions, attempts, and (after cutover) Better Auth live here.

## First-time setup

```bash
cd apps/web
npx convex login          # interactive — required once per machine
npx convex dev            # creates deployment, writes .env.local, codegen
```

Then set Convex env vars (CLI will prompt / you can set explicitly):

```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

Copy into repo-root `.env.local` (gitignored) whatever `convex dev` prints:

```
CONVEX_DEPLOYMENT=dev:...
NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://....convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Auth cutover

Until Convex is configured, **Next keeps Better Auth + SQLite** (`src/lib/auth.ts`).
Progress syncs to Convex via `/api/progress` using a temporary `bridgeUserId`
from the Better Auth session when `NEXT_PUBLIC_CONVEX_URL` is set.

After `convex dev` is healthy, switch Next auth routes to the Convex adapter
(`src/lib/auth-server.ts` + `ConvexBetterAuthProvider`) as documented in
https://labs.convex.dev/better-auth/framework-guides/next

## Regenerating types

```bash
npx convex codegen
```

Commit `convex/_generated/` when it changes.
