"use client";

import { useEffect, useState, ChangeEvent } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Avatar,
    IconButton,
    Typography,
    CircularProgress,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import browserImageCompression from "browser-image-compression";
import { useThemeContext } from "../lib/ThemeContext";
import { FormControlLabel, Switch, Divider } from "@mui/material";
import type { Id } from "../convex/_generated/dataModel";

interface ProfileDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
    const user = useQuery(api.users.getCurrentUser);
    const updateProfile = useMutation(api.users.updateProfile);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [imageId, setImageId] = useState<Id<"_storage"> | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { mode, toggleColorMode } = useThemeContext();

    useEffect(() => {
        if (user && open) {
            setUsername(user.customUsername ?? user.username ?? "");
            setBio(user.bio ?? "");
            setImageUrl(user.customImageUrl ?? user.imageUrl ?? "");
        }
    }, [user, open]);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
            file = await browserImageCompression(file, options);

            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            // Set the local image URL for a fast preview
            setImageUrl(URL.createObjectURL(file));
            setImageId(storageId);

        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates: any = { customUsername: username, bio };
            // If they uploaded a new image, send the imageId.
            if (imageId) {
                updates.imageId = imageId;
            } else if (imageUrl !== user?.customImageUrl && imageUrl !== "") {
                // If they didn't upload a new one but maybe image URL changed somehow
                updates.customImageUrl = imageUrl;
            }

            await updateProfile(updates);
            onClose();
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, my: 2 }}>
                    <Box sx={{ position: "relative" }}>
                        <Avatar src={imageUrl} sx={{ width: 80, height: 80 }}>
                            {username?.[0]?.toUpperCase()}
                        </Avatar>
                        <IconButton
                            component="label"
                            size="small"
                            sx={{
                                position: "absolute",
                                bottom: -4,
                                right: -4,
                                bgcolor: "background.paper",
                                boxShadow: 1,
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                            disabled={isUploading}
                        >
                            {isUploading ? <CircularProgress size={16} /> : <PhotoCameraIcon fontSize="small" />}
                            <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                        </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Click to change photo
                    </Typography>
                </Box>

                <TextField
                    label="Name"
                    fullWidth
                    size="small"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <TextField
                    label="Bio"
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                />

                <Divider sx={{ mt: 1, mb: 0 }} />
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Appearance</Typography>
                <FormControlLabel
                    control={<Switch checked={mode === "dark"} onChange={toggleColorMode} />}
                    label="Dark Mode"
                />
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
