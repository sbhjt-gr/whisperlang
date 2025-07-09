# BIT Meeting App

A video calling application built with Expo and React Native, featuring Firebase authentication and Zego Cloud video calling capabilities.

## Features

- User registration and authentication with Firebase
- Video and audio calling using Zego Cloud
- Cross-platform support (iOS, Android, Web)
- Modern UI with React Native Elements

## Prerequisites

- Node.js (>= 18)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd video-meet
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Replace `GoogleService-Info.plist` with your Firebase iOS configuration
   - Replace `google-services.json` with your Firebase Android configuration
   - Update `firebase.js` with your Firebase project configuration

4. Configure Zego Cloud:
   - Update the `appID` and `appSign` in `VideoCallPage.js` with your Zego Cloud credentials

## Development

Start the development server:
```bash
npm start
```

Run on specific platforms:
```bash
npm run android    # Run on Android
npm run ios        # Run on iOS  
npm run web        # Run on Web
```

## Building

For production builds, use Expo Application Services (EAS):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

## Project Structure

```
├── expo/              # Expo configuration
├── assets/            # Images and static assets
├── registration/      # Authentication screens
├── hooks/            # Custom React hooks
├── App.tsx           # Main application component
├── HomeMain.js       # Home screen
├── VideoCallPage.js  # Video calling interface
└── firebase.js       # Firebase configuration
```

## Configuration Files

- `app.json` - Expo app configuration
- `eas.json` - EAS Build configuration
- `babel.config.js` - Babel transpilation settings
- `metro.config.js` - Metro bundler settings

## License

See LICENSE file for details.
