export default {
  expo: {
    name: "WhisperLang",
    slug: "whisperlang",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    permissions: [
      "CONTACTS"
    ],
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#3754AB"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gorai.whisperlang",
      googleServicesFile: "./ios/whisperlang/GoogleService-Info.plist",
      infoPlist: {
        NSContactsUsageDescription: "WhisperLang needs access to your contacts to help you connect with friends and family for video calls.",
        NSCameraUsageDescription: "WhisperLang needs access to your camera for video calls.",
        NSMicrophoneUsageDescription: "WhisperLang needs access to your microphone for voice and video calls."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#3754AB"
      },
      package: "com.gorai.whisperlang",
      googleServicesFile: "./android/app/google-services.json",
      permissions: [
        "android.permission.READ_CONTACTS",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "#"
      }
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "WhisperLang needs access to your contacts to help you connect with friends and family for video calls."
        }
      ],
      "@react-native-firebase/app"
    ]
  }
};