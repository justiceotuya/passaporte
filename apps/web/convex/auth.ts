import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { APIError } from "better-auth/api";
import { isSignupAllowed, SIGNUP_CLOSED_MESSAGE } from "../src/lib/signup-allowlist";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

/**
 * Convex Better Auth component. Activated after `npx convex dev` sets SITE_URL
 * and BETTER_AUTH_SECRET on the deployment. Until then, Next keeps using
 * SQLite Better Auth in `src/lib/auth.ts`.
 */
export const authComponent = createClient<DataModel>(components.betterAuth);

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleEnabled = Boolean(googleId && googleSecret);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        requireLocalEmailVerified: false,
      },
    },
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: googleId!,
            clientSecret: googleSecret!,
          },
        }
      : undefined,
    databaseHooks: {
      user: {
        create: {
          // Invite-only: see src/lib/signup-allowlist.ts
          before: async (user) => {
            if (!isSignupAllowed(user.email)) {
              throw new APIError("FORBIDDEN", { message: SIGNUP_CLOSED_MESSAGE });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [convex({ authConfig })],
    onAPIError: {
      errorURL: "/sign-in",
    },
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});
