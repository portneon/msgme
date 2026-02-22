"use client";

import { useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Typography, Box, Alert
} from "@mui/material";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface AddMemberDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: Id<"workspaces"> | null;
}

export default function AddMemberDialog({ open, onClose, workspaceId }: AddMemberDialogProps) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const addMember = useMutation(api.workspaces.addMember);

    const handleAdd = async () => {
        if (!workspaceId || !email.trim()) return;
        setLoading(true);
        setError("");
        try {
            await addMember({ workspaceId, email: email.trim() });
            onClose();
            setEmail("");
        } catch (err: any) {
            setError(err.message || "Failed to add member. Make sure the email is correct.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: "background.paper", backgroundImage: "none" } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Invite to Bundle</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Add someone to this bundle by their email address. They must already have an account.
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField
                    autoFocus
                    fullWidth
                    label="Email Address"
                    placeholder="friend@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    size="small"
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} disabled={loading} sx={{ color: "text.secondary" }}>Cancel</Button>
                <Button onClick={handleAdd} variant="contained" disabled={loading || !email.trim()} sx={{ borderRadius: 2 }}>
                    {loading ? "Adding..." : "Add Member"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
