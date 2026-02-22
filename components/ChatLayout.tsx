"use client";

import { useEffect, useState } from "react";
import { Box, Typography, useMediaQuery, useTheme, Button } from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import AddIcon from "@mui/icons-material/Add";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import UserSearchDialog from "./UserSearchDialog";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { Id } from "../convex/_generated/dataModel";

interface ChatLayoutProps {
    currentUserId: Id<"users">;
}

type MobileView = "list" | "chat";

export default function ChatLayout({ currentUserId }: ChatLayoutProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<Id<"workspaces"> | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileView, setMobileView] = useState<MobileView>("list");

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const workspaces = useQuery(api.workspaces.getMyWorkspaces);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Default to the first workspace if none selected
    useEffect(() => {
        if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
            setActiveWorkspaceId(workspaces[0]._id);
        }
    }, [workspaces, activeWorkspaceId]);

    function handleSelectConversation(id: Id<"conversations">) {
        setActiveConversationId(id);
        if (isMobile) setMobileView("chat");
    }

    function handleSelectWorkspace(id: Id<"workspaces">) {
        setActiveWorkspaceId(id);
        setActiveConversationId(null);
    }

    function handleBack() {
        setMobileView("list");
    }

    function handleConversationCreated(id: Id<"conversations">) {
        setActiveConversationId(id);
        setSearchOpen(false);
        if (isMobile) setMobileView("chat");
    }

    const conversations = useQuery(
        api.conversations.getMyConversations,
        activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip"
    );
    const hasConversations = conversations && conversations.length > 0;

    if (!isMounted) return null;

    return (
        <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
            {/* Workspace Sidebar (Bundles) — only on desktop for now */}
            {!isMobile && (
                <WorkspaceSidebar
                    activeWorkspaceId={activeWorkspaceId}
                    onSelectWorkspace={handleSelectWorkspace}
                />
            )}

            {/* Sidebar — always visible on desktop; only visible on mobile when mobileView=list */}
            <Box
                sx={{
                    display: {
                        xs: mobileView === "list" ? "flex" : "none",
                        md: "flex",
                    },
                    width: { xs: "100%", md: 300 },
                    minWidth: { xs: "100%", md: 300 },
                    flexShrink: 0,
                }}
            >
                <Sidebar
                    currentUserId={currentUserId}
                    activeConversationId={activeConversationId}
                    onSelectConversation={handleSelectConversation}
                    onOpenSearch={() => setSearchOpen(true)}
                    activeWorkspaceId={activeWorkspaceId}
                />
            </Box>

            {/* Chat area */}
            <Box
                sx={{
                    flex: 1,
                    display: {
                        xs: mobileView === "chat" ? "flex" : "none",
                        md: "flex",
                    },
                    flexDirection: "column",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {activeConversationId ? (
                    <ChatWindow
                        conversationId={activeConversationId}
                        currentUserId={currentUserId}
                        onBack={isMobile ? handleBack : undefined}
                    />
                ) : (
                    /* Desktop empty state — select a conversation */
                    <Box
                        sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "background.default",
                            gap: 2,
                            p: 3,
                        }}
                    >
                        <ChatBubbleOutlineRoundedIcon
                            sx={{ fontSize: 80, color: "primary.main", opacity: 0.3 }}
                        />
                        <Typography variant="h6" color="text.primary" fontWeight={800}>
                            {!activeWorkspaceId ? "Loading Bundles..." : hasConversations ? "Select a conversation" : "Start your first chat"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 300 }}>
                            {!activeWorkspaceId
                                ? "Waiting for your workspaces to load."
                                : hasConversations
                                    ? "Choose from your existing conversations to continue chatting."
                                    : "This bundle is empty. Find a friend by searching for their username or email."}
                        </Typography>
                        <Button
                            variant="contained"
                            disabled={!activeWorkspaceId}
                            onClick={() => setSearchOpen(true)}
                            startIcon={<AddIcon />}
                            sx={{
                                mt: 1,
                                borderRadius: 3,
                                fontWeight: 700,
                                px: 4,
                                py: 1.2,
                                background: "linear-gradient(135deg, #6c47ff 0%, #9b7fff 100%)",
                                boxShadow: "0 4px 12px rgba(108,71,255,0.3)",
                                "&:hover": { background: "linear-gradient(135deg, #5535e0 0%, #8a6ef0 100%)" },
                            }}
                        >
                            {hasConversations ? "New Conversation" : "Add Person"}
                        </Button>
                    </Box>
                )}
            </Box>

            <UserSearchDialog
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onConversationCreated={handleConversationCreated}
                activeWorkspaceId={activeWorkspaceId}
                currentUserId={currentUserId}
            />
        </Box>
    );
}
