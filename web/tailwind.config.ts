import type { Config } from 'tailwindcss';

// Tailwind v4: opt-in to class-based dark mode so ThemeToggle works
export default {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    './messages/**/*.{json}',
    './public/**/*.{html,svg}',
  ],
  theme: {},
} satisfies Config;

