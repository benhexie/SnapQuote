import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Camera, Mic, FileText, Sparkles } from "lucide-react-native";

const { height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Icon Grid */}
        <Animated.View
          entering={FadeIn.delay(200).duration(1000)}
          style={styles.iconGrid}
        >
          <View style={styles.iconRow}>
            <View
              style={[styles.iconBox, { transform: [{ rotate: "-10deg" }] }]}
            >
              <Camera color="#4F46E5" size={32} />
            </View>
            <View
              style={[
                styles.iconBox,
                { transform: [{ rotate: "10deg" }], marginTop: 40 },
              ]}
            >
              <Mic color="#4F46E5" size={32} />
            </View>
          </View>
          <View style={styles.iconRow}>
            <View style={[styles.iconBox, { transform: [{ rotate: "5deg" }] }]}>
              <FileText color="#4F46E5" size={32} />
            </View>
            <View
              style={[
                styles.iconBox,
                { transform: [{ rotate: "-5deg" }], marginTop: -20 },
              ]}
            >
              <Sparkles color="#4F46E5" size={32} />
            </View>
          </View>
        </Animated.View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Animated.View entering={FadeInDown.delay(400).duration(800)}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Powered by AI</Text>
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(500).duration(800)}
            style={styles.title}
          >
            Invoices at the speed of thought.
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(600).duration(800)}
            style={styles.subtitle}
          >
            Point your camera, describe the job, and let AI generate a
            professional, ready-to-send quote in seconds.
          </Animated.Text>
        </View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(800)}
          style={styles.footer}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    paddingTop: height * 0.1,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  iconGrid: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  iconRow: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
  },
  iconBox: {
    width: 72,
    height: 72,
    backgroundColor: "#18181B",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272A",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
  },
  textContainer: {
    marginBottom: 40,
  },
  badgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 16,
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
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48,
    marginBottom: 16,
    letterSpacing: -1,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  footer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  secondaryButtonText: {
    color: "#FAFAFA",
    fontSize: 16,
    fontWeight: "600",
  },
});
