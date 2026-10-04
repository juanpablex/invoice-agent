import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MODELS } from "../core/agent";
import { useApp } from "../state";
import { Backdrop } from "../ui/Backdrop";
import { CountUp } from "../ui/CountUp";
import { Press } from "../ui/Press";
import { CATEGORY_COLORS, colors, radius, space, type, usd } from "../theme";

function CategoryBar({ totals }: { totals: [string, number][] }) {
  const sum = totals.reduce((a, [, v]) => a + v, 0) || 1;
  return (
    <View>
      <View style={styles.bar}>
        {totals.map(([cat, v], i) => (
          <Animated.View key={cat} entering={FadeInDown.delay(200 + i * 80).springify()} style={{ flex: v / sum, backgroundColor: CATEGORY_COLORS[cat] ?? colors.accent, marginRight: i < totals.length - 1 ? 3 : 0 }} />
        ))}
      </View>
      <View style={styles.legend}>
        {totals.map(([cat, v]) => (
          <View key={cat} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] ?? colors.accent }]} />
            <Text style={type.small}>{cat} · {Math.round((v / sum) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ScanButton() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withDelay(300, withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) })), -1, false);
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.22 }] }));
  return (
    <View>
      <Animated.View style={[styles.ring, ring]} />
      <Press onPress={() => router.push("/scan")} accessibilityRole="button" accessibilityLabel="Scan an invoice">
        <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanBtn}>
          <Text style={styles.scanIcon}>⌖</Text>
          <Text style={styles.scanText}>Scan invoice</Text>
        </LinearGradient>
      </Press>
    </View>
  );
}

export default function Home() {
  const { expenses, useReal, model, apiKey } = useApp();
  const insets = useSafeAreaInsets();
  const total = expenses.reduce((a, e) => a + e.total, 0);
  const byCat = Object.entries(expenses.reduce<Record<string, number>>((m, e) => ({ ...m, [e.category]: (m[e.category] ?? 0) + e.total }), {})).sort((a, b) => b[1] - a[1]);
  const modelLabel = MODELS.find((m) => m.id === model)?.label ?? model;

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={type.label}>Invoice Agent</Text>
          <Press onPress={() => router.push("/settings")} style={styles.mode} accessibilityRole="button" accessibilityLabel="Open settings">
            <View style={[styles.dot, { backgroundColor: useReal && apiKey ? colors.ok : colors.warn }]} />
            <Text style={styles.modeText}>{useReal && apiKey ? `Real model · ${modelLabel}` : "Scripted demo"}</Text>
          </Press>
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <Text style={[type.small, { marginTop: space.xl }]}>Booked this period</Text>
          <CountUp value={total} style={styles.total} />
          <Text style={type.small}>{expenses.length} expenses in {byCat.length} categories</Text>
        </Animated.View>

        <View style={{ marginTop: space.xl }}>
          <CategoryBar totals={byCat} />
        </View>

        <Text style={[type.h2, { marginTop: space.xxl, marginBottom: space.md }]}>Recent expenses</Text>
        {expenses.map((e, i) => (
          <Animated.View key={e.id} entering={FadeInDown.delay(120 + i * 60).springify().damping(16)} style={styles.row}>
            <View style={[styles.badge, { backgroundColor: (CATEGORY_COLORS[e.category] ?? colors.accent) + "26" }]}>
              <Text style={[styles.badgeText, { color: CATEGORY_COLORS[e.category] ?? colors.accent }]}>{e.vendor.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.body} numberOfLines={1}>{e.vendor}</Text>
              <Text style={type.small}>{e.category} · {e.invoiceNo} · {e.date}</Text>
            </View>
            <Text style={styles.amount}>{usd(e.total)}</Text>
          </Animated.View>
        ))}
      </ScrollView>
      <View style={[styles.fab, { bottom: insets.bottom + space.xl }]}>
        <ScanButton />
      </View>
    </Backdrop>
  );
}


const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mode: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill },
  modeText: { color: colors.text, fontSize: 12.5, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  total: { fontSize: 46, fontWeight: "800", letterSpacing: -1.5, color: colors.text, marginTop: 2 },
  bar: { flexDirection: "row", height: 12, borderRadius: radius.pill, overflow: "hidden" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: space.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, marginBottom: space.sm },
  badge: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 18, fontWeight: "800" },
  amount: { color: colors.text, fontWeight: "700", fontSize: 15 },
  fab: { position: "absolute", left: space.xl, right: space.xl },
  ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.accent },
  scanBtn: { height: 58, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  scanIcon: { fontSize: 24, color: "#04201c", fontWeight: "800" },
  scanText: { fontSize: 17, fontWeight: "800", color: "#04201c" },
});
