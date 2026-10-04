import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "../theme";

/** Screen background: dark base with two soft color glows. */
export function Backdrop({ children, style }: ViewProps) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={["rgba(124,140,255,0.28)", "rgba(124,140,255,0)"]} style={styles.glowA} pointerEvents="none" />
      <LinearGradient colors={["rgba(94,234,212,0.18)", "rgba(94,234,212,0)"]} style={styles.glowB} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: "hidden" },
  glowA: { position: "absolute", top: -120, left: -80, width: 380, height: 380, borderRadius: 190 },
  glowB: { position: "absolute", bottom: -140, right: -100, width: 380, height: 380, borderRadius: 190 },
});
