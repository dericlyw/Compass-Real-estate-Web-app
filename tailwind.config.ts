import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0B0B0C", 900: "#0B0B0C", 800: "#121214", 700: "#1A1A1D", 600: "#242428", 500: "#34343A" },
        gold: { DEFAULT: "#C9A45C", light: "#E2C88F", dark: "#9C7A3A" },
        bone: { DEFAULT: "#EDE8DF", muted: "#A8A29A", dim: "#6E6A64" },
        forest: "#2F5D4A",
        ok: "#6FAF8A",
        warn: "#D8A24A",
        bad: "#C8614F",
      },
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
