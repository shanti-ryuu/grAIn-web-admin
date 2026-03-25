import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#166534', // deep green
        secondary: '#22c55e', // light green
        background: '#f9fafb',
        card: '#ffffff',
        border: '#e5e7eb',
        textPrimary: '#111827',
        textSecondary: '#6b7280',
        green: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          800: '#166534',
        },
        gray: {
          50: '#f9fafb',
          200: '#e5e7eb',
          500: '#6b7280',
          600: '#4b5563',
          900: '#111827',
        },
        yellow: {
          500: '#eab308',
        },
        red: {
          500: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        sidebar: '240px',
        navHeight: '64px',
      },
    },
  },
  plugins: [],
}
export default config
