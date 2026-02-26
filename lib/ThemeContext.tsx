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
                    main: isDark ? "#ffffff" : "#000000",
                    contrastText: isDark ? "#000000" : "#ffffff",
                },
                background: {
                    default: isDark ? "#000000" : "#ffffff",
                    paper: isDark ? "#111111" : "#f5f5f5",
                },
                text: {
                    primary: isDark ? "#ffffff" : "#000000",
                    secondary: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                },
                divider: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                action: {
                    hover: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    selected: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
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
                        root: { textTransform: "none", borderRadius: 8 },
                        contained: {
                            backgroundColor: isDark ? "#ffffff" : "#000000",
                            color: isDark ? "#000000" : "#ffffff",
                            "&:hover": {
                                backgroundColor: isDark ? "#e0e0e0" : "#333333",
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
