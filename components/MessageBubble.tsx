import { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    TextField,
    Link,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface MessageBubbleProps {
    messageId: Id<"messages">;
    content: string;
    senderId: Id<"users">;
    senderImageUrl?: string;
    senderUsername?: string;
    currentUserId: Id<"users">;
    createdAt: number;
    isEdited: boolean;
    deletedAt?: number;
    isRead?: boolean;
    type: "text" | "image" | "file";
    isSelfChat?: boolean;
    formatTimestamp?: (ts: number) => string;
}

export default function MessageBubble({
    messageId,
    content,
    senderId,
    senderImageUrl,
    senderUsername,
    currentUserId,
    createdAt,
    isEdited,
    deletedAt,
    isRead,
    type,
    isSelfChat,
    formatTimestamp,
}: MessageBubbleProps) {
    const isMine = senderId === currentUserId;
    const effectiveIsRead = isSelfChat ? true : isRead;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(content);

    const editMutation = useMutation(api.messages.editMessage);
    const deleteMutation = useMutation(api.messages.deleteMessage);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleEditStart = () => {
        setIsEditing(true);
        handleCloseMenu();
    };

    const handleEditSave = async () => {
        if (editValue.trim() && editValue !== content) {
            await editMutation({ messageId, content: editValue.trim() });
        }
        setIsEditing(false);
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditValue(content);
    };

    const handleDelete = async (deleteType: "me" | "everyone") => {
        await deleteMutation({ messageId, type: deleteType });
        handleCloseMenu();
    };

    const defaultFormat = (ts: number) => {
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
    };

    const timeLabel = formatTimestamp ? formatTimestamp(createdAt) : defaultFormat(createdAt);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMine ? "flex-end" : "flex-start",
                mb: 1,
                position: "relative",
                "&:hover .message-actions": { opacity: 1 },
            }}
        >
            {(!isMine || isSelfChat) && (
                <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.3, ml: 1.5 }}>
                    {senderUsername}
                    {senderId === currentUserId && " (You)"}
                </Typography>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexDirection: isMine ? "row" : "row-reverse" }}>
                {!isEditing && !deletedAt && (
                    <IconButton
                        className="message-actions"
                        size="small"
                        onClick={handleOpenMenu}
                        sx={{
                            opacity: 0,
                            transition: "opacity 0.2s",
                            color: "text.secondary",
                            bgcolor: "action.hover",
                            "&:hover": { bgcolor: "action.selected" },
                        }}
                    >
                        <MoreVertIcon fontSize="inherit" />
                    </IconButton>
                )}

                <Box
                    sx={{
                        maxWidth: "100%",
                        px: 2,
                        py: 1.2,
                        borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        bgcolor: deletedAt ? "transparent" : (isMine ? "primary.main" : "background.paper"),
                        boxShadow: deletedAt ? "none" : (isMine
                            ? "0 2px 12px rgba(0,0,0,0.1)"
                            : "0 2px 8px rgba(0,0,0,0.1)"),
                        border: deletedAt ? "1px dashed" : "none",
                        borderColor: "divider",
                        wordBreak: "break-word",
                    }}
                >
                    {isEditing ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 200 }}>
                            <TextField
                                fullWidth
                                multiline
                                size="small"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                                sx={{
                                    "& .MuiInputBase-root": { color: "primary.contrastText", fontSize: "0.875rem" },
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                                }}
                            />
                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                <IconButton size="small" onClick={handleEditCancel} sx={{ color: "primary.contrastText", opacity: 0.7 }}>
                                    <CloseRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={handleEditSave} sx={{ color: "primary.contrastText" }}>
                                    <CheckRoundedIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Box>
                    ) : deletedAt ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            This message is deleted by {isMine ? "you" : "admin"}
                        </Typography>
                    ) : type === "image" ? (
                        <Link href={content} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={content}
                                alt="shared"
                                style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer", display: "block" }}
                            />
                        </Link>
                    ) : type === "file" ? (
                        <Link
                            href={content}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                textDecoration: "none",
                                color: isMine ? "primary.contrastText" : "primary.main"
                            }}
                        >
                            <InsertDriveFileRoundedIcon />
                            <Typography variant="body2" sx={{ textDecoration: "underline" }}>
                                Download Attachment
                            </Typography>
                        </Link>
                    ) : (
                        <Typography variant="body1" sx={{ color: isMine ? "primary.contrastText" : "text.primary", lineHeight: 1.5 }}>
                            {content}
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    {timeLabel}
                </Typography>
                {isEdited && !deletedAt && (
                    <Typography variant="caption" color="text.secondary">
                        · edited
                    </Typography>
                )}
                {isMine && !deletedAt && (
                    <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
                        <Typography
                            variant="caption"
                            sx={{ color: effectiveIsRead ? "primary.main" : "text.secondary", fontSize: 16, lineHeight: 1 }}
                        >
                            {effectiveIsRead ? "✓✓" : "✓"}
                        </Typography>
                    </Box>
                )}
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                transformOrigin={{ horizontal: isMine ? "right" : "left", vertical: "top" }}
                anchorOrigin={{ horizontal: isMine ? "right" : "left", vertical: "bottom" }}
                PaperProps={{
                    sx: {
                        bgcolor: "background.paper",
                        backgroundImage: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        borderRadius: 2,
                        minWidth: 150,
                    },
                }}
            >
                {isMine && type === "text" && !deletedAt && (
                    <MenuItem onClick={handleEditStart}>
                        <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Edit" />
                    </MenuItem>
                )}
                <MenuItem onClick={() => handleDelete("me")}>
                    <ListItemIcon><DeleteRoundedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Delete for me" />
                </MenuItem>
                {isMine && !deletedAt && (
                    <MenuItem onClick={() => handleDelete("everyone")} sx={{ color: "error.main" }}>
                        <ListItemIcon><DeleteRoundedIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText primary="Delete for everyone" />
                    </MenuItem>
                )}
            </Menu>
        </Box>
    );
}

