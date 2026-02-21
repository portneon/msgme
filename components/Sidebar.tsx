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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface SidebarProps {
    currentUserId: Id<"users">;
    activeConversationId: Id<"conversations"> | null;
    onSelectConversation: (id: Id<"conversations">) => void;
    onOpenSearch: () => void;
}

function formatTimestamp(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isThisYear = d.getFullYear() === now.getFullYear();

    if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isThisYear) {
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

export default function Sidebar({
    currentUserId,
    activeConversationId,
    onSelectConversation,
    onOpenSearch,
}: SidebarProps) {
    const { user } = useUser();
    const conversations = useQuery(api.conversations.getMyConversations);

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
                                primary={
                                    <Typography variant="body1" fontWeight={unread > 0 ? 700 : 600} noWrap>
                                        {conv.otherUser?.username ?? "Unknown"}
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="body2"
                                        color={unread > 0 ? "text.primary" : "text.secondary"}
                                        fontWeight={unread > 0 ? 600 : 400}
                                        noWrap
                                    >
                                        {conv.lastMessage?.content ?? "No messages yet"}
                                    </Typography>
                                }
                            />
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, ml: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                    {formatTimestamp(conv.lastMessage?._creationTime)}
                                </Typography>
                                {unread > 0 && !isActive && (
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
                                )}
                            </Box>
                        </ListItemButton>
                    );
                })}
            </List>
        </Box>
    );
}
