# WhisperLang

A video calling application built with Expo and React Native, featuring Firebase authentication and Zego Cloud video calling capabilities.

<img src="https://github.com/user-attachments/assets/481f65d8-6f17-42d3-bd79-ea7a2b739f92" alt="Image 1" width="100"/>
<img src="https://github.com/user-attachments/assets/c7ec7532-04c4-4b8e-b483-5c1793cb4f40" alt="Image 2" width="100"/>
<img src="https://github.com/user-attachments/assets/96e5d4b2-957d-45f4-bb10-3d44a24920f3" alt="Image 3" width="100"/>
<img src="https://github.com/user-attachments/assets/240e809d-e907-46ab-9399-d627e8877f4e" alt="Image 4" width="100"/>
<img src="https://github.com/user-attachments/assets/6cec5f53-8381-47d2-88ae-66d0539d3cf1" alt="Image 5" width="100"/>
<img src="https://github.com/user-attachments/assets/8cec13a1-789a-4236-829c-330293c349a4" alt="Image 6" width="100"/>

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
