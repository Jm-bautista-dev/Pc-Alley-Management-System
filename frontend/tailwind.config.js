/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "rgba(var(--brand-navy-rgb), <alpha-value>)",
          surface: "rgba(var(--brand-surface-rgb), <alpha-value>)",
          panel: "rgba(var(--brand-panel-rgb), <alpha-value>)",
          crimson: "rgba(var(--accent), <alpha-value>)",
          neonblue: "rgba(var(--brand-neonblue-rgb), <alpha-value>)",
          neonpurple: "rgba(var(--brand-neonpurple-rgb), <alpha-value>)",
          bgbase: "rgba(var(--brand-bgbase-rgb), <alpha-value>)",
          muted: "rgba(var(--text-muted-rgb), <alpha-value>)",
          border: "rgba(var(--brand-border-rgb), <alpha-value>)",
          hover: "rgba(var(--brand-hover-rgb), <alpha-value>)",
          title: "rgba(var(--text-title-rgb), <alpha-value>)",
        },
        main: "rgba(var(--text-main-rgb), <alpha-value>)",
        border: "rgba(var(--brand-border-rgb), <alpha-value>)",
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        dmsans: ['var(--font-dm-sans)', 'sans-serif'],
        rajdhani: ['var(--font-rajdhani)', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
