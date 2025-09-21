import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "UPC Resolver Pro - Advanced Warehouse Analytics",
  description: "Professional UPC conflict resolution platform with real-time analytics and AI-powered insights",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>
          <div className="min-h-screen bg-background">
            <div className="fixed inset-0 grid-pattern animate-grid opacity-30 pointer-events-none" />
            <div className="relative z-10">{children}</div>
          </div>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
