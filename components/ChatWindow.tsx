"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    Box,
    AppBar,
    Toolbar,
    Avatar,
    Typography,
    Divider,
    IconButton,
    Fab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";

interface ChatWindowProps {
    conversationId: Id<"conversations">;
    currentUserId: Id<"users">;
    onBack?: () => void; // mobile back button
}

export default function ChatWindow({ conversationId, currentUserId, onBack }: ChatWindowProps) {
    const messages = useQuery(api.messages.getMessages, { conversationId });
    const sendMessage = useMutation(api.messages.sendMessage);
    const markAsRead = useMutation(api.messages.markAsRead);
    const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });

    // Get the other user directly for this specific conversation
    const conv = useQuery(api.conversations.getConversation, { conversationId });
    const otherUser = conv?.otherUser;

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const prevMessageCountRef = useRef(0);
    const [showNewMsgButton, setShowNewMsgButton] = useState(false);

    // Mark conversation as read when opened
    useEffect(() => {
        markAsRead({ conversationId }).catch(() => { });
    }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll handler — track if user has scrolled up
    const handleScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isAtBottom = distFromBottom < 100;
        isAtBottomRef.current = isAtBottom;
        setShowNewMsgButton(!isAtBottom);
    }, []);

    // When new messages arrive
    useEffect(() => {
        if (!messages) return;
        const currentCount = messages.length;
        const prevCount = prevMessageCountRef.current;

        if (currentCount > prevCount) {
            // New messages arrived
            if (isAtBottomRef.current) {
                // Auto-scroll to bottom
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                // Mark as read since they're visible at bottom
                markAsRead({ conversationId }).catch(() => { });
            } else {
                // User scrolled up — show button
                setShowNewMsgButton(true);
            }
        } else if (prevCount === 0 && currentCount > 0) {
            // Initial load — scroll to bottom
            bottomRef.current?.scrollIntoView({ behavior: "instant" });
        }
        prevMessageCountRef.current = currentCount;
    }, [messages, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    function scrollToBottom() {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMsgButton(false);
        markAsRead({ conversationId }).catch(() => { });
    }

    async function handleSend(content: string, type: "text" | "image" | "file" = "text", storageId?: Id<"_storage">) {
        await sendMessage({ conversationId, content, type, storageId });
        // Scroll to bottom on send
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    }

    function formatTimestamp(ts: number) {
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const isThisYear = d.getFullYear() === now.getFullYear();
        const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

        if (isToday) return time;
        if (isThisYear) {
            return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
        }
        return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}, ${time}`;
    }

    function getDateLabel(ts: number) {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return "Today";
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
        if (d.getFullYear() === now.getFullYear()) {
            return d.toLocaleDateString([], { month: "long", day: "numeric" });
        }
        return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
    }

    return (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
            {/* Header */}
            <AppBar
                position="static"
                elevation={0}
                sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}
            >
                <Toolbar sx={{ gap: 1.5 }}>
                    {/* Mobile back button */}
                    {onBack && (
                        <IconButton
                            edge="start"
                            onClick={onBack}
                            sx={{ color: "text.primary", display: { xs: "flex", md: "none" } }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    )}
                    <Box sx={{ position: "relative" }}>
                        <Avatar src={otherUser?.imageUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                            {otherUser?.username?.[0]?.toUpperCase()}
                        </Avatar>
                        {otherUser?.isOnline && (
                            <Box
                                sx={{
                                    position: "absolute", bottom: 1, right: 1,
                                    width: 10, height: 10, bgcolor: "success.main",
                                    borderRadius: "50%", border: "2px solid", borderColor: "background.paper",
                                }}
                            />
                        )}
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {otherUser?.username ?? "Loading…"}
                            {otherUser?._id === currentUserId && " (You)"}
                        </Typography>
                        <Typography variant="caption" color={otherUser?.isOnline ? "success.main" : "text.secondary"}>
                            {otherUser?.isOnline ? "Online" : "Offline"}
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Messages + floating button wrapper */}
            <Box sx={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Messages scroll area */}
                <Box
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    sx={{
                        flex: 1, overflowY: "auto", px: 3, py: 2,
                        display: "flex", flexDirection: "column", gap: 0.5,
                        bgcolor: "background.default",
                        "&::-webkit-scrollbar": { width: 4 },
                        "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 999 },
                    }}
                >
                    {/* Loading state */}
                    {messages === undefined && (
                        <Typography color="text.secondary" textAlign="center" mt={4}>
                            Loading messages…
                        </Typography>
                    )}

                    {/* Empty state */}
                    {messages?.length === 0 && (
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, py: 8 }}>
                            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 56, color: "text.primary", opacity: 0.4 }} />
                            <Typography variant="h6" color="text.secondary" fontWeight={600}>
                                No messages yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Say hello to <strong>{otherUser?.username ?? "them"}</strong>! 👋
                            </Typography>
                        </Box>
                    )}

                    {/* Message list */}
                    {messages?.map((msg, i) => {
                        const prevMsg = messages[i - 1];
                        const showDateSep = i === 0 || getDateLabel(msg._creationTime) !== getDateLabel(prevMsg._creationTime);
                        return (
                            <Box key={msg._id}>
                                {showDateSep && (
                                    <Box sx={{ display: "flex", alignItems: "center", my: 2, gap: 2 }}>
                                        <Divider sx={{ flex: 1 }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {getDateLabel(msg._creationTime)}
                                        </Typography>
                                        <Divider sx={{ flex: 1 }} />
                                    </Box>
                                )}
                                <MessageBubble
                                    messageId={msg._id}
                                    content={msg.content}
                                    senderId={msg.senderId}
                                    senderImageUrl={msg.sender?.imageUrl ?? undefined}
                                    senderUsername={msg.sender?.username ?? undefined}
                                    currentUserId={currentUserId}
                                    createdAt={msg._creationTime}
                                    isEdited={msg.isEdited}
                                    deletedAt={msg.deletedAt}
                                    isRead={msg.isRead}
                                    type={msg.type as "text" | "image" | "file"}
                                    isSelfChat={otherUser?._id === currentUserId}
                                    formatTimestamp={formatTimestamp}
                                />
                            </Box>
                        );
                    })}

                    {/* Typing indicator */}
                    {typingUsers && typingUsers.length > 0 && (
                        <TypingIndicator typingUsers={typingUsers} />
                    )}

                    <div ref={bottomRef} />
                </Box>

                {/* ↓ Scroll to bottom button */}
                {showNewMsgButton && (
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 16,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 10,
                        }}
                    >
                        <Fab
                            size="small"
                            color="primary"
                            onClick={scrollToBottom}
                            sx={{
                                width: 40,
                                height: 40,
                                boxShadow: 3,
                            }}
                        >
                            <KeyboardArrowDownIcon />
                        </Fab>
                    </Box>
                )}
            </Box>

            <MessageInput onSend={handleSend} conversationId={conversationId} />
        </Box>
    );
}
