import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type ViewProps } from "react-native";
import { makeThemed, useTheme } from "../themeContext";

/** Screen background: base color with two soft color glows. */
export function Backdrop({ children, style }: ViewProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={colors.glowA} style={styles.glowA} pointerEvents="none" />
      <LinearGradient colors={colors.glowB} style={styles.glowB} pointerEvents="none" />
      {children}
    </View>
  );
}

const useStyles = makeThemed((colors, type, cat) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: "hidden" },
  glowA: { position: "absolute", top: -120, left: -80, width: 380, height: 380, borderRadius: 190 },
  glowB: { position: "absolute", bottom: -140, right: -100, width: 380, height: 380, borderRadius: 190 },
}));
