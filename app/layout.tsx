import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist } from 'next/font/google'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import './globals.css'
import { ConvexClientProvider } from "./ConvexClientProvider";
import MuiThemeProvider from "./MuiThemeProvider";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MsgMe — Chat App',
  description: 'Real-time 1-on-1 messaging',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} antialiased`} style={{ margin: 0, padding: 0 }}>
          <AppRouterCacheProvider>
            <ConvexClientProvider>
              <MuiThemeProvider>
                {children}
              </MuiThemeProvider>
            </ConvexClientProvider>
          </AppRouterCacheProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}