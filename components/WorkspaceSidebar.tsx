"use client";

import { Box, IconButton, Tooltip, Avatar, Popover, TextField, Button, Typography, Divider } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { useThemeContext } from "../lib/ThemeContext";
import ProfileDialog from "./ProfileDialog";

interface WorkspaceSidebarProps {
    activeWorkspaceId: Id<"workspaces"> | null;
    onSelectWorkspace: (id: Id<"workspaces">) => void;
}

export default function WorkspaceSidebar({ activeWorkspaceId, onSelectWorkspace }: WorkspaceSidebarProps) {
    const workspaces = useQuery(api.workspaces.getMyWorkspaces);
    const createWorkspace = useMutation(api.workspaces.createWorkspace);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [newName, setNewName] = useState("");
    const { mode, toggleColorMode } = useThemeContext();
    const [profileOpen, setProfileOpen] = useState(false);

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setNewName("");
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        const id = await createWorkspace({ name: newName });
        onSelectWorkspace(id);
        handleClose();
    };

    return (
        <Box
            sx={{
                width: 72,
                height: "100vh",
                bgcolor: "background.default",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
                gap: 2,
                borderRight: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
            }}
        >
            {/* Workspaces List (Scrollable) */}
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    overflowY: "auto",
                    width: "100%",
                    "&::-webkit-scrollbar": { display: "none" }, // optional: hide scrollbar for cleaner look
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                }}
            >
                {workspaces?.map((ws) => (
                    <Tooltip key={ws._id} title={ws.name} placement="right">
                        <IconButton
                            onClick={() => onSelectWorkspace(ws._id)}
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: activeWorkspaceId === ws._id ? "16px" : "50%",
                                bgcolor: activeWorkspaceId === ws._id ? "primary.main" : "action.hover",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                    borderRadius: "16px",
                                    bgcolor: activeWorkspaceId === ws._id ? "primary.main" : "action.selected",
                                },
                            }}
                        >
                            {ws.imageUrl ? (
                                <Avatar src={ws.imageUrl} sx={{ width: "100%", height: "100%" }} />
                            ) : (
                                <Typography variant="h6" fontWeight={700} sx={{ color: activeWorkspaceId === ws._id ? "primary.contrastText" : "text.primary" }}>
                                    {ws.name[0]}
                                </Typography>
                            )}
                        </IconButton>
                    </Tooltip>
                ))}
            </Box>

            {/* Fixed Bottom Actions */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%", mt: "auto" }}>
                <Divider sx={{ width: "60%", borderColor: "divider" }} />

                <Tooltip title="Create Bundle" placement="right">
                    <IconButton
                        onClick={handleOpen}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "action.hover",
                            color: "text.primary",
                            "&:hover": { bgcolor: "action.selected", borderRadius: "16px" },
                        }}
                    >
                        <AddIcon />
                    </IconButton>
                </Tooltip>

                {/* Settings Toggle Button */}
                <Tooltip title="Settings" placement="right">
                    <IconButton
                        onClick={() => setProfileOpen(true)}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "transparent",
                            color: "text.secondary",
                            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                        }}
                    >
                        <SettingsOutlinedIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "center", horizontal: "right" }}
                transformOrigin={{ vertical: "center", horizontal: "left" }}
                PaperProps={{
                    sx: { p: 2, ml: 2, bgcolor: "background.paper", backgroundImage: "none", borderRadius: 3, minWidth: 240 }
                }}
            >
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: "text.primary" }}>New Bundle</Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. Work, Family..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button onClick={handleClose} size="small" sx={{ color: "text.secondary" }}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" size="small" sx={{ borderRadius: 2 }}>Create</Button>
                </Box>
            </Popover>

            <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
        </Box>
    );
}
