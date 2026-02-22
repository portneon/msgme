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
            await ctx.db.patch(existing._id, {
                username: args.username,
                email: args.email,
                imageUrl: args.imageUrl,
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
