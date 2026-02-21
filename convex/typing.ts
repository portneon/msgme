import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const TYPING_EXPIRY_MS = 3000; // 3 seconds

// Set the current user as typing in a conversation
export const setTyping = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return;

        // Upsert: update existing record or insert new one
        const existing = await ctx.db
            .query("typing")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", me._id)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { updatedAt: Date.now() });
        } else {
            await ctx.db.insert("typing", {
                conversationId: args.conversationId,
                userId: me._id,
                updatedAt: Date.now(),
            });
        }
    },
});

// Clear the current user's typing status
export const clearTyping = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return;

        const existing = await ctx.db
            .query("typing")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", me._id)
            )
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

// Get users currently typing in a conversation (excluding self, excluding stale records)
export const getTypingUsers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        const cutoff = Date.now() - TYPING_EXPIRY_MS;

        const typingRecords = await ctx.db
            .query("typing")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        // Filter out self and stale records
        const active = typingRecords.filter(
            (r) => r.userId !== me._id && r.updatedAt >= cutoff
        );

        // Fetch usernames
        const users = await Promise.all(
            active.map(async (r) => {
                const user = await ctx.db.get(r.userId);
                return user?.username ?? null;
            })
        );

        return users.filter(Boolean) as string[];
    },
});
