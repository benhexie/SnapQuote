import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { Video, ResizeMode } from "expo-av";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { CONFIG } from "../../config";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Zap,
  Type,
  Video as VideoIcon,
  Send,
  Paperclip,
  X,
  Sparkles,
  Check,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export default function CameraCaptureScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();

  const [inputMode, setInputMode] = useState<"video" | "text">("video");
  const [textInput, setTextInput] = useState("");
  const [selectedDoc, setSelectedDoc] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!microphonePermission?.granted) requestMicrophonePermission();
  }, [cameraPermission, microphonePermission]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Stop recording automatically when reaching 0
            if (cameraRef.current) {
              cameraRef.current.stopRecording();
              setIsRecording(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(60);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRecord = async () => {
    if (!cameraRef.current) return;

    if (isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        const videoRecordPromise = cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        const data = await videoRecordPromise;
        if (data?.uri) {
          setRecordedVideoUri(data.uri);
        }
      } catch (e) {
        console.error("Recording error", e);
        setIsRecording(false);
      }
    }
  };

  const processVideo = async (uri: string) => {
    alert(
      "Video is uploading and processing in the background. Check the Invoices tab for updates.",
    );
    router.push("/(tabs)/two");

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `quotes/${user?.uid}/${Date.now()}.mov`);
      const uploadTask = await uploadBytesResumable(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      const token = await user?.getIdToken();
      const API_URL = CONFIG.api.endpoints.generateQuote;

      await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          media_urls: [downloadURL],
          prompt: "Analyze this video to generate an itemized quote.",
        }),
      });
    } catch (e: any) {
      console.error(e);
      alert("Error processing video: " + e.message);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "text/plain",
          "text/csv",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets.length > 0) {
        setSelectedDoc(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document", err);
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim() && !selectedDoc) return;

    alert(
      "Your request is processing in the background. Check the Invoices tab for updates.",
    );
    router.push("/(tabs)/two");

    const currentText = textInput;
    const currentDoc = selectedDoc;

    setTextInput("");
    setSelectedDoc(null);
    Keyboard.dismiss();

    try {
      let documentURL = null;

      // Upload document if selected
      if (currentDoc) {
        const response = await fetch(currentDoc.uri);
        const blob = await response.blob();
        const extension = currentDoc.name.split(".").pop() || "pdf";
        const storageRef = ref(
          storage,
          `quotes/${user?.uid}/${Date.now()}.${extension}`,
        );
        let mimeType = currentDoc.mimeType;
        if (!mimeType) {
          if (extension === "pdf") mimeType = "application/pdf";
          else if (extension === "txt") mimeType = "text/plain";
          else if (extension === "csv") mimeType = "text/csv";
          else if (extension === "docx")
            mimeType =
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          else mimeType = "image/jpeg";
        }
        const metadata = {
          contentType: mimeType,
        };
        const uploadTask = await uploadBytesResumable(
          storageRef,
          blob,
          metadata,
        );
        documentURL = await getDownloadURL(uploadTask.ref);
      }

      const token = await user?.getIdToken();
      const API_URL = CONFIG.api.endpoints.generateQuote;

      const payload: any = {
        prompt:
          currentText || "Analyze the attached document to generate a quote.",
      };
      if (documentURL) {
        payload.media_urls = [documentURL];
        payload.project_name = currentDoc?.name?.split(".")[0] || "New Project";
      }

      await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (e: any) {
      console.error(e);
      alert("Error processing text request: " + e.message);
    }
  };

  const renderProcessing = (title: string) => (
    <View style={[StyleSheet.absoluteFillObject, styles.processingOverlay]}>
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
          <Text style={styles.processingTitle}>{title}</Text>
        </View>
        <Text style={styles.processingSub}>
          Preparing media for processing...
        </Text>
      </Animated.View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerBadge}>
        <Zap color="#4F46E5" size={16} fill="#4F46E5" />
        <Text style={styles.headerText}>SnapQuote AI</Text>
      </View>
    </View>
  );

  const renderVideoMode = () => {
    if (!cameraPermission || !microphonePermission) {
      return (
        <View style={[styles.container, styles.centerAll]}>
          <ActivityIndicator color="#4F46E5" size="large" />
        </View>
      );
    }
    if (!cameraPermission.granted || !microphonePermission.granted) {
      return (
        <View style={[styles.container, styles.centerAll]}>
          <Zap color="#4F46E5" size={48} style={{ marginBottom: 20 }} />
          <Text style={styles.permissionText}>
            We need access to your camera and mic to generate quotes.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              requestCameraPermission();
              requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (recordedVideoUri) {
      return (
        <View style={styles.camera}>
          <Video
            source={{ uri: recordedVideoUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted={false}
          />
          <SafeAreaView style={styles.safeArea} edges={["top"]}>
            {renderHeader()}
            <View style={styles.overlay}>
              {isProcessing ? (
                renderProcessing("Analyzing Video...")
              ) : (
                <View style={styles.reviewControls}>
                  <TouchableOpacity
                    style={styles.reviewButtonCancel}
                    onPress={() => setRecordedVideoUri(null)}
                  >
                    <X color="#fff" size={24} />
                    <Text style={styles.reviewButtonText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reviewButtonSend}
                    onPress={() => {
                      processVideo(recordedVideoUri);
                      setRecordedVideoUri(null);
                    }}
                  >
                    <Check color="#fff" size={24} />
                    <Text style={styles.reviewButtonText}>Use Video</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      );
    }

    return (
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        mode="video"
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          {renderHeader()}
          <View style={styles.overlay}>
            {isProcessing ? (
              renderProcessing("Analyzing Video...")
            ) : (
              <View style={styles.controlsContainer}>
                {isRecording && (
                  <View style={styles.timerBadge}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.timerText}>{formatTime(timer)}</Text>
                  </View>
                )}
                {!isRecording && (
                  <Text style={styles.instructionText}>
                    Record the space to generate a quote
                  </Text>
                )}
                <View style={styles.controls}>
                  <TouchableOpacity
                    style={styles.recordOuter}
                    onPress={handleRecord}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.recordInner,
                        isRecording && styles.recordingInner,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </CameraView>
    );
  };

  const renderTextMode = () => {
    return (
      <SafeAreaView style={styles.textModeContainer} edges={["top"]}>
        {renderHeader()}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.textModeInner}>
              {isProcessing ? (
                renderProcessing("Analyzing Request...")
              ) : (
                <View style={styles.textInputContainer}>
                  <Text style={styles.textModeTitle}>
                    Describe your project
                  </Text>
                  <Text style={styles.textModeSub}>
                    Be as detailed as possible to get an accurate quote.
                  </Text>

                  {selectedDoc && (
                    <View style={styles.documentBadge}>
                      <Paperclip color="#4F46E5" size={16} />
                      <Text
                        style={styles.documentName}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {selectedDoc.name}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedDoc(null)}>
                        <X color="#A1A1AA" size={16} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder="e.g. I need to remodel my 200 sq ft kitchen. New cabinets, quartz countertops, and a tile backsplash..."
                    placeholderTextColor="#52525B"
                    value={textInput}
                    onChangeText={setTextInput}
                  />

                  <View style={styles.textActionRow}>
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={handlePickDocument}
                      disabled={isProcessing}
                    >
                      <Paperclip color="#A1A1AA" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        !textInput.trim() &&
                          !selectedDoc &&
                          styles.sendButtonDisabled,
                      ]}
                      onPress={handleSendText}
                      disabled={
                        (!textInput.trim() && !selectedDoc) || isProcessing
                      }
                    >
                      <Send
                        color={
                          textInput.trim() || selectedDoc ? "#fff" : "#A1A1AA"
                        }
                        size={20}
                      />
                      <Text
                        style={[
                          styles.sendButtonText,
                          !textInput.trim() &&
                            !selectedDoc &&
                            styles.sendButtonTextDisabled,
                        ]}
                      >
                        Generate Quote
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  return (
    <View style={styles.container}>
      {inputMode === "video" ? renderVideoMode() : renderTextMode()}

      {/* Input Mode Selector */}
      {!isRecording && !recordedVideoUri && (
        <View style={styles.modeSelectorWrapper}>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                inputMode === "video" && styles.modeButtonActive,
              ]}
              onPress={() => setInputMode("video")}
            >
              <VideoIcon
                color={inputMode === "video" ? "#fff" : "#A1A1AA"}
                size={18}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  inputMode === "video" && styles.modeButtonTextActive,
                ]}
              >
                Video
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                inputMode === "text" && styles.modeButtonActive,
              ]}
              onPress={() => setInputMode("text")}
            >
              <Type
                color={inputMode === "text" ? "#fff" : "#A1A1AA"}
                size={18}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  inputMode === "text" && styles.modeButtonTextActive,
                ]}
              >
                Text
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centerAll: { justifyContent: "center", alignItems: "center", padding: 20 },
  camera: { flex: 1 },
  safeArea: { flex: 1, justifyContent: "space-between" },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 0,
    alignItems: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  headerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  overlay: {
    justifyContent: "flex-end",
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  controlsContainer: {
    alignItems: "center",
  },
  controls: {
    alignItems: "center",
    marginTop: 20,
  },
  recordOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  recordInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ef4444",
  },
  recordingInner: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  timerText: {
    color: "#fff",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  instructionText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 10,
    textAlign: "center",
  },
  processingOverlay: {
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
    marginTop: 0,
    fontSize: 18,
    fontWeight: "700",
  },
  processingSub: {
    color: "#A1A1AA",
    marginTop: 8,
    fontSize: 14,
  },
  permissionText: {
    color: "#A1A1AA",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modeSelectorWrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 110 : 90,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 26,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: "#4F46E5",
  },
  modeButtonText: {
    color: "#A1A1AA",
    fontWeight: "600",
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  textModeContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  textModeInner: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  textInputContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 80 : 60,
  },
  textModeTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  textModeSub: {
    color: "#A1A1AA",
    fontSize: 14,
    marginBottom: 20,
  },
  documentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    gap: 8,
  },
  documentName: {
    color: "#E0E7FF",
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    height: 150,
    borderWidth: 1,
    borderColor: "#27272A",
    textAlignVertical: "top",
    marginBottom: 20,
  },
  textActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  attachButton: {
    backgroundColor: "#27272A",
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#27272A",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  sendButtonTextDisabled: {
    color: "#52525B",
  },
  reviewControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingBottom: 20,
  },
  reviewButtonCancel: {
    backgroundColor: "rgba(239, 68, 68, 0.9)", // red-500
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  reviewButtonSend: {
    backgroundColor: "#4F46E5", // indigo-600
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  reviewButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
