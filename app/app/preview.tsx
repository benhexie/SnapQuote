import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { CONFIG } from "../config";
import { ChevronLeft } from "lucide-react-native";

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      if (!user || !id) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Get user settings
        const settingsRef = doc(db, "users", user.uid, "settings", "invoice");
        const settingsSnap = await getDoc(settingsRef);
        let customization = {};
        if (settingsSnap.exists()) {
          customization = settingsSnap.data();
        }

        // 2. Fetch preview HTML from backend
        const token = await user.getIdToken();
        const res = await fetch(CONFIG.api.endpoints.previewQuote(id), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(customization),
        });

        if (!res.ok) {
          throw new Error("Failed to load invoice preview");
        }

        let html = await res.text();

        // Force the viewport to a fixed desktop-like width so the WebView
        // scales it down to fit the mobile screen without cutting off the right side.
        html = html.replace(
          /<meta\s+name=["']viewport["']\s+content=["'][^"']*["']\s*\/?>/i,
          '<meta name="viewport" content="width=1024">',
        );

        setHtmlContent(html);
      } catch (e: any) {
        console.error("Error fetching preview:", e);
        setError(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [id, user]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>Invoice Preview</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Generating preview...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setLoading(true);
                setError(null);
                // The effect will not re-run just by setting state, so we'd ideally extract fetchPreview
                // For simplicity, user can just go back and re-enter.
                router.back();
              }}
            >
              <Text style={styles.retryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : htmlContent ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlContent }}
            style={styles.webview}
            scalesPageToFit={true}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#18181B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#18181B",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
