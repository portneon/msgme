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

  const { user, isLoaded, isSignedIn } = useUser();
  const { redirectToSignIn } = useClerk();

 
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const upsertUser = useMutation(api.users.upsertUser);
  const setOffline = useMutation(api.users.setOffline);

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => { setMounted(true); }, []);


  useEffect(() => {
    if (!isAuthenticated) return;
    const handleUnload = () => {
      setOffline({}).catch(() => { });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);

  }, [isAuthenticated]);


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
  }, [isAuthenticated, user]);

  // Wait for mounting and Clerk loading
  if (!mounted || !isLoaded || convexLoading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f0f10" }}>
        <CircularProgress sx={{ color: "primary.main" }} />
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
            background: "primary.main",
            color: "primary.contrastText",
            boxShadow: 3,
            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
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