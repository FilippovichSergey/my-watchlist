"use client";

/** Flips the "dark" class on <html>; the choice is remembered per browser and read back by the inline script in layout.tsx. */
export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // private mode or blocked storage: the theme still switches for this page view
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-white/20 text-[15px] leading-none transition-colors duration-150 hover:bg-white/[.08] desk:h-8 desk:w-8"
    >
      <span className="dark:hidden">🌙</span>
      <span className="hidden dark:inline">☀</span>
    </button>
  );
}
