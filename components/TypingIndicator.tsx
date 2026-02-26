"use client";

import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";

const bounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
`;

interface TypingIndicatorProps {
    typingUsers: string[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const label =
        typingUsers.length === 1
            ? `${typingUsers[0]} is typing`
            : typingUsers.length === 2
                ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
                : "Several people are typing";

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1,
                animation: "fadeIn 0.2s ease",
                "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
        >
            {/* Pulsing dots */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    bgcolor: "background.paper",
                    px: 1.5,
                    py: 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
            >
                {[0, 1, 2].map((i) => (
                    <Box
                        key={i}
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "text.secondary",
                            animation: `${bounce} 1.2s ease-in-out infinite`,
                            animationDelay: `${i * 0.2}s`,
                        }}
                    />
                ))}
            </Box>
            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                {label}
            </Typography>
        </Box>
    );
}
