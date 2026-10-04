import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, FadeIn, FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Anthropic from "@anthropic-ai/sdk";
import { explainError, runClaude, runScripted, type ImageInput } from "../core/agent";
import { SAMPLE_INVOICES } from "../core/samples";
import type { TraceStep } from "../core/types";
import { imageToBase64, pdfToBase64, shrinkForApi, toSource, type Img } from "../image";
import { useApp } from "../state";
import { Backdrop } from "../ui/Backdrop";
import { Press } from "../ui/Press";
import { colors, radius, space, type } from "../theme";

const IMAGES: Record<string, Img> = {
  paper: require("../../assets/samples/paper.png"),
  cloud: require("../../assets/samples/cloud.png"),
  catering: require("../../assets/samples/catering.png"),
};

const FRAME_H = 330;

function Scanner({ source, steps }: { source: Img | null; steps: TraceStep[] }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [y]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (FRAME_H - 4) }] }));
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <View style={styles.frame}>
        {source === null ? (
          <View style={styles.pdfPage}><Text style={styles.pdfText}>PDF</Text></View>
        ) : (
          <Image source={toSource(source)} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={styles.dim} />
        <Animated.View style={[styles.scanLine, line]}>
          <LinearGradient colors={["rgba(94,234,212,0)", colors.accent, "rgba(94,234,212,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />
          <LinearGradient colors={["rgba(94,234,212,0.28)", "rgba(94,234,212,0)"]} style={{ height: 46, marginTop: -46, opacity: 0.9 }} />
        </Animated.View>
        {[styles.c1, styles.c2, styles.c3, styles.c4].map((s, i) => <View key={i} style={[styles.corner, s]} />)}
      </View>
      <Text style={[type.h2, { marginTop: space.xl }]}>Agent working…</Text>
      {steps.map((s, i) => (
        <Animated.View key={i} entering={FadeInRight.springify()} style={styles.step}>
          <Text style={{ color: s.ok ? colors.ok : colors.danger, fontWeight: "800" }}>{s.ok ? "✓" : "✕"}</Text>
          <Text style={styles.stepTool}>{s.tool}</Text>
          <Text style={[type.small, { flex: 1, textAlign: "right" }]} numberOfLines={1}>{s.ms} ms</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export default function Scan() {
  const insets = useSafeAreaInsets();
  const { useReal, apiKey, model, ledger, setJob } = useApp();
  const real = useReal && !!apiKey;
  const [busy, setBusy] = useState<{ src: Img | null } | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function process(imageUri: Img | null, image: () => Promise<ImageInput>, sampleId?: string) {
    setError(null);
    setSteps([]);
    setBusy({ src: imageUri });
    try {
      const onStep = (s: TraceStep) => setSteps((p) => [...p, s]);
      let result;
      if (real) {
        const llm = new Anthropic({ apiKey: apiKey!, dangerouslyAllowBrowser: true });
        result = await runClaude(await image(), ledger, onStep, llm, model);
      } else {
        const sample = SAMPLE_INVOICES.find((s) => s.id === sampleId);
        if (!sample) throw new Error("NEEDS_REAL");
        result = await runScripted(sample.invoice, ledger, onStep);
      }
      setJob({ imageUri, result });
      router.replace("/review");
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(m === "NEEDS_REAL" ? "Reading your own photo needs a real model. Add your API key in Settings, or try one of the samples." : m === "PDF_TOO_LARGE" ? "That PDF is larger than 5 MB. Try a smaller one, or export just the invoice page." : explainError(err));
      setBusy(null);
    }
  }

  async function pickPdf() {
    if (!real) return setError("Reading your own invoice needs a real model. Add your API key in Settings, or try one of the samples.");
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      const a = res.canceled ? null : res.assets[0];
      if (!a) return;
      await process(null, () => pdfToBase64(a.uri));
    } catch (err) {
      console.warn("document picker failed", err);
      setError(`Could not open the PDF (${err instanceof Error ? err.message : String(err)}).`);
    }
  }

  async function pick(camera: boolean) {
    if (!real) return setError("Reading your own photo needs a real model. Add your API key in Settings, or try one of the samples.");
    try {
      const web = Platform.OS === "web";
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.5, base64: !web, exif: false };
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = res.canceled ? null : res.assets[0];
      if (!a) return;
      if (web) return await process(a.uri, () => shrinkForApi(a.uri));
      if (!a.base64) return;
      const mediaType = (a.mimeType && /image\/(png|jpeg|webp|gif)/.test(a.mimeType) ? a.mimeType : "image/jpeg") as ImageInput["mediaType"];
      await process(a.uri, async () => ({ base64: a.base64!, mediaType }));
    } catch (err) {
      console.warn("image picker failed", err);
      setError(`Could not open the camera or the library (${err instanceof Error ? err.message : String(err)}). Check the permissions for this app.`);
    }
  }

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Press onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>←</Text></Press>
          <Text style={type.label}>New invoice</Text>
          <View style={{ width: 40 }} />
        </View>

        {busy !== null ? (
          <Scanner source={busy.src} steps={steps} />
        ) : (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={[type.title, { marginTop: space.lg }]}>What do you want to scan?</Text>
            <Text style={[type.small, { marginTop: space.sm, fontSize: 14 }]}>
              {real ? "A Claude model will read the image and use the tools." : "Scripted demo: the extraction is canned for these samples. Add an API key in Settings for a real model."}
            </Text>

            <Text style={[type.label, { marginTop: space.xl, marginBottom: space.md }]}>Samples</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
              {SAMPLE_INVOICES.map((s, i) => (
                <Animated.View key={s.id} entering={FadeInRight.delay(i * 90).springify()}>
                  <Press onPress={() => process(IMAGES[s.id]!, () => imageToBase64(IMAGES[s.id]!), s.id)} style={styles.sample} accessibilityRole="button" accessibilityLabel={`Scan sample: ${s.title}`}>
                    <Image source={toSource(IMAGES[s.id]!)} style={styles.sampleImg} resizeMode="cover" />
                    <Text style={[type.body, { fontWeight: "700", marginTop: space.sm }]} numberOfLines={1}>{s.title}</Text>
                    <Text style={type.small} numberOfLines={1}>{s.vendor}</Text>
                  </Press>
                </Animated.View>
              ))}
            </ScrollView>

            <Text style={[type.label, { marginTop: space.xl, marginBottom: space.md }]}>Your own invoice {real ? "" : "(needs a real model)"}</Text>
            <View style={{ flexDirection: "row", gap: space.md }}>
              <Press onPress={() => pick(true)} style={[styles.action, !real && { opacity: 0.55 }]} accessibilityRole="button"><Text style={styles.actionText}>📷  Take photo</Text></Press>
              <Press onPress={() => pick(false)} style={[styles.action, !real && { opacity: 0.55 }]} accessibilityRole="button"><Text style={styles.actionText}>🖼  Choose image</Text></Press>
            </View>
            <Press onPress={pickPdf} style={[styles.action, { marginTop: space.md }, !real && { opacity: 0.55 }]} accessibilityRole="button"><Text style={styles.actionText}>📄  Choose PDF</Text></Press>
            {error && <Animated.View entering={FadeIn} style={styles.error}><Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text></Animated.View>}
          </Animated.View>
        )}
      </ScrollView>
    </Backdrop>
  );
}

const corner = { position: "absolute" as const, width: 26, height: 26, borderColor: colors.accent };
const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.text, fontSize: 18 },
  sample: { width: 170, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.sm, borderWidth: 1, borderColor: colors.line },
  sampleImg: { width: "100%", height: 190, borderRadius: radius.md, backgroundColor: "#fff" },
  action: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 16, alignItems: "center" },
  actionText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  error: { marginTop: space.lg, backgroundColor: "rgba(251,113,133,0.12)", borderColor: "rgba(251,113,133,0.4)", borderWidth: 1, borderRadius: radius.md, padding: space.md },
  frame: { height: FRAME_H, borderRadius: radius.lg, overflow: "hidden", marginTop: space.xl, backgroundColor: "#fff" },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,13,26,0.35)" },
  pdfPage: { ...StyleSheet.absoluteFill, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  pdfText: { fontSize: 64, fontWeight: "800", color: "#9ca3af", letterSpacing: 4 },
  scanLine: { position: "absolute", left: 0, right: 0, top: 0 },
  corner,
  c1: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  c2: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  c3: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  c4: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  step: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.card, borderRadius: radius.sm, padding: space.md, marginTop: space.sm, borderWidth: 1, borderColor: colors.line },
  stepTool: { color: colors.text, fontWeight: "600", fontFamily: "monospace" },
});
