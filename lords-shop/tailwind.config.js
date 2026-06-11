/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - standardized
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#60a5fa', // blue-400
          500: '#3b82f6', // blue-500
          600: '#2563eb', // blue-600
        },
        success: {
          400: '#4ade80', // emerald-400
          500: '#10b981', // emerald-500
          600: '#059669', // emerald-600
        },
        accent: {
          400: '#fbbf24', // amber-400 (for balance/USDT only)
          500: '#f59e0b', // amber-500
          600: '#d97706', // amber-600
        },
        danger: {
          400: '#f87171', // red-400
          500: '#ef4444', // red-500
          600: '#dc2626', // red-600
        },
        neutral: {
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '2.5rem',
      },
    },
  },
  plugins: [],
}