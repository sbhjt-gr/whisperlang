import 'dotenv/config';

export default {
  expo: {
    name: "WhisperLang",
    slug: "whisperlang",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gorai.whisperlang"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.gorai.whisperlang",
      googleServicesFile: "./google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Firebase Configuration
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      
      // Android specific
      FIREBASE_ANDROID_API_KEY: process.env.FIREBASE_ANDROID_API_KEY,
      FIREBASE_ANDROID_APP_ID: process.env.FIREBASE_ANDROID_APP_ID,
      
      // iOS specific
      FIREBASE_IOS_API_KEY: process.env.FIREBASE_IOS_API_KEY,
      FIREBASE_IOS_APP_ID: process.env.FIREBASE_IOS_APP_ID,
      FIREBASE_IOS_CLIENT_ID: process.env.FIREBASE_IOS_CLIENT_ID,
      FIREBASE_IOS_REVERSED_CLIENT_ID: process.env.FIREBASE_IOS_REVERSED_CLIENT_ID,
      FIREBASE_IOS_BUNDLE_ID: process.env.FIREBASE_IOS_BUNDLE_ID,
      
      // Google Sign-In (Optional)
      GOOGLE_SIGN_IN_WEB_CLIENT_ID: process.env.GOOGLE_SIGN_IN_WEB_CLIENT_ID,
      
      eas: {
        projectId: "your-eas-project-id"
      }
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ]
    ]
  }
};