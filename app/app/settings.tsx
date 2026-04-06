import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  PanResponder,
  Animated as RNAnimated,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../firebaseConfig";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";
import SignatureScreen from "react-native-signature-canvas";
import {
  Check,
  Building2,
  MapPin,
  Phone,
  Mail,
  Image as ImageIcon,
  Crown,
  PenTool,
  DollarSign,
  Search,
  X,
} from "lucide-react-native";
import { searchCurrency, Currency } from "../utils/currency";

const TEMPLATES = [
  { id: "premium", name: "Premium", color: "#7C3AED", isPremium: true },
  { id: "elegant", name: "Elegant", color: "#D4AF37", isPremium: true },
  { id: "bold", name: "Bold", color: "#FF3366", isPremium: true },
  { id: "modern", name: "Modern", color: "#4F46E5" },
  { id: "classic", name: "Classic", color: "#10B981" },
  { id: "minimal", name: "Minimalist", color: "#F59E0B" },
];

const PRESET_COLORS = [
  "#4F46E5", // Indigo (Default)
  "#2563EB", // Blue
  "#0EA5E9", // Light Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#000000", // Black
];

const TemplatePreview = ({ type, color }: { type: string; color: string }) => {
  if (type === "premium") {
    return (
      <View style={styles.previewContainer}>
        <View
          style={[
            {
              height: 16,
              width: "100%",
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              backgroundColor: "#18181B",
            },
          ]}
        />
        <View style={styles.previewContent}>
          <View style={[styles.previewRow, { marginTop: -4 }]}>
            <View
              style={[
                styles.previewBlock,
                {
                  width: 20,
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#e4e4e7",
                },
              ]}
            />
            <View
              style={[
                styles.previewBlock,
                {
                  width: 20,
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#e4e4e7",
                },
              ]}
            />
          </View>
          <View style={[styles.previewLine, { marginTop: 12 }]} />
          <View style={styles.previewLine} />
          <View
            style={[
              styles.previewRow,
              { marginTop: 8, justifyContent: "flex-end" },
            ]}
          >
            <View
              style={[
                styles.previewBlock,
                {
                  width: 25,
                  backgroundColor: "#18181B",
                  height: 12,
                  borderRadius: 2,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (type === "elegant") {
    return (
      <View style={styles.previewContainer}>
        <View style={[{ height: 4, width: "100%", backgroundColor: color }]} />
        <View style={styles.previewContent}>
          <View style={styles.previewRow}>
            <View style={[styles.previewBlock, { width: 20, height: 10 }]} />
            <View style={[styles.previewBlock, { width: 30 }]} />
          </View>
          <View
            style={[
              styles.previewLine,
              { marginTop: 12, height: 1, backgroundColor: "#d4d4d8" },
            ]}
          />
          <View style={[styles.previewRow, { marginTop: 8 }]}>
            <View style={styles.previewBlock} />
            <View style={styles.previewBlock} />
          </View>
          <View
            style={[
              styles.previewLine,
              { marginTop: 12, height: 1, backgroundColor: "#d4d4d8" },
            ]}
          />
          <View
            style={[
              styles.previewRow,
              { marginTop: 8, justifyContent: "flex-end" },
            ]}
          >
            <View style={[styles.previewBlock, { width: 25 }]} />
          </View>
          <View
            style={[
              {
                height: 2,
                width: "100%",
                backgroundColor: "#18181B",
                position: "absolute",
                bottom: 4,
                left: 8,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  if (type === "bold") {
    return (
      <View style={styles.previewContainer}>
        <View style={{ flexDirection: "row", height: "100%" }}>
          <View
            style={{ width: "30%", backgroundColor: color, height: "100%" }}
          />
          <View style={{ width: "70%", padding: 8 }}>
            <View style={[styles.previewRow, { marginTop: 4 }]}>
              <View style={styles.previewBlock} />
              <View style={styles.previewBlock} />
            </View>
            <View style={[styles.previewLine, { marginTop: 12 }]} />
            <View style={styles.previewLine} />
            <View
              style={[
                styles.previewBlock,
                {
                  width: "100%",
                  height: 16,
                  backgroundColor: "#f4f4f5",
                  marginTop: 8,
                  borderRadius: 2,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (type === "modern") {
    return (
      <View style={styles.previewContainer}>
        <View
          style={[styles.previewHeaderModern, { backgroundColor: color }]}
        />
        <View style={styles.previewContent}>
          <View style={styles.previewRow}>
            <View style={styles.previewBlock} />
            <View style={[styles.previewBlock, { width: 30 }]} />
          </View>
          <View style={[styles.previewLine, { marginTop: 8 }]} />
          <View style={styles.previewLine} />
          <View
            style={[
              styles.previewRow,
              { marginTop: 8, justifyContent: "flex-end" },
            ]}
          >
            <View
              style={[
                styles.previewBlock,
                { width: 25, backgroundColor: color },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (type === "classic") {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewContent}>
          <View
            style={[
              styles.previewBlock,
              {
                alignSelf: "center",
                width: 40,
                height: 8,
                backgroundColor: color,
              },
            ]}
          />
          <View style={[styles.previewLine, { marginTop: 4, height: 1 }]} />
          <View style={[styles.previewRow, { marginTop: 8 }]}>
            <View style={styles.previewBlock} />
          </View>
          <View
            style={[
              styles.previewLine,
              {
                marginTop: 8,
                height: 12,
                backgroundColor: "#e4e4e7",
                borderWidth: 1,
                borderColor: "#d4d4d8",
              },
            ]}
          />
          <View
            style={[
              styles.previewLine,
              {
                height: 12,
                backgroundColor: "#fafafa",
                borderWidth: 1,
                borderColor: "#d4d4d8",
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewContent}>
        <View
          style={[
            styles.previewBlock,
            { width: 20, height: 10, borderRadius: 2 },
          ]}
        />
        <View
          style={[
            styles.previewBlock,
            { width: 30, marginTop: 4, opacity: 0.5 },
          ]}
        />
        <View style={[styles.previewLine, { marginTop: 12, opacity: 0.3 }]} />
        <View style={[styles.previewLine, { opacity: 0.3 }]} />
        <View style={[styles.previewLine, { opacity: 0.3 }]} />
        <View
          style={[
            styles.previewBlock,
            {
              width: 25,
              marginTop: 8,
              alignSelf: "flex-end",
              backgroundColor: color,
              opacity: 0.8,
            },
          ]}
        />
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialState, setInitialState] = useState({
    template: TEMPLATES[0].id,
    companyName: "",
    address: "",
    phone: "",
    email: user?.email || "",
    companyLogo: "",
    signatureUrl: "",
    currency: "USD",
    themeColor: PRESET_COLORS[0],
  });
  const [selectedTemplate, setSelectedTemplate] = useState(
    initialState.template,
  );
  const [companyName, setCompanyName] = useState(initialState.companyName);
  const [address, setAddress] = useState(initialState.address);
  const [phone, setPhone] = useState(initialState.phone);
  const [email, setEmail] = useState(initialState.email);
  const [companyLogo, setCompanyLogo] = useState(initialState.companyLogo);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(initialState.signatureUrl);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [currency, setCurrency] = useState(initialState.currency);
  const [themeColor, setThemeColor] = useState(initialState.themeColor);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState("");
  const [currencySearchResults, setCurrencySearchResults] = useState<
    Currency[]
  >([]);

  const panY = useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    if (showCurrencyModal) {
      panY.setValue(0);
    }
  }, [showCurrencyModal]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: RNAnimated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.5) {
          setShowCurrencyModal(false);
        } else {
          RNAnimated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const signatureRef = useRef<any>(null);

  const hasChanges =
    selectedTemplate !== initialState.template ||
    companyName !== initialState.companyName ||
    address !== initialState.address ||
    phone !== initialState.phone ||
    email !== initialState.email ||
    companyLogo !== initialState.companyLogo ||
    signatureUrl !== initialState.signatureUrl ||
    currency !== initialState.currency ||
    themeColor !== initialState.themeColor;

  React.useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const customizationRef = doc(
          db,
          "users",
          user.uid,
          "settings",
          "invoice",
        );
        const docSnap = await getDoc(customizationRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedState = {
            template: data.template || TEMPLATES[0].id,
            companyName: data.companyName || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || user?.email || "",
            companyLogo: data.company_logo || "",
            signatureUrl: data.signature_url || "",
            currency: data.currency || "USD",
            themeColor: data.theme_color || PRESET_COLORS[0],
          };
          setInitialState(loadedState);
          setSelectedTemplate(loadedState.template);
          setCompanyName(loadedState.companyName);
          setAddress(loadedState.address);
          setPhone(loadedState.phone);
          setEmail(loadedState.email);
          setCompanyLogo(loadedState.companyLogo);
          setSignatureUrl(loadedState.signatureUrl);
          setCurrency(loadedState.currency);
          setThemeColor(loadedState.themeColor);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setFetching(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleLogoUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setCompanyLogo(result.assets[0].uri);
    } catch (error: any) {
      console.error("Error picking logo:", error);
      alert("Failed to pick logo: " + error.message);
    }
  };

  const handleSignatureUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setSignatureUrl(result.assets[0].uri);
    } catch (error: any) {
      console.error("Error picking signature:", error);
      alert("Failed to pick signature: " + error.message);
    }
  };

  const handleSignatureOK = (signature: string) => {
    setShowSignatureCanvas(false);
    setSignatureUrl(signature);
  };

  const uploadImageToStorage = async (
    uri: string,
    pathPrefix: string,
  ): Promise<string> => {
    if (!uri || uri.startsWith("http")) return uri;

    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const isDataUri = uri.startsWith("data:");
    const filename = isDataUri
      ? "drawn.png"
      : uri.split("/").pop() || "upload.jpg";
    const fileRef = ref(
      storage,
      `${pathPrefix}/${user!.uid}/${Date.now()}_${filename}`,
    );

    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!companyName.trim()) {
      alert("Please enter your company name.");
      return;
    }

    setLoading(true);
    try {
      const finalLogoUrl = await uploadImageToStorage(companyLogo, "logos");
      const finalSignatureUrl = await uploadImageToStorage(
        signatureUrl,
        "signatures",
      );

      // Helper to delete old image from Firebase Storage
      const deleteOldImage = async (oldUrl: string, newUrl: string) => {
        if (oldUrl && oldUrl !== newUrl && oldUrl.includes("firebasestorage")) {
          try {
            const oldRef = ref(storage, oldUrl);
            await deleteObject(oldRef);
            console.log("Deleted old image:", oldUrl);
          } catch (err) {
            console.error("Failed to delete old image:", err);
          }
        }
      };

      await deleteOldImage(initialState.companyLogo, finalLogoUrl);
      await deleteOldImage(initialState.signatureUrl, finalSignatureUrl);

      const customizationRef = doc(
        db,
        "users",
        user.uid,
        "settings",
        "invoice",
      );
      await setDoc(
        customizationRef,
        {
          template: selectedTemplate,
          companyName,
          address,
          phone,
          email,
          company_logo: finalLogoUrl,
          signature_url: finalSignatureUrl,
          currency,
          theme_color: themeColor,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      setCompanyLogo(finalLogoUrl);
      setSignatureUrl(finalSignatureUrl);
      setInitialState({
        template: selectedTemplate,
        companyName,
        address,
        phone,
        email,
        companyLogo: finalLogoUrl,
        signatureUrl: finalSignatureUrl,
        currency,
        themeColor,
      });

      router.back();
    } catch (e: any) {
      console.error(e);
      alert("Failed to save settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
        >
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.headerTitle}>Template Settings</Text>
            <Text style={styles.headerSubtitle}>
              Update your default invoice template and business details.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Invoice Template</Text>
            <View style={styles.templateGrid}>
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    style={[
                      styles.templateCard,
                      isSelected && {
                        borderColor: tmpl.color,
                        backgroundColor: `${tmpl.color}15`,
                      },
                    ]}
                    onPress={() => setSelectedTemplate(tmpl.id)}
                  >
                    <View
                      style={[
                        styles.templatePreviewBox,
                        isSelected && {
                          borderColor: tmpl.color,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <TemplatePreview type={tmpl.id} color={tmpl.color} />
                      {(tmpl as any).isPremium && (
                        <View style={styles.premiumBadge}>
                          <Crown color="#fff" size={10} />
                          <Text style={styles.premiumText}>PRO</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.templateName,
                        isSelected && { color: tmpl.color, fontWeight: "bold" },
                      ]}
                    >
                      {tmpl.name}
                    </Text>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: tmpl.color },
                        ]}
                      >
                        <Check color="#fff" size={12} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Theme Color</Text>
            <Text style={styles.sectionSubtitle}>
              Choose a primary color for your invoice elements.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPalette}
            >
              {PRESET_COLORS.map((color) => {
                const isSelected = themeColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setThemeColor(color)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      isSelected && styles.colorSwatchSelected,
                    ]}
                  >
                    {isSelected && (
                      <Check
                        color={
                          color === "#000000" || color === "#18181B"
                            ? "#fff"
                            : "#fff"
                        }
                        size={16}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Business Details</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Building2 color="#A1A1AA" size={20} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Company Name"
                placeholderTextColor="#A1A1AA"
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MapPin color="#A1A1AA" size={20} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Business Address"
                placeholderTextColor="#A1A1AA"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Phone color="#A1A1AA" size={20} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#A1A1AA"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Mail color="#A1A1AA" size={20} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Business Email"
                placeholderTextColor="#A1A1AA"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={styles.inputGroup}
              onPress={() => {
                setCurrencySearchQuery("");
                setCurrencySearchResults(searchCurrency(""));
                setShowCurrencyModal(true);
              }}
            >
              <View style={styles.inputIcon}>
                <DollarSign color="#A1A1AA" size={20} />
              </View>
              <View style={[styles.input, { justifyContent: "center" }]}>
                <Text
                  style={{
                    color: currency ? "#FAFAFA" : "#A1A1AA",
                    fontSize: 16,
                  }}
                >
                  {currency ? currency : "Select Currency"}
                </Text>
              </View>
            </TouchableOpacity>

            {!showSignatureCanvas && (
              <>
                <View style={{ marginTop: 16, marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#FAFAFA",
                    }}
                  >
                    Business Logo
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#A1A1AA", marginTop: 4 }}
                  >
                    Add your company logo to display on invoices.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.logoUploadBtn}
                  onPress={handleLogoUpload}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator color="#4F46E5" size="small" />
                  ) : companyLogo ? (
                    <Image
                      source={{ uri: companyLogo }}
                      style={{ width: 100, height: 100, resizeMode: "contain" }}
                    />
                  ) : (
                    <>
                      <ImageIcon
                        color="#4F46E5"
                        size={24}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.logoUploadText}>
                        Upload Business Logo (Optional)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ marginTop: 24, marginBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#FAFAFA",
                    }}
                  >
                    Signature
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#A1A1AA", marginTop: 4 }}
                  >
                    Upload or draw your signature for sign-offs.
                  </Text>
                </View>
              </>
            )}

            {!showSignatureCanvas ? (
              signatureUrl ? (
                <View style={{ marginTop: 0 }}>
                  <TouchableOpacity
                    style={[
                      styles.logoUploadBtn,
                      {
                        height: 120,
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E4E4E7",
                      },
                    ]}
                    onPress={() => setShowSignatureCanvas(true)}
                    disabled={uploadingSignature}
                  >
                    {uploadingSignature ? (
                      <ActivityIndicator color="#4F46E5" size="small" />
                    ) : (
                      <Image
                        source={{ uri: signatureUrl }}
                        style={{
                          width: "100%",
                          height: 100,
                          resizeMode: "contain",
                        }}
                      />
                    )}
                  </TouchableOpacity>
                  <View
                    style={{ flexDirection: "row", gap: 12, marginTop: 12 }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.logoUploadBtn,
                        { flex: 1, marginTop: 0, paddingVertical: 12 },
                      ]}
                      onPress={handleSignatureUpload}
                      disabled={uploadingSignature}
                    >
                      <ImageIcon
                        color="#4F46E5"
                        size={16}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.logoUploadText, { fontSize: 12 }]}>
                        Upload New
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.logoUploadBtn,
                        { flex: 1, marginTop: 0, paddingVertical: 12 },
                      ]}
                      onPress={() => setShowSignatureCanvas(true)}
                      disabled={uploadingSignature}
                    >
                      <PenTool
                        color="#4F46E5"
                        size={16}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.logoUploadText, { fontSize: 12 }]}>
                        Draw New
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 12, marginTop: 0 }}>
                  <TouchableOpacity
                    style={[styles.logoUploadBtn, { flex: 1, marginTop: 0 }]}
                    onPress={handleSignatureUpload}
                    disabled={uploadingSignature}
                  >
                    {uploadingSignature && !showSignatureCanvas ? (
                      <ActivityIndicator color="#4F46E5" size="small" />
                    ) : (
                      <>
                        <ImageIcon
                          color="#4F46E5"
                          size={20}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.logoUploadText, { fontSize: 12 }]}>
                          Upload Signature
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.logoUploadBtn, { flex: 1, marginTop: 0 }]}
                    onPress={() => setShowSignatureCanvas(true)}
                    disabled={uploadingSignature}
                  >
                    <PenTool
                      color="#4F46E5"
                      size={20}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.logoUploadText, { fontSize: 12 }]}>
                      Draw Signature
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <Animated.View
                entering={FadeInDown.duration(400)}
                style={{ marginTop: 16 }}
              >
                <View
                  style={{
                    height: 260,
                    backgroundColor: "#18181B",
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#27272A",
                  }}
                >
                  <View
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#27272A",
                      backgroundColor: "#18181B",
                    }}
                  >
                    <Text
                      style={{
                        color: "#A1A1AA",
                        fontSize: 13,
                        fontWeight: "500",
                        textAlign: "center",
                      }}
                    >
                      Draw your signature below
                    </Text>
                  </View>
                  <SignatureScreen
                    ref={signatureRef}
                    onOK={handleSignatureOK}
                    onEmpty={() => alert("Please sign before saving")}
                    onBegin={() => setScrollEnabled(false)}
                    onEnd={() => setScrollEnabled(true)}
                    descriptionText=""
                    clearText="Clear"
                    confirmText="Save Signature"
                    webStyle={`
                      .m-signature-pad { box-shadow: none; border: none; margin: 0; padding: 0; background-color: #FAFAFA; }
                      .m-signature-pad--body { border: none; }
                      .m-signature-pad--footer { display: none; }
                    `}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      padding: 12,
                      backgroundColor: "#18181B",
                      borderTopWidth: 1,
                      borderTopColor: "#27272A",
                      justifyContent: "flex-end",
                      gap: 12,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setShowSignatureCanvas(false);
                        setScrollEnabled(true);
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: "#3F3F46",
                      }}
                    >
                      <Text style={{ color: "#A1A1AA", fontWeight: "600" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => signatureRef.current?.clearSignature()}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: "#27272A",
                        borderWidth: 1,
                        borderColor: "#3F3F46",
                      }}
                    >
                      <Text style={{ color: "#FAFAFA", fontWeight: "600" }}>
                        Clear
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => signatureRef.current?.readSignature()}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: "#4F46E5",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (loading || !hasChanges) && {
                opacity: 0.7,
                backgroundColor: !hasChanges ? "#3F3F46" : "#4F46E5",
              },
            ]}
            onPress={handleSave}
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.saveBtnText,
                  !hasChanges && { color: "#A1A1AA" },
                ]}
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback
              onPress={() => setShowCurrencyModal(false)}
            >
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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Currency</Text>
                  <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                    <X color="#A1A1AA" size={24} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.searchInputGroup}>
                <Search color="#A1A1AA" size={20} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search currency (e.g. USD, Euro)"
                  placeholderTextColor="#A1A1AA"
                  value={currencySearchQuery}
                  onChangeText={(text) => {
                    setCurrencySearchQuery(text);
                    setCurrencySearchResults(searchCurrency(text));
                  }}
                  autoFocus
                />
              </View>

              <ScrollView style={styles.currencyList}>
                {currencySearchResults.length > 0 ? (
                  currencySearchResults.map((curr) => (
                    <TouchableOpacity
                      key={curr.code}
                      style={styles.currencyItem}
                      onPress={() => {
                        setCurrency(curr.code);
                        setShowCurrencyModal(false);
                      }}
                    >
                      <View>
                        <Text style={styles.currencyCode}>{curr.code}</Text>
                        <Text style={styles.currencyName}>{curr.name}</Text>
                      </View>
                      <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                    </TouchableOpacity>
                  ))
                ) : currencySearchQuery.trim() === "" ? (
                  <Text style={styles.emptySearchText}>
                    Type to search currencies...
                  </Text>
                ) : (
                  <Text style={styles.emptySearchText}>
                    No currencies found
                  </Text>
                )}
              </ScrollView>
            </RNAnimated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FAFAFA",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#A1A1AA",
    lineHeight: 24,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FAFAFA",
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#A1A1AA",
    marginBottom: 16,
    marginTop: -8,
  },
  colorPalette: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchSelected: {
    borderColor: "#fff",
    transform: [{ scale: 1.1 }],
  },
  templateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  templateCard: {
    width: "48%",
    backgroundColor: "#18181B",
    borderWidth: 2,
    borderColor: "#27272A",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    position: "relative",
  },
  templatePreviewBox: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#27272A",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  previewHeaderModern: {
    height: 16,
    width: "100%",
  },
  previewContent: {
    padding: 8,
    flex: 1,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewBlock: {
    height: 8,
    width: 20,
    backgroundColor: "#e4e4e7",
    borderRadius: 1,
  },
  previewLine: {
    height: 2,
    width: "100%",
    backgroundColor: "#f4f4f5",
    marginTop: 4,
    borderRadius: 1,
  },
  templateName: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "500",
  },
  checkBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#09090B",
  },
  premiumBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  premiumText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272A",
    marginBottom: 12,
    height: 56,
  },
  inputIcon: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: "100%",
  },
  logoUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  logoUploadText: {
    color: "#818CF8",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 10 : 24,
    borderTopWidth: 1,
    borderTopColor: "#27272A",
    backgroundColor: "#09090B",
  },
  saveBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelButtonText: {
    color: "#A1A1AA",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#18181B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    padding: 24,
    paddingTop: 12,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingBottom: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#3F3F46",
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  searchInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27272A",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
  },
  currencyList: {
    flex: 1,
  },
  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
  },
  currencyCode: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  currencyName: {
    color: "#A1A1AA",
    fontSize: 14,
    marginTop: 2,
  },
  currencySymbol: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  emptySearchText: {
    color: "#A1A1AA",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
