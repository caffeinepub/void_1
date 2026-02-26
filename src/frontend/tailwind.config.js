import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['index.html', 'src/**/*.{js,ts,jsx,tsx,html,css}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        // VOID custom palette
        'void-black': '#000000',
        'void-deep': '#0a0015',
        'void-deeper': '#0f001f',
        'void-gold': '#FFD700',
        'void-gold-dark': '#DAA520',
        'void-purple': '#8e2de2',
        'void-purple-dark': '#4a00ff',

        // Shadcn tokens
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring) / <alpha-value>)',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover))',
          foreground: 'oklch(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))',
        },
        chart: {
          1: 'oklch(var(--chart-1))',
          2: 'oklch(var(--chart-2))',
          3: 'oklch(var(--chart-3))',
          4: 'oklch(var(--chart-4))',
          5: 'oklch(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'oklch(var(--sidebar))',
          foreground: 'oklch(var(--sidebar-foreground))',
          primary: 'oklch(var(--sidebar-primary))',
          'primary-foreground': 'oklch(var(--sidebar-primary-foreground))',
          accent: 'oklch(var(--sidebar-accent))',
          'accent-foreground': 'oklch(var(--sidebar-accent-foreground))',
          border: 'oklch(var(--sidebar-border))',
          ring: 'oklch(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
        'gold-glow': '0 0 20px rgba(255, 215, 0, 0.3)',
        'purple-glow': '0 0 20px rgba(142, 45, 226, 0.3)',
        'gold-glow-lg': '0 0 40px rgba(255, 215, 0, 0.2)',
      },
      backgroundImage: {
        'nebula-gradient': 'radial-gradient(ellipse at center, #0f001f 0%, #000000 70%)',
        'gold-gradient': 'linear-gradient(135deg, #FFD700, #DAA520)',
        'purple-gradient': 'linear-gradient(135deg, #8e2de2, #4a00ff)',
        'void-gradient': 'linear-gradient(180deg, #000000 0%, #0a0015 50%, #000000 100%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'nebula-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'gold-shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'nebula-pulse': 'nebula-pulse 3s ease-in-out infinite',
        'gold-shimmer': 'gold-shimmer 3s linear infinite',
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
