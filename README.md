# Video Meeting App with React Native

A React Native video conferencing application built with ZegoCloud's SDK.

<img src="https://github.com/user-attachments/assets/481f65d8-6f17-42d3-bd79-ea7a2b739f92" alt="Image 1" width="100"/>
<img src="https://github.com/user-attachments/assets/c7ec7532-04c4-4b8e-b483-5c1793cb4f40" alt="Image 2" width="100"/>
<img src="https://github.com/user-attachments/assets/96e5d4b2-957d-45f4-bb10-3d44a24920f3" alt="Image 3" width="100"/>
<img src="https://github.com/user-attachments/assets/240e809d-e907-46ab-9399-d627e8877f4e" alt="Image 4" width="100"/>
<img src="https://github.com/user-attachments/assets/6cec5f53-8381-47d2-88ae-66d0539d3cf1" alt="Image 5" width="100"/>
<img src="https://github.com/user-attachments/assets/8cec13a1-789a-4236-829c-330293c349a4" alt="Image 6" width="100"/>

## Features

- User authentication (login/registration) via Firebase
- Create new video meetings with randomly generated meeting IDs
- Join existing meetings using meeting IDs
- Real-time video conferencing powered by ZegoCloud SDK
- Responsive UI that works across different screen sizes

## Tech Stack

- React Native
- Firebase Authentication
- ZegoCloud UIKit for video calls
- React Navigation for screen management

## Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions before proceeding.

### Prerequisites

- Node.js
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository:
   ```powershell
   git clone <repository-url>
   cd video-meeting-react-native
   ```

2. Install dependencies:
   ```powershell
   yarn install
   ```

3. Install iOS dependencies (macOS only):
   ```powershell
   cd ios
   pod install
   cd ..
   ```

## Running the App

### Start Metro Server

First, start the Metro server in its own terminal:

```powershell
yarn start
```

### Run on Android

```powershell
yarn android
```

### Run on iOS (macOS only)

```powershell
yarn ios
```

## Usage

1. Register a new account or log in with existing credentials
2. Create a new meeting or join an existing one with a meeting ID
3. Share the meeting ID with participants to invite them to join

## Troubleshooting

If you encounter issues:

- Ensure you have the correct environment setup
- Check Firebase and ZegoCloud credentials in the project
- For Android: Make sure your emulator/device can access the internet
- For iOS: Verify that the necessary permissions are enabled

## Learn More

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [ZegoCloud Documentation](https://docs.zegocloud.com/article/14766)
- [Firebase Documentation](https://firebase.google.com/docs)
