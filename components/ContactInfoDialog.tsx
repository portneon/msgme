"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Avatar,
    Typography,
} from "@mui/material";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface ContactInfoDialogProps {
    open: boolean;
    onClose: () => void;
    contactUserId: Id<"users"> | null;
    initialAlias?: string;
}

export default function ContactInfoDialog({ open, onClose, contactUserId, initialAlias }: ContactInfoDialogProps) {
    const setContactAlias = useMutation(api.users.setContactAlias);
    const users = useQuery(api.users.getAllUsers);
    const contactUser = users?.find((u) => u._id === contactUserId);

    const [alias, setAlias] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setAlias(initialAlias || "");
        }
    }, [open, initialAlias]);

    const handleSave = async () => {
        if (!contactUserId) return;
        setIsSaving(true);
        try {
            await setContactAlias({
                contactUserId,
                alias: alias.trim(),
            });
            onClose();
        } catch (error) {
            console.error("Failed to set alias", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!contactUser) return null;

    const displayUsername = contactUser.customUsername || contactUser.username;
    const displayImageUrl = contactUser.customImageUrl || contactUser.imageUrl;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Contact Info</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>

                {/* Profile Info */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, my: 1 }}>
                    <Avatar src={displayImageUrl} sx={{ width: 80, height: 80 }}>
                        {displayUsername[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" fontWeight={600}>
                        {displayUsername}
                    </Typography>
                    {contactUser.bio && (
                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ fontStyle: "italic", px: 2 }}>
                            "{contactUser.bio}"
                        </Typography>
                    )}
                </Box>

                {/* Alias Input */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                        Custom Contact Name
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Set a custom name for this person. Only you will see this.
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={displayUsername}
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                    />
                </Box>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
