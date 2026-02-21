"use client";

import { useState } from "react";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import UserSearchDialog from "./UserSearchDialog";
import type { Id } from "../convex/_generated/dataModel";

interface ChatLayoutProps {
    currentUserId: Id<"users">;
}

type MobileView = "list" | "chat";

export default function ChatLayout({ currentUserId }: ChatLayoutProps) {
    const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileView, setMobileView] = useState<MobileView>("list");

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    function handleSelectConversation(id: Id<"conversations">) {
        setActiveConversationId(id);
        if (isMobile) setMobileView("chat");
    }

    function handleBack() {
        setMobileView("list");
    }

    function handleConversationCreated(id: Id<"conversations">) {
        setActiveConversationId(id);
        setSearchOpen(false);
        if (isMobile) setMobileView("chat");
    }

    return (
        <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
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
                        }}
                    >
                        <ChatBubbleOutlineRoundedIcon
                            sx={{ fontSize: 80, color: "primary.main", opacity: 0.3 }}
                        />
                        <Typography variant="h6" color="text.secondary" fontWeight={700}>
                            Select a conversation
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Choose from your existing conversations or click{" "}
                            <strong style={{ color: "inherit" }}>+</strong> to start a new one
                        </Typography>
                    </Box>
                )}
            </Box>

            <UserSearchDialog
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onConversationCreated={handleConversationCreated}
            />
        </Box>
    );
}
