import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Resolve the acting user.
 * Prefer Convex Better Auth identity; allow a temporary SQLite bridge userId
 * until `npx convex login` + full adapter cutover is complete.
 */
export async function requireUserId(
  ctx: Ctx,
  bridgeUserId?: string,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.subject) {
    return identity.subject;
  }
  if (bridgeUserId) {
    return bridgeUserId;
  }
  throw new Error("Unauthenticated");
}
