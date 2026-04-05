import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, ArrowRight, LogOut, RefreshCw } from "lucide-react-native";
import { auth } from "../../firebaseConfig";
import { signOut, sendEmailVerification } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function VerifyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleContinue = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    
    try {
      // We must reload the user to get the latest emailVerified status from Firebase
      await auth.currentUser?.reload();
      
      if (auth.currentUser?.emailVerified) {
        router.replace("/(tabs)");
      } else {
        await signOut(auth);
        router.replace({
          pathname: "/(auth)/login",
          params: { error: "Please verify your email before continuing." }
        });
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    
    setResendLoading(true);
    setError("");
    setMessage("");
    
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage("Verification email resent! Please check your inbox and spam folder.");
    } catch (e: any) {
      if (e.code === "auth/too-many-requests") {
        setError("Please wait a few minutes before requesting another email.");
      } else {
        setError(e.message || "Failed to resend email");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Mail color="#4F46E5" size={40} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.textContainer}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification link to{"\n"}
            <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
          </Text>
          <Text style={styles.description}>
            Please verify your email address to secure your account and continue using SnapQuote AI.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.actionContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading || resendLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>I've verified my email</Text>
                <ArrowRight color="#fff" size={20} style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, resendLoading && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={loading || resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <>
                <RefreshCw color="#4F46E5" size={18} style={styles.secondaryButtonIcon} />
                <Text style={styles.secondaryButtonText}>Resend email</Text>
              </>
            )}
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
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FAFAFA",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#A1A1AA",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  emailText: {
    color: "#FAFAFA",
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  actionContainer: {
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
  },
  secondaryButtonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonIcon: {
    marginRight: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  logoutText: {
    color: "#A1A1AA",
    fontSize: 15,
    fontWeight: "500",
  },
  logoutIcon: {
    marginRight: 8,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  successContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: "#10B981",
    fontSize: 14,
    textAlign: "center",
  },
});