import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all messages for a conversation (authenticated users only)
export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) return [];

        // Determine other participant to check their read receipt
        const otherId = conversation.participant1 === me._id ? conversation.participant2 : conversation.participant1;

        const otherReceipt = await ctx.db
            .query("readReceipts")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", otherId)
            )
            .unique();

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .order("asc")
            .collect();

        return await Promise.all(
            messages
                .filter((m) => {
                    // Filter out messages deleted specifically for me
                    if (m.deletedFor?.includes(me._id)) return false;
                    return true;
                })
                .map(async (m) => {
                    const sender = await ctx.db.get(m.senderId);
                    // Message is read if other person's lastReadAt is after message creation
                    const isRead = otherReceipt ? otherReceipt.lastReadAt >= m._creationTime : false;
                    return { ...m, sender, isRead };
                })
        );
    },
});

// ... (sendMessage and markAsRead remain the same)

// Edit a message
export const editMessage = mutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");
        if (message.senderId !== me._id) throw new Error("Unauthorized");

        await ctx.db.patch(args.messageId, {
            content: args.content,
            isEdited: true,
        });
    },
});

// Delete a message
export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
        type: v.union(v.literal("me"), v.literal("everyone")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        if (args.type === "everyone") {
            if (message.senderId !== me._id) throw new Error("Unauthorized to delete for everyone");
            await ctx.db.patch(args.messageId, { deletedAt: Date.now() });
        } else {
            // Delete for me
            const deletedFor = message.deletedFor ?? [];
            if (!deletedFor.includes(me._id)) {
                await ctx.db.patch(args.messageId, {
                    deletedFor: [...deletedFor, me._id],
                });
            }
        }
    },
});

// Generate a pre-signed URL for uploading files to Convex storage
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

// Send a message — sender ID is derived from the authenticated user
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        type: v.union(v.literal("text"), v.literal("image"), v.literal("file")),
        storageId: v.optional(v.id("_storage")), // For images/files
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        let content = args.content;
        // if it's an image/file and we have a storageId, content might be the storageId or public URL
        // but for now let's keep content as the descriptive text or the URL if resolved.
        // Actually, let's store the storageId and resolve the URL in getMessages if needed.
        // Or store the generated URL directly if it's permanent enough. 
        // Convex storage URLs are usually fetched per request if they are private, or static if public.

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: me._id,
            content: content,
            type: args.type,
            isEdited: false,
        });

        if (args.storageId) {
            // We can resolve the URL here if we want to store it in the message content for simplicity
            // or just use the type information.
            const url = await ctx.storage.getUrl(args.storageId);
            if (url) {
                await ctx.db.patch(messageId, { content: url });
            }
        }

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
