/** Design tokens: one place for color, spacing, radius and type so every screen stays consistent. */
export const darkColors = {
  bg: "#0b0d1a",
  bgSoft: "#12152a",
  card: "#171b33",
  cardHi: "#1e2342",
  line: "rgba(255,255,255,0.08)",
  text: "#f2f4ff",
  textDim: "#9aa3c7",
  accent: "#5eead4",
  accent2: "#7c8cff",
  warn: "#fbbf24",
  danger: "#fb7185",
  ok: "#4ade80",
  onAccent: "#04201c",
  glowA: ["rgba(124,140,255,0.28)", "rgba(124,140,255,0)"] as [string, string],
  glowB: ["rgba(94,234,212,0.18)", "rgba(94,234,212,0)"] as [string, string],
};

export type Palette = typeof darkColors;

export const lightColors: Palette = {
  bg: "#f3f5fb",
  bgSoft: "#eaeef8",
  card: "#ffffff",
  cardHi: "#f0f3fb",
  line: "rgba(20,26,46,0.12)",
  text: "#141a2e",
  textDim: "#566080",
  accent: "#0d9488",
  accent2: "#4f56d6",
  warn: "#b45309",
  danger: "#be123c",
  ok: "#15803d",
  onAccent: "#ffffff",
  glowA: ["rgba(79,86,214,0.16)", "rgba(79,86,214,0)"],
  glowB: ["rgba(13,148,136,0.14)", "rgba(13,148,136,0)"],
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const makeType = (colors: Palette) => ({
  title: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5, color: colors.text },
  h2: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 12.5, color: colors.textDim },
  label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2, textTransform: "uppercase" as const, color: colors.textDim },
});

export const darkCategories: Record<string, string> = {
  "Office supplies": "#5eead4",
  Utilities: "#fbbf24",
  Shipping: "#7c8cff",
  Meals: "#fb7185",
  Software: "#c084fc",
};

export const lightCategories: Record<string, string> = {
  "Office supplies": "#0d8f80",
  Utilities: "#b45309",
  Shipping: "#4f56d6",
  Meals: "#be123c",
  Software: "#7e22ce",
};

export const usd = (n: number, currency = "USD") => `${currency === "USD" ? "$" : currency + " "}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
