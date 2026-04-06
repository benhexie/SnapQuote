import { Platform } from 'react-native';

// Helper to handle localhost on Android Emulator vs iOS Simulator vs Physical Device
const getLocalhostUrl = () => {
  if (__DEV__) {
    // In development mode
    if (Platform.OS === 'android') {
      return 'https://ant-striking-presently.ngrok-free.app'; // Android emulator specific loopback IP
    }
    return 'https://ant-striking-presently.ngrok-free.app'; // iOS simulator or web
  }
  
  // Production URL
  return 'https://snapquote.up.railway.app'; 
};

const API_BASE_URL = getLocalhostUrl();

export const CONFIG = {
  api: {
    baseUrl: API_BASE_URL,
    endpoints: {
      generateQuote: `${API_BASE_URL}/api/quotes/generate`,
      editQuote: `${API_BASE_URL}/api/quotes/edit`,
      previewQuote: (id: string) => `${API_BASE_URL}/api/quotes/${id}/preview`,
    }
  },
  app: {
    name: 'SnapQuote AI',
    version: '1.0.0',
  }
};
