import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { colors, radius } from "../theme";

const HANDLE = 56;
const PAD = 4;

/** Swipe the handle all the way to approve. Releasing early springs back. */
export function SwipeToApprove({ label, onApproved, disabled }: { label: string; onApproved: () => void; disabled?: boolean }) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const max = Math.max(width - HANDLE - PAD * 2, 1);

  const done = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onApproved();
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      x.value = Math.min(Math.max(e.translationX, 0), max);
    })
    .onEnd(() => {
      if (x.value > max * 0.85) {
        x.value = withTiming(max, { duration: 120 });
        scheduleOnRN(done);
      } else {
        x.value = withSpring(0, { damping: 16, stiffness: 220 });
      }
    });

  const handle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + HANDLE + PAD * 2 }));
  const text = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.5], [1, 0], Extrapolation.CLAMP) }));

  return (
    <View style={[styles.track, disabled && { opacity: 0.5 }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.fill, fill]}>
        <LinearGradient colors={["rgba(94,234,212,0.35)", "rgba(124,140,255,0.35)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.Text style={[styles.label, text]}>{label}</Animated.Text>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.handle, handle]}>
          <LinearGradient colors={[colors.accent, colors.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.handleInner}>
            <Text style={styles.arrow}>→</Text>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HANDLE + PAD * 2, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: PAD, justifyContent: "center", overflow: "hidden" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: radius.pill, overflow: "hidden" },
  label: { position: "absolute", alignSelf: "center", color: colors.textDim, fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
  handle: { width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, overflow: "hidden" },
  handleInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  arrow: { color: "#04201c", fontSize: 24, fontWeight: "800" },
});
