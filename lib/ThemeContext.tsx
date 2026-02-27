"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
    mode: ThemeMode;
    toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: "dark",
    toggleColorMode: () => { },
});

export const useThemeContext = () => useContext(ThemeContext);

export function AppThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const storedTheme = localStorage.getItem("themeMode") as ThemeMode | null;
        if (storedTheme === "light" || storedTheme === "dark") {
            setMode(storedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
            setMode("light");
        }
    }, []);

    const toggleColorMode = () => {
        setMode((prev) => {
            const nextMode = prev === "light" ? "dark" : "light";
            localStorage.setItem("themeMode", nextMode);
            return nextMode;
        });
    };

    const theme = React.useMemo(() => {
        const isDark = mode === "dark";
        return createTheme({
            palette: {
                mode,
                primary: {
                    main: isDark ? "#ffffff" : "#2563eb", // vibrant blue for light mode primary
                    light: isDark ? "#cccccc" : "#60a5fa",
                    dark: isDark ? "#999999" : "#1d4ed8",
                    contrastText: isDark ? "#000000" : "#ffffff",
                },
                secondary: {
                    main: isDark ? "#a1a1aa" : "#64748b",
                    contrastText: "#ffffff",
                },
                background: {
                    default: isDark ? "#000000" : "#f8fafc", // off-white/gray background for light mode
                    paper: isDark ? "#111111" : "#ffffff", // clean white panels
                },
                text: {
                    primary: isDark ? "#ffffff" : "#0f172a", // deep slate for crisp text
                    secondary: isDark ? "rgba(255,255,255,0.7)" : "#475569", // slate gray for secondary 
                },
                divider: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", // softer dividers in light mode
                action: {
                    hover: isDark ? "rgba(255,255,255,0.05)" : "rgba(15, 23, 42, 0.04)",
                    selected: isDark ? "rgba(255,255,255,0.1)" : "rgba(15, 23, 42, 0.08)",
                }
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
                        root: { textTransform: "none", borderRadius: 8, fontWeight: 600 },
                        containedPrimary: {
                            backgroundColor: isDark ? "#ffffff" : "#2563eb",
                            color: isDark ? "#000000" : "#ffffff",
                            "&:hover": {
                                backgroundColor: isDark ? "#e0e0e0" : "#1d4ed8",
                                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                            }
                        }
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
                                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                                "&:hover": {
                                    backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"
                                },
                            },
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: {
                            backgroundImage: "none",
                        }
                    }
                }
            },
        });
    }, [mode]);


    if (!mounted) {
        return <div style={{ visibility: "hidden" }}>{children}</div>;
    }

    return (
        <ThemeContext.Provider value={{ mode, toggleColorMode }}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}
