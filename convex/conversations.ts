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

        let allowedOtherUserIds: Set<string> | null = null;
        let forbiddenOtherUserIds: Set<string> | null = null;

        if (args.workspaceId) {
            const members = await ctx.db
                .query("workspaceMembers")
                .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId!))
                .collect();
            allowedOtherUserIds = new Set(members.map(m => m.userId));
        } else {
            const workspaces = await ctx.db
                .query("workspaces")
                .withIndex("by_adminId", (q) => q.eq("adminId", me._id))
                .collect();

            const allMemberships = await Promise.all(
                workspaces.map(w =>
                    ctx.db.query("workspaceMembers")
                        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", w._id))
                        .collect()
                )
            );

            forbiddenOtherUserIds = new Set(allMemberships.flat().map(m => m.userId));
        }

        const all = [...asP1, ...asP2]
            .filter(c => !c.hiddenFor?.includes(me._id))
            .filter(c => {
                const otherId = c.participant1 === me._id ? c.participant2 : c.participant1;
                if (allowedOtherUserIds) {
                    return allowedOtherUserIds.has(otherId);
                }
                if (forbiddenOtherUserIds) {
                    return !forbiddenOtherUserIds.has(otherId);
                }
                return true;
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
    args: { otherUserId: v.id("users") },
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

        const ensureInAtLeastOneWorkspace = async (ownerId: typeof me._id, userId: typeof args.otherUserId) => {
            const ownerWorkspaces = await ctx.db.query("workspaces").withIndex("by_adminId", q => q.eq("adminId", ownerId)).collect();
            let found = false;
            for (const ws of ownerWorkspaces) {
                const member = await ctx.db.query("workspaceMembers").withIndex("by_workspace_user", q => q.eq("workspaceId", ws._id).eq("userId", userId)).unique();
                if (member) { found = true; break; }
            }
            // If they aren't in any workspace, add them to the first one (Default/Personal)
            if (!found && ownerWorkspaces.length > 0) {
                await ctx.db.insert("workspaceMembers", { workspaceId: ownerWorkspaces[0]._id, userId: userId, role: "member" });
            }
        };

        // When a chat starts, ensure both can see each other in their default bundles
        await ensureInAtLeastOneWorkspace(me._id, args.otherUserId);
        await ensureInAtLeastOneWorkspace(args.otherUserId, me._id);

        if (existing) {
            // If it was hidden for either user, unhide it for them
            const hiddenFor = existing.hiddenFor ?? [];
            if (hiddenFor.includes(me._id) || hiddenFor.includes(args.otherUserId)) {
                await ctx.db.patch(existing._id, {
                    hiddenFor: hiddenFor.filter(id => id !== me._id && id !== args.otherUserId)
                });
            }
            return existing._id;
        }

        return await ctx.db.insert("conversations", {
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
export const getConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return null;

        const conv = await ctx.db.get(args.conversationId);
        if (!conv) return null;

        const otherId = conv.participant1 === me._id ? conv.participant2 : conv.participant1;
        const otherUser = await ctx.db.get(otherId);

        return { ...conv, otherUser };
    }
});
