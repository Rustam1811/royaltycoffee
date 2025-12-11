import type { Config } from 'tailwindcss';
import containerQueries from '@tailwindcss/container-queries';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        md: '2rem'
      }
    },
    extend: {
      colors: {
        ink: '#F7F8FC',
        charcoal: '#FFFFFF',
        graphite: '#E5E9F2',
        steel: '#C7CEDF',
        mist: '#111322',
        accent: '#5E73FF'
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          'Inter',
          'Inter var',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif'
        ]
      },
      boxShadow: {
        halo: '0 30px 90px rgba(94, 115, 255, 0.25)',
        card: '0 25px 80px rgba(15, 23, 42, 0.18)'
      },
      borderRadius: {
        '2xl': '1.25rem'
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.12), transparent 55%)'
      }
    }
  },
  plugins: [
    containerQueries,
    plugin(({ addVariant, addUtilities }) => {
      addVariant('supports-hover', '@media (hover: hover)');
      addUtilities({
        '.focus-ring': {
          outline: '2px solid rgba(148, 210, 189, 0.65)',
          outlineOffset: '3px'
        },
        '.scrollbar-hidden': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none'
        },
        '.scrollbar-hidden::-webkit-scrollbar': {
          display: 'none'
        }
      });
    })
  ]
};

export default config;

