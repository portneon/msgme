import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // User profiles synced from auth provider (e.g. Clerk)
    users: defineTable({
        clerkId: v.string(),
        username: v.string(),
        email: v.string(),
        imageUrl: v.optional(v.string()),
        isOnline: v.boolean(),
    })
        .index("by_clerkId", ["clerkId"])
        .index("by_email", ["email"]),

    // A direct message conversation between exactly two users
    conversations: defineTable({
        participant1: v.id("users"),
        participant2: v.id("users"),
        lastMessageId: v.optional(v.id("messages")),
    })
        .index("by_participant1", ["participant1"])
        .index("by_participant2", ["participant2"]),

    // Messages sent in a conversation
    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("file")
        ),
        isEdited: v.boolean(),
        deletedAt: v.optional(v.number()), // Soft delete timestamp
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_senderId", ["senderId"]),

    // File/image metadata for media messages
    attachments: defineTable({
        messageId: v.id("messages"),
        storageId: v.id("_storage"),
        fileName: v.string(),
        fileType: v.string(),  // MIME type, e.g. "image/png"
        fileSize: v.number(),  // Size in bytes
    })
        .index("by_messageId", ["messageId"]),

    // Tracks when a user last read a conversation (for unread counts)
    readReceipts: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        lastReadAt: v.number(), // timestamp
    })
        .index("by_conversation_user", ["conversationId", "userId"])
        .index("by_userId", ["userId"]),

    // Tracks who is currently typing in a conversation
    typing: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        updatedAt: v.number(), // timestamp; stale if older than 3s
    })
        .index("by_conversation", ["conversationId"])
        .index("by_conversation_user", ["conversationId", "userId"]),
});
