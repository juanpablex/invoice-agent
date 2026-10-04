import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toSource } from "../image";
import { useApp } from "../state";
import { Backdrop } from "../ui/Backdrop";
import { Press } from "../ui/Press";
import { SwipeToApprove } from "../ui/SwipeToApprove";
import { CATEGORY_COLORS, colors, radius, space, type, usd } from "../theme";

export default function Review() {
  const insets = useSafeAreaInsets();
  const { job, setJob, approve, reject } = useApp();
  const [done, setDone] = useState(false);
  if (!job?.result) return <Redirect href="/" />;
  const { result, imageUri } = job;
  const p = result.proposal;
  const finish = () => { setJob(null); router.dismissTo("/"); };

  if (done) {
    return (
      <Backdrop style={{ alignItems: "center", justifyContent: "center" }}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.checkWrap}><Text style={styles.check}>✓</Text></Animated.View>
        <Animated.Text entering={FadeInDown.delay(200)} style={[type.h2, { marginTop: space.xl }]}>Expense booked</Animated.Text>
        <Animated.View entering={FadeIn.delay(500)}><Press onPress={finish} style={styles.ghost}><Text style={styles.ghostText}>Back to expenses</Text></Press></Animated.View>
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Press onPress={finish} style={styles.back} accessibilityRole="button" accessibilityLabel="Close"><Text style={{ color: colors.text, fontSize: 18 }}>✕</Text></Press>
          <Text style={type.label}>Review proposal</Text>
          <View style={{ width: 40 }} />
        </View>

        {!p ? (
          <Animated.View entering={FadeInDown.springify()} style={[styles.card, { marginTop: space.xl }]}>
            <Text style={type.h2}>No proposal</Text>
            <Text style={[type.body, { marginTop: space.sm, color: colors.textDim }]}>{result.note ?? "The agent did not propose an expense."}</Text>
            <Press onPress={() => { setJob(null); router.replace("/scan"); }} style={[styles.ghost, { alignSelf: "flex-start" }]}><Text style={styles.ghostText}>Try another</Text></Press>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify()} style={[styles.card, { marginTop: space.xl }]}>
              <View style={{ flexDirection: "row", gap: space.md }}>
                {imageUri === null ? (
                  <View style={[styles.thumb, { alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" }]}><Text style={{ color: "#6b7280", fontWeight: "800" }}>PDF</Text></View>
                ) : (
                  <Image source={toSource(imageUri)} style={styles.thumb} resizeMode="cover" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendor} numberOfLines={2}>{p.invoice.vendor}</Text>
                  <Text style={type.small}>{p.invoice.invoiceNo} · {p.invoice.date}</Text>
                  <View style={[styles.chip, { backgroundColor: (CATEGORY_COLORS[p.category] ?? colors.accent) + "26" }]}>
                    <Text style={{ color: CATEGORY_COLORS[p.category] ?? colors.accent, fontWeight: "700", fontSize: 12.5 }}>{p.category}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.total}>{usd(p.invoice.total, p.invoice.currency)}</Text>
              {p.duplicateOf && (
                <View style={styles.warn}><Text style={{ color: colors.warn, fontSize: 13.5 }}>Possible duplicate of {p.duplicateOf}: same vendor and invoice number are already booked.</Text></View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).springify()} style={[styles.card, { marginTop: space.md }]}>
              <Text style={type.label}>Line items</Text>
              {p.invoice.items.map((i, k) => (
                <View key={k} style={[styles.line, k > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                  <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>{i.description}</Text>
                  <Text style={type.small}>{i.qty} × {usd(i.unit, p.invoice.currency)}</Text>
                </View>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).springify()} style={[styles.card, { marginTop: space.md }]}>
              <Text style={type.label}>What the agent did</Text>
              {result.steps.map((s, k) => (
                <View key={k} style={styles.stepRow}>
                  <Text style={{ color: s.ok ? colors.ok : colors.danger, fontWeight: "800" }}>{s.ok ? "✓" : "✕"}</Text>
                  <Text style={styles.mono}>{s.tool}</Text>
                  <Text style={[type.small, { flex: 1, textAlign: "right" }]}>{s.ms} ms</Text>
                </View>
              ))}
              {result.usage && <Text style={[type.small, { marginTop: space.sm }]}>{result.usage.calls} model calls · {result.usage.inputTokens + result.usage.outputTokens} tokens (from the API)</Text>}
              <Text style={[type.small, { marginTop: space.sm }]}>Nothing is booked yet. The agent can only propose; you decide.</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).springify()} style={{ marginTop: space.xl }}>
              <SwipeToApprove label="Swipe to book this expense" onApproved={() => { approve(p.id); setDone(true); }} />
              <Press onPress={() => { reject(p.id); finish(); }} style={{ alignSelf: "center", marginTop: space.lg, padding: space.sm }} accessibilityRole="button"><Text style={{ color: colors.danger, fontWeight: "700" }}>Reject</Text></Press>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  thumb: { width: 76, height: 96, borderRadius: radius.sm, backgroundColor: "#fff" },
  vendor: { fontSize: 19, fontWeight: "800", color: colors.text, marginBottom: 2 },
  chip: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, marginTop: space.sm },
  total: { fontSize: 40, fontWeight: "800", letterSpacing: -1, color: colors.text, marginTop: space.lg },
  warn: { marginTop: space.md, backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.4)", borderWidth: 1, borderRadius: radius.md, padding: space.md },
  line: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 6 },
  mono: { color: colors.text, fontFamily: "monospace", fontSize: 13.5 },
  ghost: { marginTop: space.xl, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  ghostText: { color: colors.text, fontWeight: "700" },
  checkWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(74,222,128,0.16)", borderWidth: 2, borderColor: colors.ok, alignItems: "center", justifyContent: "center" },
  check: { color: colors.ok, fontSize: 48, fontWeight: "800" },
});
