/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_identity from "../lib/identity.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type { ComponentApi } from "@convex-dev/better-auth/_generated/component.js";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  "lib/identity": typeof lib_identity;
  profiles: typeof profiles;
  progress: typeof progress;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: ComponentApi<"betterAuth">;
};
