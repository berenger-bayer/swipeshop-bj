import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        'accent-indigo': "var(--accent-indigo)",
        'accent-rose': "var(--accent-rose)",
        'glass-bg': "var(--glass-bg)",
        'glass-border': "var(--glass-border)",
        'card-text': "var(--card-text)",
        'card-text-muted': "var(--card-text-muted)",
        'border-subtle': "var(--border-subtle)",
      },
    },
  },
  plugins: [],
};
export default config;
