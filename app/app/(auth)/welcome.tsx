import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Sparkles, ArrowRight, PartyPopper } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

const { height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Simple floating animation for the icon
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Animated.View style={[styles.iconContainer, animatedStyle]} entering={FadeIn.duration(1000)}>
            <View style={styles.iconGlow}>
              <PartyPopper color="#4F46E5" size={64} strokeWidth={1.5} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(800)}>
            <View style={styles.badgeContainer}>
              <Sparkles color="#818CF8" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>Welcome to SnapQuote</Text>
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(500).duration(800)}
            style={styles.title}
          >
            Hi {user?.displayName ? user.displayName.split(" ")[0] : "there"}!{"\n"}
            Let's get you set up.
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(700).duration(800)}
            style={styles.subtitle}
          >
            We're thrilled to have you here. Let's personalize your experience by setting up your first invoice template.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/setup")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continue to Setup</Text>
            <ArrowRight color="#fff" size={20} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: height * 0.1,
  },
  iconContainer: {
    alignItems: "flex-start",
    marginBottom: 40,
  },
  iconGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.2)",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
  },
  badgeText: {
    color: "#818CF8",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: "#FAFAFA",
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 48,
    marginBottom: 16,
    letterSpacing: -1,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 16,
    lineHeight: 26,
    paddingRight: 20,
  },
  footer: {
    paddingBottom: Platform.OS === "ios" ? 10 : 20,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});