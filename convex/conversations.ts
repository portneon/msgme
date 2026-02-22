import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all conversations for the authenticated user (with unread counts)
export const getMyConversations = query({
    args: { workspaceId: v.optional(v.id("workspaces")) },
    handler: async (ctx, args) => {
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

        // Filter by workspaceId: 
        // 1. If args.workspaceId is provided, show only those matches or legacy chats
        const all = [...asP1, ...asP2]
            .filter(c => !c.hiddenFor?.includes(me._id))
            .filter(c => {
                if (!args.workspaceId) return true;
                return c.workspaceId === args.workspaceId || !c.workspaceId;
            });

        const enriched = await Promise.all(
            all.map(async (conv) => {
                const otherId =
                    conv.participant1 === me._id ? conv.participant2 : conv.participant1;
                const otherUser = await ctx.db.get(otherId);

                // Find the actual last visible message for this user
                const allVisibleMsgs = await ctx.db
                    .query("messages")
                    .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
                    .order("desc")
                    .collect();

                const myLastVisibleMsg = allVisibleMsgs.find(m => !m.deletedFor?.includes(me._id));

                let lastMessage = null;
                if (myLastVisibleMsg) {
                    if (myLastVisibleMsg.deletedAt) {
                        lastMessage = {
                            ...myLastVisibleMsg,
                            content: myLastVisibleMsg.senderId === me._id
                                ? "You deleted this message"
                                : "This message was deleted"
                        };
                    } else {
                        lastMessage = myLastVisibleMsg;
                    }
                }

                // Get my read receipt for this conversation
                const receipt = await ctx.db
                    .query("readReceipts")
                    .withIndex("by_conversation_user", (q) =>
                        q.eq("conversationId", conv._id).eq("userId", me._id)
                    )
                    .unique();

                // Count messages sent after my last read timestamp (excluding my own)
                const unreadCount = allVisibleMsgs.filter(m =>
                    !m.deletedAt &&
                    m.senderId !== me._id &&
                    !m.deletedFor?.includes(me._id) &&
                    (!receipt || m._creationTime > receipt.lastReadAt)
                ).length;

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
    args: { otherUserId: v.id("users"), workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const asP1 = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", (q) => q.eq("participant1", me._id))
            .filter((q) => q.eq(q.field("participant2"), args.otherUserId))
            .unique();

        const asP2 = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", (q) => q.eq("participant1", args.otherUserId))
            .filter((q) => q.eq(q.field("participant2"), me._id))
            .unique();

        const existing = asP1 || asP2;

        if (existing) {
            // Update workspaceId if it's missing (legacy chat being moved)
            if (!existing.workspaceId) {
                await ctx.db.patch(existing._id, { workspaceId: args.workspaceId });
            }

            // If it was hidden for "me", unhide it
            if (existing.hiddenFor?.includes(me._id)) {
                await ctx.db.patch(existing._id, {
                    hiddenFor: existing.hiddenFor.filter(id => id !== me._id)
                });
            }
            return existing._id;
        }

        return await ctx.db.insert("conversations", {
            workspaceId: args.workspaceId,
            participant1: me._id,
            participant2: args.otherUserId,
        });
    },
});

// Clear conversation history for the current user
export const clearConversation = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        // Mark all messages as deleted for me
        for (const msg of messages) {
            const deletedFor = msg.deletedFor ?? [];
            if (!deletedFor.includes(me._id)) {
                await ctx.db.patch(msg._id, {
                    deletedFor: [...deletedFor, me._id]
                });
            }
        }

        // Hide the conversation too
        const conv = await ctx.db.get(args.conversationId);
        if (conv) {
            const hiddenFor = conv.hiddenFor ?? [];
            if (!hiddenFor.includes(me._id)) {
                await ctx.db.patch(conv._id, {
                    hiddenFor: [...hiddenFor, me._id]
                });
            }
        }
    },
});
