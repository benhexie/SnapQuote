import { initializeApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBx0DxR7OgCViozjlDFBembxZnggrObm0s",
  authDomain: "snapquote-5d09f.firebaseapp.com",
  databaseURL: "https://snapquote-5d09f-default-rtdb.firebaseio.com",
  projectId: "snapquote-5d09f",
  storageBucket: "snapquote-5d09f.firebasestorage.app",
  messagingSenderId: "1063955605795",
  appId: "1:1063955605795:web:5dcf68f93f16d4be578496",
  measurementId: "G-HMT03YLEED",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const storage = getStorage(app);
export const db = getFirestore(app);
