import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all conversations for the authenticated user (with unread counts)
export const getMyConversations = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        const asP1 = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", (q) => q.eq("participant1", me._id))
            .collect();

        const asP2 = await ctx.db
            .query("conversations")
            .withIndex("by_participant2", (q) => q.eq("participant2", me._id))
            .collect();

        const all = [...asP1, ...asP2];

        const enriched = await Promise.all(
            all.map(async (conv) => {
                const otherId =
                    conv.participant1 === me._id ? conv.participant2 : conv.participant1;
                const otherUser = await ctx.db.get(otherId);
                const lastMessage = conv.lastMessageId
                    ? await ctx.db.get(conv.lastMessageId)
                    : null;

                // Get my read receipt for this conversation
                const receipt = await ctx.db
                    .query("readReceipts")
                    .withIndex("by_conversation_user", (q) =>
                        q.eq("conversationId", conv._id).eq("userId", me._id)
                    )
                    .unique();

                // Count messages sent after my last read timestamp (excluding my own)
                let unreadCount = 0;
                if (!receipt) {
                    // Never read — count all messages not from me
                    const allMsgs = await ctx.db
                        .query("messages")
                        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
                        .collect();
                    unreadCount = allMsgs.filter(
                        (m) => !m.deletedAt && m.senderId !== me._id
                    ).length;
                } else {
                    const allMsgs = await ctx.db
                        .query("messages")
                        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
                        .collect();
                    unreadCount = allMsgs.filter(
                        (m) =>
                            !m.deletedAt &&
                            m.senderId !== me._id &&
                            m._creationTime > receipt.lastReadAt
                    ).length;
                }

                return { ...conv, otherUser, lastMessage, unreadCount };
            })
        );

        return enriched.sort((a, b) => {
            const aTime = a.lastMessage?._creationTime ?? a._creationTime;
            const bTime = b.lastMessage?._creationTime ?? b._creationTime;
            return bTime - aTime;
        });
    },
});

// Find or create a DM between the authenticated user and another user
export const getOrCreateConversation = mutation({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        // Check both orderings
        const existing = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", (q) => q.eq("participant1", me._id))
            .filter((q) => q.eq(q.field("participant2"), args.otherUserId))
            .unique();
        if (existing) return existing._id;

        const reversed = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", (q) => q.eq("participant1", args.otherUserId))
            .filter((q) => q.eq(q.field("participant2"), me._id))
            .unique();
        if (reversed) return reversed._id;

        return await ctx.db.insert("conversations", {
            participant1: me._id,
            participant2: args.otherUserId,
        });
    },
});
