/** Design tokens: one place for color, spacing, radius and type so every screen stays consistent. */
export const colors = {
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
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const type = {
  title: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5, color: colors.text },
  h2: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 12.5, color: colors.textDim },
  label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2, textTransform: "uppercase" as const, color: colors.textDim },
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Office supplies": "#5eead4",
  Utilities: "#fbbf24",
  Shipping: "#7c8cff",
  Meals: "#fb7185",
  Software: "#c084fc",
};

export const usd = (n: number, currency = "USD") => `${currency === "USD" ? "$" : currency + " "}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
