// Central design tokens for the web app.
//
// ✅ Rule: prefer semantic Tailwind utilities (bg-background, text-foreground, etc.).
// Use these tokens only when you need values in JS/TS (charts, inline styles, canvases).

export const palette = {
  bg: "#fcfcf2",
  surface: "#d5dde4",
  borderMuted: "#9da0a8",
  textStrong: "#101010",
  textSoft: "#18292e",
  deep: "#1b1729",
  primary: "#376e49",
  success: "#00a2a8",
  info: "#1773b8",
  warning: "#ddac46",
  danger: "#cd4a42",
  plum: "#42133f",
} as const;

export const spacing = {
  // 4pt grid (premium, precise)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radii = {
  // Mirrors --radius in src/index.css (1.25rem ~ 20px)
  base: 20,
  md: 14,
  sm: 10,
  pill: 999,
} as const;

export const typography = {
  body: 16,
  small: 14,
  h3: 20,
  h2: 24,
  h1: 32,
} as const;
