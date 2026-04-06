import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Alert,
  PanResponder,
  Animated as RNAnimated,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  Share,
  Send,
  Edit2,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  Trash2,
  Eye,
} from "lucide-react-native";
import { CONFIG } from "../../config";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { getCurrencySymbol } from "../../utils/currency";
import { Video, ResizeMode } from "expo-av";

type LineItem = {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
  discount?: number;
  discount_percentage?: number;
};

type InvoiceData = {
  status?: "processing" | "completed";
  line_items: LineItem[];
  total: number;
  subtotal: number;
  taxes: number;
  project_name: string;
  date: string;
  transcript?: string;
  media_url?: string;
  prompt?: string;
  currency?: string;
};

export default function InvoiceReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LineItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">(
    "amount",
  );
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isSavingManualEdit, setIsSavingManualEdit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showOriginalRequest, setShowOriginalRequest] = useState(false);
  const videoRef = useRef<Video>(null);

  const panY = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (isEditing) {
      panY.setValue(0);
    }
  }, [isEditing]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: RNAnimated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.5) {
          setIsEditing(false);
        } else {
          RNAnimated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (!user || !id) return;
    const docRef = doc(db, "invoices", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setInvoice(docSnap.data() as InvoiceData);
      }
    });

    const settingsRef = doc(db, "users", user.uid, "settings", "invoice");
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, [id, user]);

  const handleSendPrompt = async () => {
    if (!chatInput.trim() || !user) return;
    setIsProcessingEdit(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(CONFIG.api.endpoints.editQuote, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoice_id: id, prompt: chatInput }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to edit quote");
      }
      setChatInput("");
    } catch (e) {
      console.error(e);
      alert("Failed to send edit prompt.");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const saveManualEdit = async () => {
    if (!selectedItem || !user || !id || !invoice) return;
    setIsEditing(false);
    setIsSavingManualEdit(true);

    try {
      const newPrice = parseFloat(editPrice);
      const newQuantity = parseInt(editQuantity, 10);
      let newDiscount = 0;
      let newDiscountPercentage: number | undefined = undefined;

      if (editDiscount.trim()) {
        const parsedDiscount = parseFloat(editDiscount);
        if (discountType === "percentage") {
          newDiscountPercentage = parsedDiscount;
          newDiscount = newPrice * newQuantity * (parsedDiscount / 100);
        } else {
          newDiscount = parsedDiscount;
        }
      }

      if (isNaN(newPrice) || isNaN(newQuantity) || isNaN(newDiscount)) {
        throw new Error("Invalid input values");
      }

      // 1. Update the specific line item
      const updatedLineItems = (invoice.line_items || []).map((item) => {
        if (item.id === selectedItem.id) {
          const { discount, discount_percentage, ...rest } = item;
          const updatedItem: any = {
            ...rest,
            unit_price: newPrice,
            quantity: newQuantity,
          };
          if (newDiscount > 0) {
            updatedItem.discount = newDiscount;
          }
          if (newDiscountPercentage !== undefined) {
            updatedItem.discount_percentage = newDiscountPercentage;
          }
          return updatedItem;
        }
        return item;
      });

      // 2. Recalculate subtotal
      const newSubtotal = updatedLineItems.reduce((sum, item) => {
        const itemTotal =
          item.quantity * item.unit_price - (item.discount || 0);
        return sum + itemTotal;
      }, 0);

      // 3. Recalculate total (assuming total = subtotal + taxes)
      // Note: If taxes are a percentage, this logic might need adjustment.
      // But currently taxes seem to be a flat amount in the invoice data.
      const currentTaxes = invoice.taxes || 0;
      const newTotal = newSubtotal + currentTaxes;

      // 4. Update Firestore directly
      await setDoc(
        doc(db, "invoices", id),
        {
          line_items: updatedLineItems,
          subtotal: Number(newSubtotal.toFixed(2)),
          total: Number(newTotal.toFixed(2)),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Failed to save manual edit:", e);
      Alert.alert("Error", "Failed to save edit.");
    } finally {
      setIsSavingManualEdit(false);
    }
  };

  const currencySymbol = getCurrencySymbol(invoice?.currency);

  const generatePDF = async () => {
    if (!invoice || !user || !id || isExporting) return;
    setIsExporting(true);

    try {
      // 1. Get user settings
      let customization = settings || {};

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
        throw new Error("Failed to load invoice preview for export");
      }

      const html = await res.text();

      // 3. Generate PDF and share
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (e: any) {
      console.error("Error generating PDF:", e);
      Alert.alert(
        "Export Error",
        e.message || "Something went wrong while exporting.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = () => {
    if (!invoice || !id) return;
    Alert.alert(
      "Delete Invoice",
      "Are you sure you want to delete this invoice? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete associated media from Storage if it's hosted on Firebase
              if (
                invoice.media_url &&
                invoice.media_url.includes("firebasestorage")
              ) {
                try {
                  const mediaRef = ref(storage, invoice.media_url);
                  await deleteObject(mediaRef);
                  console.log("Deleted associated media:", invoice.media_url);
                } catch (mediaErr) {
                  console.error(
                    "Failed to delete media from storage:",
                    mediaErr,
                  );
                }
              }
              // Delete the document from Firestore
              await deleteDoc(doc(db, "invoices", id));
              Alert.alert("Deleted", "Invoice deleted successfully.");
              router.replace("/(tabs)/two");
            } catch (error: any) {
              console.error("Error deleting invoice:", error);
              Alert.alert(
                "Error",
                "Failed to delete invoice: " + error.message,
              );
            }
          },
        },
      ],
    );
  };

  const renderMediaPreview = () => {
    if (!invoice?.media_url) return null;
    const url = invoice.media_url.toLowerCase();
    const isVideo = url.includes(".mov") || url.includes(".mp4");
    const isImage =
      url.includes(".jpg") || url.includes(".jpeg") || url.includes(".png");

    if (isVideo) {
      return (
        <View style={styles.mediaWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: invoice.media_url }}
            style={styles.mediaPreview}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping={false}
          />
        </View>
      );
    }

    if (isImage) {
      return (
        <View style={styles.mediaWrapper}>
          <Image
            source={{ uri: invoice.media_url }}
            style={styles.mediaPreview}
            resizeMode="cover"
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.documentPreview}
        onPress={() => Linking.openURL(invoice.media_url!)}
      >
        <FileText color="#818CF8" size={32} />
        <Text style={styles.documentText}>View Attached Document</Text>
      </TouchableOpacity>
    );
  };

  if (
    !invoice ||
    (!invoice.line_items?.length && invoice.status === "processing")
  ) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Invoice Review</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.processingContent}
          >
            <ActivityIndicator
              size="large"
              color="#818CF8"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.processingTitleRow}>
              <Sparkles color="#818CF8" size={24} />
              <Text style={styles.processingTitle}>AI is working</Text>
            </View>
            <Text style={styles.processingSubtitle}>
              Generating your itemized invoice...
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Invoice Review</Text>
            <View
              style={[
                styles.proBadge,
                { backgroundColor: settings?.theme_color || "#4F46E5" },
              ]}
            >
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                styles.shareButton,
                {
                  marginRight: 12,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  borderRadius: 18,
                  width: 36,
                  height: 36,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Trash2 color="#EF4444" size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: "/preview" as any, params: { id } })
              }
              style={[
                styles.shareButton,
                {
                  marginRight: 12,
                  width: 36,
                  height: 36,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Eye color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={generatePDF}
              disabled={isExporting}
              style={[
                styles.shareButton,
                {
                  width: 36,
                  height: 36,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: isExporting ? 0.7 : 1,
                },
              ]}
            >
              {isExporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Share color="#fff" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.invoiceScroll}
            contentContainerStyle={styles.invoiceScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Request Context Card */}
            {(invoice.prompt || invoice.media_url || invoice.transcript) && (
              <View style={styles.requestContextCard}>
                <TouchableOpacity
                  style={[
                    styles.requestContextHeader,
                    { justifyContent: "space-between" },
                  ]}
                  onPress={() => setShowOriginalRequest(!showOriginalRequest)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MessageSquare color="#A1A1AA" size={16} />
                    <Text style={styles.requestContextTitle}>
                      Original Request
                    </Text>
                  </View>
                  {showOriginalRequest ? (
                    <ChevronUp color="#A1A1AA" size={20} />
                  ) : (
                    <ChevronDown color="#A1A1AA" size={20} />
                  )}
                </TouchableOpacity>

                {showOriginalRequest && (
                  <View style={{ marginTop: 12 }}>
                    {invoice.prompt && (
                      <Text style={styles.promptText}>"{invoice.prompt}"</Text>
                    )}

                    {renderMediaPreview()}

                    {invoice.transcript ? (
                      <View style={styles.transcriptSection}>
                        <View style={styles.transcriptHeader}>
                          <Sparkles color="#818CF8" size={14} />
                          <Text style={styles.transcriptLabel}>
                            Audio Transcript
                          </Text>
                        </View>
                        <Text style={styles.transcriptText}>
                          {invoice.transcript}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            )}

            {/* Line Items */}
            <Text style={styles.sectionTitle}>Generated Invoice</Text>
            {invoice.line_items?.map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.lineItemCard}
                onPress={() => {
                  setSelectedItem(item);
                  setEditPrice(item.unit_price.toString());
                  setEditQuantity(item.quantity.toString());
                  if (item.discount_percentage) {
                    setEditDiscount(item.discount_percentage.toString());
                    setDiscountType("percentage");
                  } else {
                    setEditDiscount(
                      item.discount ? item.discount.toString() : "",
                    );
                    setDiscountType("amount");
                  }
                  setIsEditing(true);
                }}
                disabled={isProcessingEdit}
              >
                <View style={styles.lineItemContent}>
                  <View style={styles.lineItemHeader}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyText}>{item.quantity}x</Text>
                    </View>
                  </View>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  {item.discount_percentage ? (
                    <Text
                      style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}
                    >
                      Discount: {item.discount_percentage}% (-{currencySymbol}
                      {item.discount?.toFixed(2) || "0.00"})
                    </Text>
                  ) : item.discount ? (
                    <Text
                      style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}
                    >
                      Discount: -{currencySymbol}
                      {item.discount.toFixed(2)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>
                    {currencySymbol}
                    {(
                      item.quantity * item.unit_price -
                      (item.discount || 0)
                    ).toFixed(2)}
                  </Text>
                  <Edit2 color="#888" size={16} style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            ))}

            <View
              style={[
                styles.totalCard,
                {
                  backgroundColor: settings?.theme_color || "#4F46E5",
                  shadowColor: settings?.theme_color || "#4F46E5",
                },
              ]}
            >
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalPrice}>
                {currencySymbol}
                {invoice.total}
              </Text>
            </View>
          </ScrollView>

          {isProcessingEdit && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.processingOverlay}
            >
              <View style={styles.processingContent}>
                <ActivityIndicator
                  size="large"
                  color="#818CF8"
                  style={{ marginBottom: 16 }}
                />
                <View style={styles.processingTitleRow}>
                  <Sparkles color="#818CF8" size={20} />
                  <Text style={styles.processingTitle}>AI is working</Text>
                </View>
                <Text style={styles.processingSubtitle}>
                  Updating your invoice...
                </Text>
              </View>
            </Animated.View>
          )}

          {isSavingManualEdit && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.processingOverlay}
            >
              <View style={styles.processingContent}>
                <ActivityIndicator
                  size="large"
                  color="#818CF8"
                  style={{ marginBottom: 16 }}
                />
                <View style={styles.processingTitleRow}>
                  <Edit2 color="#818CF8" size={20} />
                  <Text style={styles.processingTitle}>Saving Changes</Text>
                </View>
                <Text style={styles.processingSubtitle}>
                  Updating your invoice...
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        <View style={styles.chatContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder={`e.g., Add ${currencySymbol}50 disposal fee`}
            placeholderTextColor="#888"
            value={chatInput}
            onChangeText={setChatInput}
            editable={!isProcessingEdit}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: settings?.theme_color || "#4F46E5" },
            ]}
            onPress={handleSendPrompt}
            disabled={isProcessingEdit || !chatInput.trim()}
          >
            {isProcessingEdit ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Send color={chatInput.trim() ? "#fff" : "#A1A1AA"} size={20} />
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={isEditing}
          transparent
          animationType="slide"
          onRequestClose={() => setIsEditing(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => setIsEditing(false)}>
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
              <RNAnimated.View
                style={[
                  styles.modalContent,
                  {
                    transform: [
                      {
                        translateY: panY.interpolate({
                          inputRange: [0, 1000],
                          outputRange: [0, 1000],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View {...panResponder.panHandlers}>
                  <View style={styles.dragHandleContainer}>
                    <View style={styles.dragHandle} />
                  </View>
                  <Text style={styles.modalTitle}>Edit Item</Text>
                  <Text style={styles.modalDesc}>
                    {selectedItem?.description}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    placeholder="e.g. 1"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Unit Price ({currencySymbol})
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    placeholder="e.g. 150.00"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Discount</Text>

                  {/* Type Toggle */}
                  <View
                    style={{
                      flexDirection: "row",
                      marginBottom: 8,
                      backgroundColor: "#1e1e1e",
                      borderRadius: 8,
                      padding: 4,
                      borderWidth: 1,
                      borderColor: "#2c2c2c",
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        alignItems: "center",
                        backgroundColor:
                          discountType === "amount" ? "#2c2c2c" : "transparent",
                        borderRadius: 6,
                      }}
                      onPress={() => {
                        if (discountType !== "amount") {
                          setDiscountType("amount");
                          setEditDiscount("");
                        }
                      }}
                    >
                      <Text
                        style={{
                          color: discountType === "amount" ? "#fff" : "#888",
                          fontWeight: "600",
                        }}
                      >
                        Amount ({currencySymbol})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        alignItems: "center",
                        backgroundColor:
                          discountType === "percentage"
                            ? "#2c2c2c"
                            : "transparent",
                        borderRadius: 6,
                      }}
                      onPress={() => {
                        if (discountType !== "percentage") {
                          setDiscountType("percentage");
                          setEditDiscount("");
                        }
                      }}
                    >
                      <Text
                        style={{
                          color:
                            discountType === "percentage" ? "#fff" : "#888",
                          fontWeight: "600",
                        }}
                      >
                        Percentage (%)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.modalInput,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 0,
                      },
                    ]}
                  >
                    {discountType === "amount" && (
                      <Text
                        style={{ color: "#888", fontSize: 16, paddingLeft: 16 }}
                      >
                        {currencySymbol}
                      </Text>
                    )}
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        color: "#fff",
                        fontSize: 16,
                      }}
                      keyboardType="numeric"
                      value={editDiscount}
                      onChangeText={setEditDiscount}
                      placeholder={discountType === "amount" ? "0.00" : "10"}
                      placeholderTextColor="#555"
                    />
                    {discountType === "percentage" && (
                      <Text
                        style={{
                          color: "#888",
                          fontSize: 16,
                          paddingRight: 16,
                        }}
                      >
                        %
                      </Text>
                    )}
                  </View>

                  {/* Quick percentage buttons */}
                  {discountType === "percentage" && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      {[5, 10, 15, 20].map((pct) => (
                        <TouchableOpacity
                          key={pct}
                          style={{
                            backgroundColor:
                              editDiscount === pct.toString()
                                ? settings?.theme_color || "#4F46E5"
                                : "#2c2c2c",
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            flex: 1,
                            marginHorizontal: 4,
                            alignItems: "center",
                          }}
                          onPress={() => setEditDiscount(pct.toString())}
                        >
                          <Text style={{ color: "#fff", fontWeight: "600" }}>
                            {pct}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.modalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      styles.saveBtn,
                      { backgroundColor: settings?.theme_color || "#4F46E5" },
                    ]}
                    onPress={saveManualEdit}
                  >
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </RNAnimated.View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#121212",
    borderBottomWidth: 1,
    borderBottomColor: "#2c2c2c",
  },
  backBtn: {
    padding: 4,
    marginLeft: -8,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  proBadge: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  proBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  shareButton: { padding: 4 },
  invoiceScroll: { flex: 1 },
  invoiceScrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  requestContextCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  requestContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  requestContextTitle: {
    color: "#A1A1AA",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptText: {
    color: "#E4E4E7",
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
    marginBottom: 16,
  },
  mediaWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    height: 200,
    marginBottom: 16,
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  documentPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    marginBottom: 16,
    gap: 12,
  },
  documentText: {
    color: "#818CF8",
    fontSize: 16,
    fontWeight: "600",
  },
  transcriptSection: {
    backgroundColor: "#2c2c2c",
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  transcriptLabel: {
    color: "#818CF8",
    fontSize: 12,
    fontWeight: "600",
  },
  transcriptText: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
  },
  lineItemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  lineItemContent: { flex: 1, marginRight: 16 },
  lineItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  qtyBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qtyText: { color: "#ccc", fontSize: 10, fontWeight: "bold" },
  itemDesc: { color: "#E4E4E7", fontSize: 16, fontWeight: "500" },
  priceRow: { flexDirection: "row", alignItems: "center" },
  itemPrice: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  totalText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  totalPrice: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  chatContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2c2c2c",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#2c2c2c",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingBottom: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#3f3f46",
    borderRadius: 2,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalDesc: {
    color: "#A1A1AA",
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#E4E4E7",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    backgroundColor: "#2c2c2c",
    color: "#fff",
    fontSize: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2c2c2c",
  },
  saveBtn: { backgroundColor: "#4F46E5" },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 18, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  processingContent: {
    backgroundColor: "#1e1e1e",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  processingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  processingTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  processingSubtitle: {
    color: "#888",
    fontSize: 14,
  },
});
