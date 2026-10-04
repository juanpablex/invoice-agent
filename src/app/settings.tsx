import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MODELS } from "../core/agent";
import { goBack } from "../nav";
import { useApp } from "../state";
import { Backdrop } from "../ui/Backdrop";
import { Press } from "../ui/Press";
import { colors, radius, space, type } from "../theme";
import { Platform } from "react-native";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [key, setKey] = useState(app.apiKey ?? "");
  const [model, setModel] = useState(app.model);
  const [remember, setRemember] = useState(app.remembered);
  const valid = key.trim().startsWith("sk-ant-") && key.trim().length > 20;
  const isWeb = Platform.OS === "web";

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Press onPress={() => goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back"><Text style={{ color: colors.text, fontSize: 18 }}>←</Text></Press>
          <Text style={type.label}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <Text style={[type.title, { marginTop: space.lg }]}>Use a real model</Text>
          <Text style={[type.small, { fontSize: 14, marginTop: space.sm, lineHeight: 20 }]}>
            Optional. With your own Anthropic API key, a Claude model reads the invoice image and decides which tools to call, instead of the script.
            Requests go {isWeb ? "straight from this browser" : "straight from this phone"} to the Anthropic API and are billed to your account. There is no server in between.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
          <Text style={type.label}>Anthropic API key</Text>
          <TextInput value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} spellCheck={false} placeholder="sk-ant-..." placeholderTextColor={colors.textDim} style={styles.input} accessibilityLabel="Anthropic API key" />

          <Text style={[type.label, { marginTop: space.lg }]}>Model</Text>
          <View style={styles.chips}>
            {MODELS.map((m) => (
              <Press key={m.id} onPress={() => setModel(m.id)} style={[styles.pill, model === m.id && styles.pillOn]} accessibilityRole="button" accessibilityState={{ selected: model === m.id }}>
                <Text style={[styles.pillText, model === m.id && { color: "#04201c" }]}>{m.label}</Text>
                <Text style={[styles.pillNote, model === m.id && { color: "#04201c" }]}>{m.note}</Text>
              </Press>
            ))}
          </View>

          {isWeb && (
            <View style={styles.switchRow}>
              <Text style={[type.body, { flex: 1 }]}>Remember the key on this device</Text>
              <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.accent, false: colors.cardHi }} />
            </View>
          )}
          <Text style={[type.small, { marginTop: space.md, lineHeight: 18 }]}>
            {isWeb ? "Without “remember”, the key is forgotten when you close the tab. " : "The key is kept in the phone's secure storage. "}
            Use a key with a low spending limit, and only on a device you trust. The model can only read the sample data and propose expenses; booking needs your swipe.
          </Text>

          <Press disabled={!valid} onPress={async () => { await app.saveKey(key.trim(), model, remember); goBack(); }} style={{ marginTop: space.lg, opacity: valid ? 1 : 0.45 }} accessibilityRole="button">
            <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}><Text style={styles.saveText}>Save and use</Text></LinearGradient>
          </Press>
        </Animated.View>

        {app.apiKey && (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={[type.body, { flex: 1 }]}>Use the real model</Text>
              <Switch value={app.useReal} onValueChange={app.setUseReal} trackColor={{ true: colors.accent, false: colors.cardHi }} />
            </View>
            <Press onPress={async () => { await app.removeKey(); setKey(""); }} style={{ marginTop: space.lg, alignSelf: "flex-start" }} accessibilityRole="button"><Text style={{ color: colors.danger, fontWeight: "700" }}>Remove key from this device</Text></Press>
          </Animated.View>
        )}
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.line, marginTop: space.lg },
  input: { marginTop: space.sm, backgroundColor: colors.bgSoft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: space.md, paddingVertical: 14, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  pill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.line },
  pillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  pillNote: { color: colors.textDim, fontSize: 11.5 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg },
  save: { height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#04201c", fontWeight: "800", fontSize: 16 },
});
