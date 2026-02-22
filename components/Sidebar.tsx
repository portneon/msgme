"use client";

import {
    Box,
    Typography,
    Avatar,
    List,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    TextField,
    InputAdornment,
    Tooltip,
    IconButton,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import AddMemberDialog from "./AddMemberDialog";
import type { Id } from "../convex/_generated/dataModel";
import { useState } from "react";

interface SidebarProps {
    currentUserId: Id<"users">;
    activeConversationId: Id<"conversations"> | null;
    onSelectConversation: (id: Id<"conversations">) => void;
    onOpenSearch: () => void;
    activeWorkspaceId: Id<"workspaces"> | null;
}

function formatTimestamp(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isThisYear = d.getFullYear() === now.getFullYear();

    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (isToday) {
        return time;
    }
    if (isThisYear) {
        return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
    }
    return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}, ${time}`;
}

export default function Sidebar({
    currentUserId,
    activeConversationId,
    onSelectConversation,
    onOpenSearch,
    activeWorkspaceId,
}: SidebarProps) {
    const { user } = useUser();
    const conversations = useQuery(
        api.conversations.getMyConversations,
        activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
    );
    const clearConversation = useMutation(api.conversations.clearConversation);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [convToDelete, setConvToDelete] = useState<Id<"conversations"> | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: Id<"conversations">) => {
        e.stopPropagation();
        setConvToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (convToDelete) {
            await clearConversation({ conversationId: convToDelete });
            setDeleteDialogOpen(false);
            setConvToDelete(null);
            // If the active conversation was deleted, we might want to tell the parent to clear selection
            // but for now getMyConversations will filter it out.
        }
    };

    return (
        <Box
            sx={{
                width: { xs: "100%", md: 300 },
                minWidth: { xs: "100%", md: 300 },
                height: "100vh",
                bgcolor: "background.paper",
                borderRight: { md: "1px solid" },
                borderColor: { md: "divider" },
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ position: "relative" }}>
                        <Avatar
                            src={user?.imageUrl}
                            sx={{ width: 38, height: 38, border: "2px solid", borderColor: "primary.main" }}
                        />
                        {/* Online indicator for self */}
                        <Box
                            sx={{
                                position: "absolute", bottom: 0, right: 0,
                                width: 10, height: 10, bgcolor: "#22c55e",
                                borderRadius: "50%", border: "2px solid", borderColor: "background.paper",
                            }}
                        />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                        {user?.username ?? user?.firstName ?? "You"}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Invite to Bundle">
                        <IconButton
                            onClick={() => setInviteOpen(true)}
                            size="small"
                            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                        >
                            <PersonAddRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="New conversation">
                        <IconButton
                            onClick={onOpenSearch}
                            size="small"
                            sx={{ bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" } }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
                <AddMemberDialog
                    open={inviteOpen}
                    onClose={() => setInviteOpen(false)}
                    workspaceId={activeWorkspaceId}
                />
            </Box>

            {/* Search bar (opens dialog) */}
            <Box sx={{ px: 2, py: 1.5 }}>
                <TextField
                    fullWidth
                    placeholder="Search conversations…"
                    size="small"
                    onClick={onOpenSearch}
                    InputProps={{
                        readOnly: true,
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ cursor: "pointer", "& *": { cursor: "pointer" } }}
                />
            </Box>

            <Typography variant="overline" sx={{ px: 2, color: "text.secondary", letterSpacing: 1.5, fontSize: 11 }}>
                Messages
            </Typography>

            {/* Conversation List */}
            <List sx={{ flex: 1, overflowY: "auto", py: 0.5 }}>
                {/* Loading */}
                {conversations === undefined && (
                    <Typography sx={{ px: 2, py: 2, color: "text.secondary", fontSize: 14 }}>
                        Loading…
                    </Typography>
                )}

                {/* Empty state */}
                {conversations?.length === 0 && (
                    <Box
                        sx={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", py: 8, px: 3, gap: 2,
                        }}
                    >
                        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.4 }} />
                        <Typography variant="body2" color="text.secondary" textAlign="center" fontWeight={600}>
                            No conversations yet
                        </Typography>
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                            Click <strong>+</strong> to start a new conversation
                        </Typography>
                    </Box>
                )}

                {/* Conversations */}
                {conversations?.map((conv) => {
                    const isActive = activeConversationId === conv._id;
                    const unread = conv.unreadCount ?? 0;
                    return (
                        <ListItemButton
                            key={conv._id}
                            selected={isActive}
                            onClick={() => onSelectConversation(conv._id)}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                mb: 0.5,
                                "&.Mui-selected": {
                                    bgcolor: "rgba(108,71,255,0.12)",
                                    "&:hover": { bgcolor: "rgba(108,71,255,0.18)" },
                                },
                                "&:hover .delete-chat": { opacity: 1 },
                            }}
                        >
                            <ListItemAvatar>
                                <Box sx={{ position: "relative", display: "inline-block" }}>
                                    <Avatar
                                        src={conv.otherUser?.imageUrl ?? undefined}
                                        sx={{ width: 44, height: 44 }}
                                    >
                                        {conv.otherUser?.username?.[0]?.toUpperCase()}
                                    </Avatar>
                                    {conv.otherUser?.isOnline && (
                                        <Box
                                            sx={{
                                                position: "absolute", bottom: 1, right: 1,
                                                width: 10, height: 10, bgcolor: "#22c55e",
                                                borderRadius: "50%", border: "2px solid",
                                                borderColor: "background.paper",
                                            }}
                                        />
                                    )}
                                </Box>
                            </ListItemAvatar>
                            <ListItemText
                                primary={`${conv.otherUser?.username ?? "Unknown"}${conv.otherUser?._id === currentUserId ? " (You)" : ""}`}
                                primaryTypographyProps={{ variant: "body1", fontWeight: unread > 0 ? 700 : 600, noWrap: true }}
                                secondary={conv.lastMessage?.content ?? "No messages yet"}
                                secondaryTypographyProps={{
                                    variant: "body2",
                                    color: unread > 0 ? "text.primary" : "text.secondary",
                                    fontWeight: unread > 0 ? 600 : 400,
                                    noWrap: true
                                }}
                            />
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, ml: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                    {formatTimestamp(conv.lastMessage?._creationTime)}
                                </Typography>
                                {unread > 0 && !isActive ? (
                                    <Badge
                                        badgeContent={unread > 99 ? "99+" : unread}
                                        color="primary"
                                        sx={{
                                            "& .MuiBadge-badge": {
                                                position: "static",
                                                transform: "none",
                                                fontSize: 10,
                                                minWidth: 18,
                                                height: 18,
                                                fontWeight: 700,
                                            },
                                        }}
                                    />
                                ) : (
                                    <IconButton
                                        className="delete-chat"
                                        size="small"
                                        onClick={(e) => handleDeleteClick(e, conv._id)}
                                        sx={{
                                            opacity: 0,
                                            transition: "opacity 0.2s",
                                            color: "text.secondary",
                                            "&:hover": { color: "error.main" },
                                        }}
                                    >
                                        <DeleteRoundedIcon fontSize="inherit" />
                                    </IconButton>
                                )}
                            </Box>
                        </ListItemButton>
                    );
                })}
            </List>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "background.paper",
                        backgroundImage: "none",
                        borderRadius: 3,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Chat?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: "text.secondary" }}>
                        Are you sure you want to delete this conversation? Your message could be lost.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "text.secondary" }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: 2 }}
                    >
                        Delete Chat
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
