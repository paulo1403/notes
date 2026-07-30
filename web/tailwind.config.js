/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        muted: "var(--muted)",
        line: "var(--line)",
        panel: "var(--panel)",
        "panel-deep": "var(--panel-deep)",
        paper: "var(--paper)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        "accent-soft": "var(--accent-soft)",
        danger: "var(--danger)",
        focus: "var(--focus)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
