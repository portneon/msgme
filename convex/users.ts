import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get the currently authenticated user (returns null if not found yet)
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

// Get all users except the currently authenticated one
export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        const all = await ctx.db.query("users").collect();
        return all.filter((u) => u.clerkId !== identity.subject);
    },
});

// Create or update the authenticated user's profile on sign-in
export const upsertUser = mutation({
    args: {
        username: v.string(),
        email: v.string(),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (existing) {
            // Only update isOnline. We do not overwrite username or imageUrl 
            // from Clerk because they might have a custom one.
            await ctx.db.patch(existing._id, {
                isOnline: true,
            });
        }

        const userId = existing ? existing._id : await ctx.db.insert("users", {
            clerkId: identity.subject,
            username: args.username,
            email: args.email,
            imageUrl: args.imageUrl,
            isOnline: true,
        });

        // Ensure user has at least one workspace
        const memberships = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        if (memberships.length === 0) {
            const workspaceId = await ctx.db.insert("workspaces", {
                name: "Personal",
                adminId: userId,
            });
            await ctx.db.insert("workspaceMembers", {
                workspaceId,
                userId,
                role: "admin",
            });
        }

        return userId;
    },
});

// Mark the authenticated user offline
export const setOffline = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (user) {
            await ctx.db.patch(user._id, { isOnline: false });
        }
    },
});

// Update the authenticated user's profile
export const updateProfile = mutation({
    args: {
        customUsername: v.optional(v.string()),
        customImageUrl: v.optional(v.string()),
        imageId: v.optional(v.id("_storage")),
        bio: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const updates: any = {};
        if (args.customUsername !== undefined) updates.customUsername = args.customUsername;
        if (args.customImageUrl !== undefined) updates.customImageUrl = args.customImageUrl;
        if (args.bio !== undefined) updates.bio = args.bio;

        if (args.imageId) {
            const url = await ctx.storage.getUrl(args.imageId);
            if (url) {
                updates.customImageUrl = url;
            }
        }

        await ctx.db.patch(user._id, updates);
    },
});

// Set a custom alias for another user
export const setContactAlias = mutation({
    args: {
        contactUserId: v.id("users"),
        alias: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const existingContact = await ctx.db
            .query("contacts")
            .withIndex("by_owner_contact", (q) =>
                q.eq("ownerId", user._id).eq("contactUserId", args.contactUserId)
            )
            .unique();

        if (existingContact) {
            await ctx.db.patch(existingContact._id, { alias: args.alias });
        } else {
            await ctx.db.insert("contacts", {
                ownerId: user._id,
                contactUserId: args.contactUserId,
                alias: args.alias,
            });
        }
    },
});

// Get aliases set by the current user
export const getMyContacts = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("contacts")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect();
    },
});
