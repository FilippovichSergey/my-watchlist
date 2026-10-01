import type { Metadata } from "next";
import { Jost, Oswald } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Providers } from "./providers";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavTabs } from "./NavTabs";
import { ThemeToggle } from "./ThemeToggle";
import { getLocale } from "@/lib/locale.server";
import { t } from "@/lib/i18n";
import "./globals.css";

// Self-hosted by next/font at build time: the browser never talks to Google for these.
const jost = Jost({ subsets: ["latin", "cyrillic"], variable: "--font-sans", display: "swap" });
const oswald = Oswald({ subsets: ["latin", "cyrillic"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Movies, anime, and serials I've watched",
};

/** Applies the chosen theme (or the system one) before the first paint, so the page never flashes the other colours. */
const THEME_SCRIPT =
  '(function(){try{var s=localStorage.getItem("theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  // "Мой спіс" / "My Watchlist": the first word plain, the rest in the accent colour
  const [brand, ...rest] = t(locale, "nav.title").split(" ");
  return (
    // Browser extensions (LanguageTool, Grammarly, ...) add attributes to <html> and <body> before React
    // hydrates, and the theme script adds the "dark" class; these two flags silence exactly that.
    <html lang={locale} className={`${jost.variable} ${oswald.variable}`} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Providers locale={locale}>
          <header className="sticky top-0 z-10 bg-header text-white shadow-[0_1px_0_rgba(255,255,255,.06)]">
            <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-7 px-[18px] desk:h-[60px] desk:px-6">
              <Link
                href="/"
                className="flex h-11 items-center whitespace-nowrap font-display text-[22px] font-bold uppercase tracking-[0.3px] desk:h-auto"
              >
                {brand}&nbsp;<span className="text-accent">{rest.join(" ")}</span>
              </Link>
              <Suspense>
                <NavTabs />
              </Suspense>
              <div className="ml-auto flex items-center gap-[10px] desk:gap-[14px]">
                <LanguageSwitch locale={locale} />
                <ThemeToggle label={t(locale, "nav.theme")} />
                <Link
                  href="/admin"
                  className="hidden text-[13px] font-semibold text-white/55 transition-colors duration-150 hover:text-white desk:inline"
                >
                  {t(locale, "nav.admin")}
                </Link>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-4 desk:px-6 desk:pb-16 desk:pt-7">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
