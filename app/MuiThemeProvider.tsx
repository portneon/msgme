"use client";

import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "../lib/theme";
import { ReactNode } from "react";

export default function MuiThemeProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}
