# Convex backend (Passaporte)

Progress, sessions, attempts, and (after cutover) Better Auth live here.

## First-time setup

`convex` is a dependency of `@passaporte/web` (`apps/web/package.json`). Always run the CLI from **`apps/web`** (or via the root `pnpm web:convex` script). Do **not** run `npx convex` from the monorepo root — root `package.json` has no `convex` dependency, and the CLI will exit with:

> In order to run `npx convex dev`, add `convex` to your package.json dependencies.

```bash
# from monorepo root
pnpm install
pnpm web:convex
# or explicitly:
cd apps/web
pnpm exec convex login   # interactive — required once per machine
pnpm exec convex dev     # creates deployment, writes .env.local, codegen
```

Then set Convex env vars (CLI will prompt / you can set explicitly):

```bash
cd apps/web
pnpm exec convex env set SITE_URL http://localhost:3000
pnpm exec convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
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
cd apps/web
pnpm exec convex codegen
# or: pnpm convex:codegen
```

Commit `convex/_generated/` when it changes.
