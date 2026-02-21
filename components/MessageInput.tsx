"use client";

import { useState, useRef, KeyboardEvent, useCallback } from "react";
import { Box, TextField, IconButton, Paper } from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface MessageInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    conversationId: Id<"conversations">;
}

export default function MessageInput({ onSend, disabled, conversationId }: MessageInputProps) {
    const [text, setText] = useState("");
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const setTyping = useMutation(api.typing.setTyping);
    const clearTyping = useMutation(api.typing.clearTyping);

    const stopTyping = useCallback(() => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            clearTyping({ conversationId }).catch(() => { });
        }
    }, [clearTyping, conversationId]);

    function handleChange(value: string) {
        setText(value);

        // Emit typing event
        if (value.trim()) {
            if (!isTypingRef.current) {
                isTypingRef.current = true;
                setTyping({ conversationId }).catch(() => { });
            }
            // Reset the auto-clear timeout
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                stopTyping();
            }, 2000);
        } else {
            // Empty input — stop typing immediately
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            stopTyping();
        }
    }

    function handleSend() {
        const trimmed = text.trim();
        if (!trimmed) return;
        // Clear typing before sending
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        stopTyping();
        onSend(trimmed);
        setText("");
    }

    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 1,
                p: 1.5,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <IconButton size="small" sx={{ color: "text.secondary", mb: 0.5 }}>
                <AttachFileIcon fontSize="small" />
            </IconButton>
            <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                variant="outlined"
                size="small"
                sx={{
                    "& .MuiOutlinedInput-root": {
                        bgcolor: "background.default",
                        borderRadius: 3,
                    },
                }}
            />
            <IconButton
                onClick={handleSend}
                disabled={disabled || !text.trim()}
                sx={{
                    bgcolor: "primary.main",
                    color: "#fff",
                    mb: 0.5,
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    "&:hover": { bgcolor: "primary.dark" },
                    "&.Mui-disabled": { bgcolor: "rgba(108,71,255,0.3)", color: "rgba(255,255,255,0.4)" },
                }}
            >
                <SendRoundedIcon fontSize="small" />
            </IconButton>
        </Paper>
    );
}
