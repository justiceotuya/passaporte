import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "auth.db");

const siteUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleEnabled = Boolean(googleId && googleSecret);

function trustedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3010",
    "http://127.0.0.1:3010",
  ]);
  for (const value of [siteUrl, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore invalid */
    }
  }
  return [...origins];
}

export const auth = betterAuth({
  database: new Database(dbPath),
  baseURL: siteUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      // Google verifies email; local email/password signup does not verify,
      // so allow linking without a verified local email.
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
  trustedOrigins: trustedOrigins(),
  onAPIError: {
    errorURL: "/sign-in",
  },
});

export const isGoogleAuthConfigured = googleEnabled;
