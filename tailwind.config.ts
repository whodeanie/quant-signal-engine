import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d3d8e0",
          300: "#a8b1bf",
          400: "#7a8499",
          500: "#525b6e",
          600: "#3a4254",
          700: "#262d3c",
          800: "#171c28",
          900: "#0c1018"
        },
        signal: {
          bull: "#16a34a",
          bear: "#dc2626",
          neutral: "#7a8499",
          gold: "#D4A574",
          accent: "#7AA2D4"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "Helvetica", "Arial"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas"]
      }
    }
  },
  plugins: []
};

export default config;
