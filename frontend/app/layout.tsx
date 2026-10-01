import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import { LanguageSwitch } from "./LanguageSwitch";
import { getLocale } from "@/lib/locale.server";
import { t } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Movies, anime, and serials I've watched",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    // Browser extensions (LanguageTool, Grammarly, ...) add attributes to <html> and <body> before React
    // hydrates; these two flags silence exactly that, without hiding real hydration bugs further down.
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen" suppressHydrationWarning>
        <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">{t(locale, "nav.title")}</Link>
          <div className="flex items-center gap-4">
            <LanguageSwitch locale={locale} />
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
              {t(locale, "nav.admin")}
            </Link>
          </div>
        </header>
        <Providers locale={locale}>
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
