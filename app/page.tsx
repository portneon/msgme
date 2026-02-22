"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import ChatLayout from "../components/ChatLayout";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [upsertDone, setUpsertDone] = useState(false);

  // Clerk: source of truth for "is the user signed in"
  const { user, isLoaded, isSignedIn } = useUser();
  const { redirectToSignIn } = useClerk();

  // Convex: source of truth for "can we make authenticated Convex calls"
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const upsertUser = useMutation(api.users.upsertUser);
  const setOffline = useMutation(api.users.setOffline);

  // Query current user from Convex (only when Convex auth is ready)
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => { setMounted(true); }, []);

  // Mark user offline when the tab closes
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleUnload = () => {
      setOffline({}).catch(() => { });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);


  // Upsert user to Convex once Convex auth is confirmed
  useEffect(() => {
    if (!isAuthenticated || !user || upsertDone) return;
    const username =
      user.username ||
      `${user.firstName ?? ""}${user.lastName ?? ""}`.trim() ||
      user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "User";
    upsertUser({
      username,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: user.imageUrl,
    })
      .then(() => setUpsertDone(true))
      .catch((err) => {
        console.error("upsertUser failed:", err);
        setUpsertDone(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Wait for mounting and Clerk loading
  if (!mounted || !isLoaded || convexLoading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f0f10" }}>
        <CircularProgress sx={{ color: "#6c47ff" }} />
      </Box>
    );
  }

  // NOT signed in with Clerk → show landing page
  if (!isSignedIn) {
    return (
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "background.default", gap: 3 }}>
        <ChatBubbleRoundedIcon sx={{ fontSize: 72, color: "primary.main" }} />
        <Typography variant="h4" fontWeight={800} color="text.primary">
          Welcome to MsgMe
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sign in to start chatting with friends
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => redirectToSignIn()}
          sx={{
            borderRadius: 3,
            px: 4,
            py: 1.5,
            fontWeight: 700,
            fontSize: 16,
            background: "linear-gradient(135deg, #6c47ff 0%, #9b7fff 100%)",
            boxShadow: "0 4px 20px rgba(108,71,255,0.4)",
            "&:hover": { background: "linear-gradient(135deg, #5535e0 0%, #8a6ef0 100%)" },
          }}
        >
          Sign In
        </Button>
      </Box>
    );
  }

  // Signed in + Convex user already exists → show chat immediately (upsert runs in background)
  if (currentUser) {
    return <ChatLayout currentUserId={currentUser._id} />;
  }

  // Convex auth still loading or first-time user being registered → brief spinner
  if (convexLoading || currentUser === undefined) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
        <CircularProgress sx={{ color: "primary.main" }} />
      </Box>
    );
  }

  // Fallback: signed in with Clerk but Convex JWT not working yet
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "background.default", gap: 2 }}>
      <CircularProgress sx={{ color: "primary.main" }} />
      <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
        Finishing setup… If this persists, make sure the{" "}
        <strong>Convex JWT template</strong> is created in your Clerk dashboard.
      </Typography>
    </Box>
  );
}