/**
 * T-French design tokens — the single source of truth for the flat design system.
 *
 * Palette is taken from the brand logo (Arc de Triomphe mark), sampled directly
 * from `Logo T French Education - Final-02.png`:
 *   navy #011D45 · red #D31C21 · orange #F89A29 · gold #FCC314 · grey #6D6D6D
 *
 * `success` is deliberately NOT a brand colour: green carries a status meaning
 * (submitted, slot free, saved) that orange or gold would misreport.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    /**
     * "Zero Artificial Depth": the Z-axis does not exist.
     * boxShadow is REPLACED (not extended) so `shadow-lg` and friends simply
     * do not exist — the design rule is enforced by the build, not by review.
     */
    boxShadow: {
      none: 'none',
    },
    extend: {
      colors: {
        // Brand navy — the "Action" colour. `hover` is *lighter*, not darker:
        // navy is already near-black, so darkening reads as no feedback at all.
        primary: {
          DEFAULT: '#011D45',
          hover: '#0A3168',
          dark: '#00122C',
          soft: '#E7ECF4',
          'soft-hover': '#D3DEEE',
        },
        // Brand gold — highlights, badges, the CTA band.
        accent: {
          DEFAULT: '#FCC314',
          hover: '#E5AE00',
          dark: '#8A6800',
          soft: '#FEF6DC',
          'soft-hover': '#FDEEBB',
        },
        // Brand orange — supporting warm accent.
        secondary: {
          DEFAULT: '#F89A29',
          hover: '#E07F0E',
          dark: '#9A5A00',
          soft: '#FEF2E4',
          'soft-hover': '#FDE3C7',
        },
        // Brand red — destructive actions and the logo's right-hand columns.
        danger: {
          DEFAULT: '#D31C21',
          hover: '#B0161A',
          dark: '#8C1114',
          soft: '#FCEBEB',
          'soft-hover': '#F9D9D9',
        },
        // Status only — never used for branding.
        success: {
          DEFAULT: '#0E9F6E',
          hover: '#0B7F58',
          dark: '#07553B',
          soft: '#E6F6F0',
          'soft-hover': '#D3F0E4',
        },
        ink: {
          DEFAULT: '#0A1729', // near-black navy, harmonised with the brand
          soft: '#3A4553',
          muted: '#6D6D6D',   // the logo's "EDUCATION" grey
        },
        // Named `line`, not `border`: `border-border` would collide with the
        // `border` utility that sets border-width.
        line: '#E2E6EC',
        muted: '#F3F5F8',
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        heading: '-0.02em',
      },
      maxWidth: {
        container: '80rem', // max-w-7xl
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'spin-flat': {
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .3s ease-out both',
        'slide-in': 'slide-in .2s ease-out both',
        'spin-flat': 'spin-flat .7s linear infinite',
      },
    },
  },
  plugins: [],
};
