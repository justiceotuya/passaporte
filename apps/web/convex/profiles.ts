import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/identity";

const defaultSettings = {
  accentStrictness: "lenient" as const,
  sessionLength: 12,
  heartsEnabled: false,
  hintsEnabled: true,
  typedMode: false,
};

export const getMine = query({
  args: {
    bridgeUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const ensure = mutation({
  args: {
    bridgeUserId: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("profiles", {
      userId,
      displayName: args.displayName ?? "Learner",
      settings: defaultSettings,
    });
  },
});

export const updateSettings = mutation({
  args: {
    bridgeUserId: v.optional(v.string()),
    settings: v.object({
      accentStrictness: v.union(v.literal("lenient"), v.literal("strict")),
      sessionLength: v.number(),
      heartsEnabled: v.boolean(),
      hintsEnabled: v.boolean(),
      typedMode: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!existing) {
      return await ctx.db.insert("profiles", {
        userId,
        displayName: "Learner",
        settings: args.settings,
      });
    }

    await ctx.db.patch(existing._id, { settings: args.settings });
    return existing._id;
  },
});
