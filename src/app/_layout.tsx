import { useEffect, type ReactNode } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../state";
import { ThemeProvider, useTheme } from "../themeContext";

function Shell({ children }: { children: ReactNode }) {
  const { colors, mode } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {children}
    </GestureHandlerRootView>
  );
}

function Screens() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.bg } }} />;
}

export default function RootLayout() {
  useEffect(() => {
    // Browser auto-translation rewrites text nodes and breaks React; the build also sets this in the HTML.
    if (Platform.OS === "web") document.documentElement.setAttribute("translate", "no");
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell>
          <AppProvider>
            <Screens />
          </AppProvider>
        </Shell>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
