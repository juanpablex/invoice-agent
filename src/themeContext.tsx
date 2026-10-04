import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkCategories, darkColors, lightCategories, lightColors, makeType, type Palette } from "./theme";
import { loadTheme, saveTheme } from "./storage";

type Mode = "light" | "dark";
type Type = ReturnType<typeof makeType>;

interface ThemeValue {
  mode: Mode;
  colors: Palette;
  type: Type;
  /** Category -> color, tuned for the current mode. */
  cat: Record<string, string>;
  toggle: () => void;
}

const Ctx = createContext<ThemeValue | null>(null);

/** Follows the system setting until the person picks a mode; then remembers the choice. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [chosen, setChosen] = useState<Mode | null>(null);
  const mode: Mode = chosen ?? (system === "light" ? "light" : "dark");

  useEffect(() => {
    loadTheme().then((m) => m && setChosen(m));
  }, []);

  const toggle = useCallback(() => {
    const next: Mode = mode === "light" ? "dark" : "light";
    setChosen(next);
    saveTheme(next);
  }, [mode]);

  const value = useMemo<ThemeValue>(() => {
    const colors = mode === "light" ? lightColors : darkColors;
    return { mode, colors, type: makeType(colors), cat: mode === "light" ? lightCategories : darkCategories, toggle };
  }, [mode, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}

/** Builds a styles hook: styles are recreated only when the theme changes. */
export function makeThemed<T>(factory: (colors: Palette, type: Type, cat: Record<string, string>) => T): () => T {
  return function useStyles() {
    const { colors, type, cat } = useTheme();
    return useMemo(() => factory(colors, type, cat), [colors, type, cat]);
  };
}
