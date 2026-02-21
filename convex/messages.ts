import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all messages for a conversation (authenticated users only)
export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .order("asc")
            .collect();

        return await Promise.all(
            messages
                .filter((m) => !m.deletedAt)
                .map(async (m) => {
                    const sender = await ctx.db.get(m.senderId);
                    return { ...m, sender };
                })
        );
    },
});

// Send a message — sender ID is derived from the authenticated user
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("file")
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: me._id,
            content: args.content,
            type: args.type,
            isEdited: false,
        });

        await ctx.db.patch(args.conversationId, {
            lastMessageId: messageId,
        });

        // Auto mark as read for the sender
        const existingReceipt = await ctx.db
            .query("readReceipts")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", me._id)
            )
            .unique();

        if (existingReceipt) {
            await ctx.db.patch(existingReceipt._id, { lastReadAt: Date.now() });
        } else {
            await ctx.db.insert("readReceipts", {
                conversationId: args.conversationId,
                userId: me._id,
                lastReadAt: Date.now(),
            });
        }

        return messageId;
    },
});

// Mark a conversation as read for the current user
export const markAsRead = mutation({
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
            .query("readReceipts")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", me._id)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { lastReadAt: Date.now() });
        } else {
            await ctx.db.insert("readReceipts", {
                conversationId: args.conversationId,
                userId: me._id,
                lastReadAt: Date.now(),
            });
        }
    },
});
