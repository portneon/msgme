"use client";

import { Box, Typography } from "@mui/material";
import type { Id } from "../convex/_generated/dataModel";

interface MessageBubbleProps {
    content: string;
    senderId: Id<"users">;
    senderImageUrl?: string;
    senderUsername?: string;
    currentUserId: Id<"users">;
    createdAt: number;
    isEdited: boolean;
    type: "text" | "image" | "file";
    formatTimestamp?: (ts: number) => string;
}

export default function MessageBubble({
    content,
    senderId,
    senderImageUrl,
    senderUsername,
    currentUserId,
    createdAt,
    isEdited,
    type,
    formatTimestamp,
}: MessageBubbleProps) {
    const isMine = senderId === currentUserId;

    const defaultFormat = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const isThisYear = d.getFullYear() === now.getFullYear();
        const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (isToday) return time;
        if (isThisYear) {
            return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
        }
        return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}, ${time}`;
    };

    const timeLabel = formatTimestamp ? formatTimestamp(createdAt) : defaultFormat(createdAt);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMine ? "flex-end" : "flex-start",
                mb: 1,
            }}
        >
            {!isMine && (
                <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.3, ml: 1.5 }}>
                    {senderUsername}
                </Typography>
            )}
            <Box
                sx={{
                    maxWidth: "65%",
                    px: 2,
                    py: 1.2,
                    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    bgcolor: isMine ? "primary.main" : "background.paper",
                    boxShadow: isMine
                        ? "0 2px 12px rgba(108,71,255,0.35)"
                        : "0 2px 8px rgba(0,0,0,0.3)",
                    wordBreak: "break-word",
                }}
            >
                {type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={content}
                        alt="shared"
                        style={{ maxWidth: "100%", borderRadius: 8 }}
                    />
                ) : (
                    <Typography variant="body1" sx={{ color: isMine ? "#fff" : "text.primary", lineHeight: 1.5 }}>
                        {content}
                    </Typography>
                )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    {timeLabel}
                </Typography>
                {isEdited && (
                    <Typography variant="caption" color="text.secondary">
                        · edited
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
