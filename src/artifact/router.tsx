import { useEffect, useSyncExternalStore, type ComponentType } from "react";
import Animated, { FadeIn } from "react-native-reanimated";

/**
 * A tiny in-memory router that stands in for expo-router in the claude.ai Artifact build (see metro.config.js).
 * An Artifact page has no meaningful URL, so the file-based web router cannot be trusted there; the screens only
 * use `router`, `Redirect` and `Stack`, which are all that is needed here.
 */
let stack: string[] = ["/"];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
const current = () => stack[stack.length - 1] ?? "/";

export const router = {
  push(path: string) { stack = [...stack, path]; emit(); },
  replace(path: string) { stack = [...stack.slice(0, -1), path]; emit(); },
  back() { if (stack.length > 1) { stack = stack.slice(0, -1); emit(); } },
  canGoBack: () => stack.length > 1,
  dismissTo(path: string) {
    const i = stack.lastIndexOf(path);
    stack = i >= 0 ? stack.slice(0, i + 1) : [...stack, path];
    emit();
  },
};

let routes: Record<string, ComponentType> = {};
export function setRoutes(r: Record<string, ComponentType>) { routes = r; }

export function Redirect({ href }: { href: string }) {
  useEffect(() => { router.replace(href); }, [href]);
  return null;
}

export function Stack(_props: unknown) {
  const path = useSyncExternalStore(subscribe, current);
  const Screen = routes[path] ?? routes["/"]!;
  return (
    <Animated.View key={path} entering={FadeIn.duration(180)} style={{ flex: 1 }}>
      <Screen />
    </Animated.View>
  );
}
