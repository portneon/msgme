import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createWorkspace = mutation({
    args: { name: v.string(), imageUrl: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const workspaceId = await ctx.db.insert("workspaces", {
            name: args.name,
            adminId: me._id,
            imageUrl: args.imageUrl,
        });

        await ctx.db.insert("workspaceMembers", {
            workspaceId,
            userId: me._id,
            role: "admin",
        });

        return workspaceId;
    },
});

export const getMyWorkspaces = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        const memberships = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_userId", (q) => q.eq("userId", me._id))
            .collect();

        const workspaces = await Promise.all(
            memberships.map((m) => ctx.db.get(m.workspaceId))
        );

        return workspaces.filter((w) => w !== null);
    },
});

export const addMember = mutation({
    args: { workspaceId: v.id("workspaces"), email: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        // Check if I'm an admin of this workspace
        const myMembership = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace_user", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", me._id)
            )
            .unique();
        if (myMembership?.role !== "admin") throw new Error("Unauthorized");

        const userToAdd = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        if (!userToAdd) throw new Error("User with this email not found");

        // Check if already a member
        const existing = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace_user", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userToAdd._id)
            )
            .unique();
        if (existing) return existing._id;

        return await ctx.db.insert("workspaceMembers", {
            workspaceId: args.workspaceId,
            userId: userToAdd._id,
            role: "member",
        });
    },
});

export const getWorkspaceMembers = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        // Check if I am a member
        const myMembership = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace_user", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", me._id)
            )
            .unique();
        if (!myMembership) throw new Error("Not a member of this workspace");

        const memberships = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();

        const users = await Promise.all(
            memberships.map((m) => ctx.db.get(m.userId))
        );

        return users.filter((u) => u !== null);
    },
});
