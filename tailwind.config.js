/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0a0a0c', // Fondo principal
          900: '#121216', // Fondo secundario
          850: '#18181f', // Tarjetas y contenedores
          800: '#20202a', // Hover y contenedores elevados
          700: '#272733', // Bordes sutiles
          600: '#3a3a4c',
          500: '#58586f',
        },
        brand: {
          DEFAULT: '#e50914', // Rojo deportivo intenso
          light: '#ef4444',
          dark: '#b91c1c',
          glow: 'rgba(229, 9, 20, 0.35)',
        },
        status: {
          green: '#22c55e',
          yellow: '#f59e0b',
          red: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'glow-red': '0 0 25px rgba(229, 9, 20, 0.45)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.35)',
      }
    },
  },
  plugins: [],
}
