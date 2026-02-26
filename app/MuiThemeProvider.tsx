"use client";

import { CssBaseline } from "@mui/material";
import { AppThemeProvider } from "../lib/ThemeContext";
import { ReactNode } from "react";

export default function MuiThemeProvider({ children }: { children: ReactNode }) {
    return (
        <AppThemeProvider>
            <CssBaseline />
            {children}
        </AppThemeProvider>
    );
}
