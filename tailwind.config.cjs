/**
 * Royal Coffee — Tailwind Theme
 * Surface colors sourced from src/lib/theme.ts
 * Change values there → rebuild → done everywhere.
 */

// Fallback values mirroring src/lib/theme.ts (CJS can't always import TS)
const T = {
  bg:            '#F4EDE4',
  card:          '#5A0D17',
  muted:         '#6B1A24',
  skeleton:      '#7A2430',
  border:        '#8B2D3A',
  borderMd:      '#9C3644',
  dot:           '#8B2D3A',
  gold:          '#D4AF37',
  goldHover:     '#C9A632',
  burgundy:      '#5A0D17',
  burgundyLight: '#7A1A2A',
  bgLight:       '#4D0E16',
  bgLighter:     '#5A1219',
  bgBorder:      '#6B1A24',
};

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './admin/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Royal surface palette (single source of truth) ── */
        cream: {
          DEFAULT: T.bg,        // bg-cream
          card:    T.card,      // bg-cream-card
          muted:   T.muted,     // bg-cream-muted
          skel:    T.skeleton,  // bg-cream-skel
          border:  T.border,    // border-cream-border
          mid:     T.borderMd,  // border-cream-mid
          dot:     T.dot,       // bg-cream-dot
        },
        royal: {
          gold:          T.gold,          // text-royal-gold
          goldHover:     T.goldHover,     // hover:bg-royal-goldHover
          burgundy:      T.burgundy,      // text-royal-burgundy
          burgundyLight: T.burgundyLight, // bg-royal-burgundyLight
          bgLight:       T.bgLight,       // bg-royal-bgLight (hover on dark bg)
          bgLighter:     T.bgLighter,     // bg-royal-bgLighter (active on dark bg)
          bgBorder:      T.bgBorder,      // border-royal-bgBorder
        },

        /* ── Legacy (keep for admin/workshop) ── */
        'premium-dark': '#0F172A',
        'premium-blue': '#1E3A8A',
        'premium-white': '#FFFFFF',
        'premium-gray': '#E2E8F0',
        'premium-gray-dark': '#64748B',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.25rem',  // 20px
        '3xl': '1.5rem',   // 24px — premium cards
      },
      padding: {
        'btn': '1rem', // 16px for buttons
        'section': '1.5rem', // 24px for sections
      },
      boxShadow: {
        'premium': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'premium-hover': '0 6px 20px rgba(0, 0, 0, 0.15)',
        'royal': '0 10px 25px rgba(0, 0, 0, 0.3)',         // premium card shadow on dark bg
        'royal-sm': '0 4px 12px rgba(0, 0, 0, 0.20)',     // subtle card shadow on dark bg
      },
      backdropBlur: {
        'sm': '4px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'size-200': '200% 200%',
      },
      backgroundPosition: {
        'pos-0': '0% 50%',
        'pos-100': '100% 50%',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.pt-safe': {
          'padding-top': 'env(safe-area-inset-top, 0px)',
        },
        '.pb-safe': {
          'padding-bottom': 'env(safe-area-inset-bottom, 0px)',
        },
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
};