import type { Config } from "tailwindcss";

// Colours, fonts and shadows are CSS custom properties (see globals.css), so the dark theme is one class on <html>.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        page: "var(--bg)",
        card: "var(--card)",
        subtle: "var(--subtle)",
        header: "var(--header)",
        ink: "var(--text)",
        muted: "var(--muted)",
        line: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow)",
        strong: "var(--shadow-strong)",
      },
      borderRadius: {
        card: "18px",
      },
      screens: {
        // The sidebar layout needs this much room; below it the filters live in a bottom sheet
        desk: "900px",
      },
    },
  },
  plugins: [],
};

export default config;
