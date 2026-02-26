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

        const workspaces = await ctx.db
            .query("workspaces")
            .withIndex("by_adminId", (q) => q.eq("adminId", me._id))
            .collect();

        return workspaces;
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

        // Check if I'm the owner of this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.adminId !== me._id) throw new Error("Unauthorized");

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

        // Check if I am the owner
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.adminId !== me._id) throw new Error("Unauthorized");

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

export const addMemberById = mutation({
    args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        // Check if I'm the owner of this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.adminId !== me._id) throw new Error("Unauthorized");

        const userToAdd = await ctx.db.get(args.userId);
        if (!userToAdd) throw new Error("User not found");

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
            role: "member", // Role is fixed to 'member' for those added
        });
    },
});

export const removeMemberById = mutation({
    args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        // Check if I'm the owner of this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.adminId !== me._id) throw new Error("Unauthorized");

        const existing = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace_user", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
            )
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});
