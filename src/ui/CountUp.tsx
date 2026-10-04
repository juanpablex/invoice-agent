import { useEffect, useRef, useState } from "react";
import { Text, type TextProps } from "react-native";
import { usd } from "../theme";

/** Animates a money value from its previous value to the new one. */
export function CountUp({ value, ...rest }: { value: number } & TextProps) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min((Date.now() - t0) / 900, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text {...rest}>{usd(shown)}</Text>;
}
