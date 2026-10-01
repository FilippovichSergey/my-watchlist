import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Movies, anime, and serials I've watched",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions (LanguageTool, Grammarly, ...) add attributes to <html> and <body> before React
    // hydrates; these two flags silence exactly that, without hiding real hydration bugs further down.
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen" suppressHydrationWarning>
        <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-semibold tracking-tight">My Watchlist</a>
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
            Admin
          </a>
        </header>
        <Providers>
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
