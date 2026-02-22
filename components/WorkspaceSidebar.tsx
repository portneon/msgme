"use client";

import { Box, IconButton, Tooltip, Avatar, Popover, TextField, Button, Typography, Divider } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";

interface WorkspaceSidebarProps {
    activeWorkspaceId: Id<"workspaces"> | null;
    onSelectWorkspace: (id: Id<"workspaces">) => void;
}

export default function WorkspaceSidebar({ activeWorkspaceId, onSelectWorkspace }: WorkspaceSidebarProps) {
    const workspaces = useQuery(api.workspaces.getMyWorkspaces);
    const createWorkspace = useMutation(api.workspaces.createWorkspace);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [newName, setNewName] = useState("");

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
                bgcolor: "#09090b",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
                gap: 2,
                borderRight: "1px solid",
                borderColor: "rgba(255,255,255,0.05)",
                flexShrink: 0,
            }}
        >
            {/* Workspaces List */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, overflowY: "auto", width: "100%" }}>
                {workspaces?.map((ws) => (
                    <Tooltip key={ws._id} title={ws.name} placement="right">
                        <IconButton
                            onClick={() => onSelectWorkspace(ws._id)}
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: activeWorkspaceId === ws._id ? "16px" : "50%",
                                bgcolor: activeWorkspaceId === ws._id ? "primary.main" : "rgba(255,255,255,0.05)",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                    borderRadius: "16px",
                                    bgcolor: activeWorkspaceId === ws._id ? "primary.main" : "rgba(255,255,255,0.1)",
                                },
                            }}
                        >
                            {ws.imageUrl ? (
                                <Avatar src={ws.imageUrl} sx={{ width: "100%", height: "100%" }} />
                            ) : (
                                <Typography variant="h6" fontWeight={700} sx={{ color: "white" }}>
                                    {ws.name[0]}
                                </Typography>
                            )}
                        </IconButton>
                    </Tooltip>
                ))}

                <Divider sx={{ width: "60%", borderColor: "rgba(255,255,255,0.1)" }} />

                {/* Add Workspace Button */}
                <Tooltip title="Create Bundle" placement="right">
                    <IconButton
                        onClick={handleOpen}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "rgba(255,255,255,0.05)",
                            color: "#22c55e",
                            "&:hover": { bgcolor: "rgba(34, 197, 94, 0.1)", borderRadius: "16px" },
                        }}
                    >
                        <AddIcon />
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
                    sx: { p: 2, ml: 2, bgcolor: "#18181b", backgroundImage: "none", borderRadius: 3, minWidth: 240 }
                }}
            >
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: "white" }}>New Bundle</Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. Work, Family..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    sx={{ mb: 2, "& .MuiInputBase-root": { bgcolor: "rgba(255,255,255,0.05)" } }}
                />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button onClick={handleClose} size="small" sx={{ color: "text.secondary" }}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" size="small" sx={{ borderRadius: 2 }}>Create</Button>
                </Box>
            </Popover>
        </Box>
    );
}
