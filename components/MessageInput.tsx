"use client";

import { useState, useRef, KeyboardEvent, useCallback, ChangeEvent } from "react";
import { Box, TextField, IconButton, Paper, CircularProgress, Popover } from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SentimentSatisfiedOutlinedIcon from "@mui/icons-material/SentimentSatisfiedOutlined";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "@mui/material/styles";
import { useMutation } from "convex/react";
import browserImageCompression from "browser-image-compression";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface MessageInputProps {
    onSend: (content: string, type: "text" | "image" | "file", storageId?: Id<"_storage">) => void;
    disabled?: boolean;
    conversationId: Id<"conversations">;
}

export default function MessageInput({ onSend, disabled, conversationId }: MessageInputProps) {
    const [text, setText] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
    const emojiPopoverOpen = Boolean(emojiAnchorEl);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const theme = useTheme();

    const setTyping = useMutation(api.typing.setTyping);
    const clearTyping = useMutation(api.typing.clearTyping);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

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

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Compress image if it's an image file
            const isImage = file.type.startsWith("image/");
            if (isImage) {
                const options = {
                    maxSizeMB: 1,          // MAX 1 MB
                    maxWidthOrHeight: 1280, // MAX 1280px
                    useWebWorker: true,
                };
                file = await browserImageCompression(file, options);
            }

            // 1. Get a short-lived upload URL
            const postUrl = await generateUploadUrl();

            // 2. Post the file to the URL
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            // 3. Send the message
            const type = isImage ? "image" : "file";
            onSend(file.name, type, storageId);

            // Clear input
            e.target.value = "";
        } catch (error) {
            console.error("Upload failed", error);
            // Could add an alert or toast here for user feedback
        } finally {
            setIsUploading(false);
        }
    };

    function handleSend() {
        const trimmed = text.trim();
        if (!trimmed) return;
        // Clear typing before sending
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        stopTyping();
        onSend(trimmed, "text");
        setText("");
    }

    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const handleEmojiClick = (event: React.MouseEvent<HTMLElement>) => {
        setEmojiAnchorEl(event.currentTarget);
    };

    const handleEmojiClose = () => {
        setEmojiAnchorEl(null);
    };

    const onEmojiClick = (emojiObject: any) => {
        handleChange(text + emojiObject.emoji);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, p: 1.5 }}>
                <IconButton
                    size="small"
                    sx={{ color: "text.secondary", mb: 0.5 }}
                    onClick={handleFileClick}
                    disabled={disabled || isUploading}
                >
                    {isUploading ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : (
                        <AttachFileIcon fontSize="small" />
                    )}
                </IconButton>
                <IconButton
                    size="small"
                    sx={{ color: "text.secondary", mb: 0.5 }}
                    onClick={handleEmojiClick}
                    disabled={disabled || isUploading}
                >
                    <SentimentSatisfiedOutlinedIcon fontSize="small" />
                </IconButton>
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message… (Enter to send)"
                    value={text}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isUploading}
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
                    disabled={disabled || isUploading || !text.trim()}
                    sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        mb: 0.5,
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                        "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
                    }}
                >
                    <SendRoundedIcon fontSize="small" />
                </IconButton>
            </Box>

            <Popover
                open={emojiPopoverOpen}
                anchorEl={emojiAnchorEl}
                onClose={handleEmojiClose}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "left",
                }}
                transformOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                }}
                slotProps={{
                    paper: {
                        sx: { mb: 1, borderRadius: 3 },
                    },
                }}
            >
                <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={theme.palette.mode === "dark" ? Theme.DARK : Theme.LIGHT}
                    lazyLoadEmojis={true}
                />
            </Popover>
        </Paper>
    );
}
