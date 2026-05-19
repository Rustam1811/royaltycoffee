/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║  Royal Coffee — Centralized Theme                     ║
 * ║  Change colors HERE → updates everywhere              ║
 * ╚═══════════════════════════════════════════════════════╝
 *
 * Premium coffee brand palette:
 *   - Warm cream background (#F4EDE4) — уютный, как на главной
 *   - Burgundy cards on cream bg — контрастные тёмные карточки
 *   - Muted gold accents
 *   - Dark text on cream bg, light text inside cards
 *
 * Tailwind classes use these via tailwind.config.cjs
 * (e.g. `bg-cream`, `bg-cream-card`, `border-cream-border`)
 */

export const theme = {
  /* ─── Surface colors ─── */
  /** Main page background — warm cream */
  bg:          '#F4EDE4',
  /** Cards, sheets — burgundy surfaces on cream bg */
  card:        '#5A0D17',
  /** Subtle fills: pills, icon bg, hover */
  muted:       '#6B1A24',
  /** Skeleton loaders, close buttons, pressed state */
  skeleton:    '#7A2430',

  /* ─── Border / divider colors ─── */
  /** Thin card borders (burgundy-tone) */
  border:      '#8B2D3A',
  /** Medium borders, dividers, rings */
  borderMd:    '#9C3644',
  /** Muted dots, secondary indicators */
  dot:         '#8B2D3A',

  /* ─── Brand accents ─── */
  gold:        '#D4AF37',
  goldHover:   '#C9A632',
  burgundy:    '#5A0D17',
  /** Secondary burgundy for gradients */
  burgundyLight: '#7A1A2A',

  /* ─── Header / card gradient ─── */
  headerFrom:  '#3D0A11',
  headerVia:   '#4D0E16',
  headerTo:    '#5A0D17',

  /* ─── Text colors ─── */
  textPrimary:   '#FFFFFF',
  textSecondary: '#FFFFFF99',

  /* ─── Dark surface helpers (for bg-level elements) ─── */
  bgLight:     '#4D0E16',  // slightly lighter than bg, for hover/sections
  bgLighter:   '#5A1219',  // even lighter, for active states
  bgBorder:    '#6B1A24',  // border on dark surfaces

  /* ─── Shadows ─── */
  cardShadow:  '0 10px 25px rgba(0, 0, 0, 0.3)',
} as const;

/** Type for the theme object */
export type Theme = typeof theme;
