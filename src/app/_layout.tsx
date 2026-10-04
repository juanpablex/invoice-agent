import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../state";
import { colors } from "../theme";

export default function RootLayout() {
  useEffect(() => {
    // Browser auto-translation rewrites text nodes and breaks React; the build also sets this in the HTML.
    if (Platform.OS === "web") document.documentElement.setAttribute("translate", "no");
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.bg } }} />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
