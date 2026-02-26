import { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    CircularProgress,
} from "@mui/material";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface AddToBundleDialogProps {
    open: boolean;
    onClose: () => void;
    userIdToAdd: Id<"users"> | null;
    currentWorkspaceId: Id<"workspaces"> | null;
}

export default function AddToBundleDialog({ open, onClose, userIdToAdd, currentWorkspaceId }: AddToBundleDialogProps) {
    const workspaces = useQuery(api.workspaces.getMyWorkspaces);
    const addMemberById = useMutation(api.workspaces.addMemberById);

    const [loading, setLoading] = useState(false);

    // Filter workspaces to only those the current user admins (which is what getMyWorkspaces returns now)
    // Let's also order or style the currentWorkspace if it exists, though they might already be in it

    // For simplicity, we just list all user-owned workspaces to add them to.

    const handleSelectWorkspace = async (workspaceId: Id<"workspaces">) => {
        if (!userIdToAdd) return;
        setLoading(true);
        try {
            await addMemberById({ workspaceId, userId: userIdToAdd });
            onClose();
        } catch (error) {
            console.error("Failed to add member to bundle", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: "background.paper", backgroundImage: "none", borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Add to Bundle</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select a Bundle to add this user to. They will then appear inside that Bundle's specific chat list.
                </Typography>

                {workspaces === undefined ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : workspaces.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center">
                        You do not own any Bundles yet.
                    </Typography>
                ) : (
                    <List disablePadding>
                        {workspaces.map((ws) => (
                            <ListItemButton
                                key={ws._id}
                                disabled={loading}
                                onClick={() => handleSelectWorkspace(ws._id)}
                                sx={{ borderRadius: 2, mb: 0.5, bgcolor: "action.hover", "&:hover": { bgcolor: "action.selected" } }}
                            >
                                <ListItemAvatar>
                                    {ws.imageUrl ? (
                                        <Avatar src={ws.imageUrl} sx={{ width: 40, height: 40 }} />
                                    ) : (
                                        <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main", color: "primary.contrastText" }}>
                                            {ws.name[0]?.toUpperCase()}
                                        </Avatar>
                                    )}
                                </ListItemAvatar>
                                <ListItemText
                                    primary={ws.name}
                                    secondary={currentWorkspaceId === ws._id ? "Current Bundle" : undefined}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ color: "text.secondary" }}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}
