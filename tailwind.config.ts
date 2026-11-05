import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        field: "var(--field)",
        line: "var(--border)",
        ink: "var(--text)",
        ink2: "var(--text-secondary)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        onaccent: "var(--on-accent)",
        tint: "var(--accent-tint)",
        tinttext: "var(--accent-tint-text)",
        oktint: "var(--success-tint)",
        oktext: "var(--success-text)",
        warntint: "var(--warning-tint)",
        warntext: "var(--warning-text)",
      },
    },
  },
  plugins: [],
};
export default config;
