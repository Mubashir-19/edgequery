/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // EdgeQuery brand colors - different shades of grey, black, white with colored buttons
        'edge-black': '#000000',
        'edge-dark': '#1a1a1a',
        'edge-darker': '#121212',
        'edge-grey': {
          900: '#1f2937',
          800: '#374151',
          750: '#404756',
          700: '#4b5563',
          600: '#6b7280',
          500: '#9ca3af',
          400: '#d1d5db',
          300: '#e5e7eb',
          200: '#f3f4f6',
          100: '#f8fafc', // Less bright
          50: '#f1f5f9',  // More contrast
          25: '#e2e8f0',  // Better distinction
        },
        'edge-white': '#ffffff',
        
        // Accent colors for buttons and interactive elements
        'edge-blue': {
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
        'edge-green': {
          DEFAULT: '#10b981',
          dark: '#047857',
        },
        'edge-red': {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        'edge-yellow': {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        'edge-purple': {
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
        },
        'edge-cyan': {
          DEFAULT: '#06b6d4',
          dark: '#0891b2',
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'edge': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'edge-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
