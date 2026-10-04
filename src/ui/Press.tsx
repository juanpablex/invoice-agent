import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that squeezes slightly while pressed and gives a light tap on phones. */
export function Press({ style, onPressIn, onPressOut, onPress, ...rest }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => { s.value = withSpring(0.96, { damping: 18, stiffness: 300 }); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 14, stiffness: 260 }); onPressOut?.(e); }}
      onPress={(e) => { Haptics.selectionAsync().catch(() => {}); onPress?.(e); }}
    />
  );
}
