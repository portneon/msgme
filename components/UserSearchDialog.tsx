"use client";

import { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent,
    TextField, InputAdornment, List, ListItemButton,
    ListItemAvatar, ListItemText, Avatar, Typography, Box, IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface UserSearchDialogProps {
    open: boolean;
    onClose: () => void;
    onConversationCreated: (id: Id<"conversations">) => void;
    activeWorkspaceId: Id<"workspaces"> | null;
    currentUserId: Id<"users">;
}

export default function UserSearchDialog({
    open,
    onClose,
    onConversationCreated,
    activeWorkspaceId,
    currentUserId,
}: UserSearchDialogProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const getOrCreate = useMutation(api.conversations.getOrCreateConversation);

    // In a workspace, only search for people already in that workspace
    const workspaceUsers = useQuery(
        api.workspaces.getWorkspaceMembers,
        activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
    );

    // If not in a workspace (which shouldn't happen now), fallback to all
    const allUsers = useQuery(api.users.getAllUsers);

    const users = activeWorkspaceId ? workspaceUsers : allUsers;

    const filtered = users?.filter((u) =>
        u._id !== currentUserId && (
            u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        )
    );

    async function handleSelect(otherUserId: Id<"users">) {
        if (!activeWorkspaceId) return;
        // getOrCreateConversation no longer needs myUserId from client
        const convId = await getOrCreate({ otherUserId, workspaceId: activeWorkspaceId });
        onConversationCreated(convId);
        onClose();
        setSearch("");
    }

    if (!isMounted) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { bgcolor: "background.paper", backgroundImage: "none", borderRadius: 3 } }}
        >
            <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" fontWeight={700}>New Message</Typography>
                <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
                <TextField
                    autoFocus
                    fullWidth
                    placeholder="Search by username or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    sx={{ mb: 1.5 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                            </InputAdornment>
                        ),
                    }}
                />
                {filtered?.length === 0 && (
                    <Typography color="text.secondary" textAlign="center" py={3} fontSize={14}>No users found</Typography>
                )}
                <List disablePadding>
                    {filtered?.map((user) => (
                        <ListItemButton key={user._id} onClick={() => handleSelect(user._id)} sx={{ borderRadius: 2, mb: 0.5 }}>
                            <ListItemAvatar>
                                <Avatar src={user.imageUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                                    {user.username[0]?.toUpperCase()}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={user.username}
                                primaryTypographyProps={{ fontWeight: 600 }}
                                secondary={user.email}
                                secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                            />
                            {user.isOnline && (
                                <Box sx={{ width: 8, height: 8, bgcolor: "#22c55e", borderRadius: "50%", ml: 1 }} />
                            )}
                        </ListItemButton>
                    ))}
                </List>
            </DialogContent>
        </Dialog>
    );
}
