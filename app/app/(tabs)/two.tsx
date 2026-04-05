import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FileText } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

interface Invoice {
  id: string;
  project_name: string;
  date: Timestamp | Date | string;
  total: number;
  status?: string;
  media_url?: string;
  prompt?: string;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const invoicesRef = collection(db, "invoices");
    const q = query(
      invoicesRef,
      where("user_id", "==", user.uid),
      orderBy("date", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedInvoices: Invoice[] = [];
        querySnapshot.forEach((doc) => {
          fetchedInvoices.push({ id: doc.id, ...doc.data() } as Invoice);
        });
        setInvoices(fetchedInvoices);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      (err: any) => {
        console.error("Error fetching invoices:", err);
        if (err.message?.includes("index")) {
          setError(
            "Database index is building. Please try again in a few minutes.",
          );
        } else {
          setError("Failed to load invoices. Pull to refresh.");
        }
        setLoading(false);
        setRefreshing(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const onRefresh = () => {
    // For onSnapshot, pull to refresh is more of a placebo or could just wait for updates.
    // We can just set refreshing to true briefly.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date";

    // Handle Firestore Timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    let dateObj = new Date(timestamp);

    // If it's a "YYYY-MM-DD" string, avoid timezone offset issues by manually parsing
    if (typeof timestamp === "string") {
      const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        dateObj = new Date(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10),
        );
      }
    }

    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      return String(timestamp);
    }

    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.subtitle}>Your recent generated invoices</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4F46E5"
              colors={["#4F46E5"]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/invoice/${item.id}`)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.iconContainer}>
                  <FileText color="#818CF8" size={20} />
                </View>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>Invoice</Text>
                </View>
              </View>

              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.project_name || "Untitled Invoice"}
              </Text>

              <View style={styles.cardBottomRow}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                {item.status === "processing" ? (
                  <Text
                    style={[
                      styles.cardAmount,
                      { color: "#818CF8", fontSize: 14 },
                    ]}
                  >
                    Generating...
                  </Text>
                ) : (
                  <Text style={styles.cardAmount}>
                    {formatCurrency(item.total)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText color="#52525B" size={48} />
              <Text style={styles.emptyStateTitle}>No invoices yet</Text>
              <Text style={styles.emptyStateSub}>
                Record a video to generate your first invoice.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#A1A1AA",
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#18181B",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27272A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeContainer: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#4ADE80",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F4F4F5",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardDate: {
    fontSize: 14,
    color: "#A1A1AA",
    fontWeight: "500",
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 14,
    color: "#A1A1AA",
    marginTop: 8,
    textAlign: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#27272A",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "500",
  },
});
