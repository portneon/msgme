"use client";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#6c47ff",
            light: "#9b7fff",
            dark: "#4a2fd6",
        },
        background: {
            default: "#0f0f13",
            paper: "#1a1a24",
        },
        text: {
            primary: "#f0f0f5",
            secondary: "#9898b0",
        },
        divider: "rgba(255,255,255,0.07)",
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: { fontWeight: 600 },
        body2: { fontSize: "0.8rem" },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { textTransform: "none", borderRadius: 8 },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    "& .MuiOutlinedInput-root": {
                        borderRadius: 10,
                    },
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    margin: "2px 8px",
                    "&.Mui-selected": {
                        backgroundColor: "rgba(108,71,255,0.2)",
                        "&:hover": { backgroundColor: "rgba(108,71,255,0.3)" },
                    },
                },
            },
        },
    },
});

export default theme;
