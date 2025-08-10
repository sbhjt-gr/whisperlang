# WhisperLang

WhisperLang is a modern video calling application built with Expo and React Native that provides seamless communication through high-quality video and audio calls. The app features a complete user authentication system powered by Firebase and uses WebRTC technology for peer-to-peer video calling, ensuring reliable and secure connections between users.

<img src="https://github.com/user-attachments/assets/481f65d8-6f17-42d3-bd79-ea7a2b739f92" alt="Image 1" width="100"/>
<img src="https://github.com/user-attachments/assets/c7ec7532-04c4-4b8e-b483-5c1793cb4f40" alt="Image 2" width="100"/>
<img src="https://github.com/user-attachments/assets/96e5d4b2-957d-45f4-bb10-3d44a24920f3" alt="Image 3" width="100"/>
<img src="https://github.com/user-attachments/assets/240e809d-e907-46ab-9399-d627e8877f4e" alt="Image 4" width="100"/>
<img src="https://github.com/user-attachments/assets/6cec5f53-8381-47d2-88ae-66d0539d3cf1" alt="Image 5" width="100"/>
<img src="https://github.com/user-attachments/assets/8cec13a1-789a-4236-829c-330293c349a4" alt="Image 6" width="100"/>

## What WhisperLang Offers

WhisperLang provides a comprehensive video calling experience with user registration and authentication handled securely through Firebase. The application supports real-time video and audio communication using WebRTC technology, which enables direct peer-to-peer connections for better call quality and reduced latency.

The app works seamlessly across multiple platforms including iOS, Android, and web browsers, making it accessible to users regardless of their preferred device. The user interface is built with React Native Elements, providing a clean and intuitive design that makes starting and managing video calls straightforward and enjoyable.

## Getting Started

Before you can run WhisperLang on your development machine, you will need to have Node.js version 18 or higher installed on your system. You should also install the Expo CLI globally using npm to manage the development workflow. If you plan to test on iOS devices, you will need access to an iOS Simulator, and for Android testing, you will need Android Studio with an emulator set up.

To set up the project, start by cloning the repository to your local machine and navigate to the project directory. Once you have the code locally, run yarn install to download and install all the necessary dependencies. The project uses Yarn as its package manager, so make sure to use Yarn commands throughout the development process.

## Configuration Requirements

WhisperLang requires several configuration steps to work properly in your environment. For Firebase authentication to function, you need to replace the existing configuration files with your own Firebase project credentials. This includes updating the GoogleService-Info.plist file for iOS and the google-services.json file for Android with your specific Firebase project settings.

The WebRTC functionality requires you to set up a signaling server and PeerJS server for establishing connections between users. You will need to update the server configuration in the WebRTCProvider component with your own server URLs. The application uses Socket.IO for real-time communication between clients and the signaling server.

## Development Process

To start developing with WhisperLang, use the yarn start command to launch the Expo development server. This will provide you with options to run the app on different platforms. You can use yarn android to run the app on Android devices or emulators, yarn ios for iOS simulators, or yarn web to run a web version in your browser.

The development server supports hot reloading, so changes you make to the code will be reflected immediately in the running app. This makes the development process faster and more efficient, allowing you to see your changes in real-time without needing to restart the application.

## Production Builds

When you are ready to build WhisperLang for production, the project is configured to use Expo Application Services (EAS) for creating optimized builds. You will need to install the EAS CLI globally and log into your Expo account. The project includes pre-configured build scripts that you can run using yarn build:android for Android APK files and yarn build:ios for iOS builds.

EAS Build handles the complex process of creating production-ready applications, including code signing, optimization, and platform-specific configurations. The build process runs in the cloud, so you do not need to maintain local build environments for each platform.

## Project Organization

The WhisperLang codebase is organized in a logical structure that separates different concerns into distinct directories. The source code lives in the src directory, which contains subdirectories for screens, components, configuration files, and utility functions. Authentication screens are grouped together in the auth directory, while the main application screens like the home screen and video call interface have their own dedicated files.

The WebRTC functionality is encapsulated in its own provider and context system, making it easy to manage the complex state required for video calling features. Configuration files like the Firebase setup and navigation types are kept in separate directories to maintain clean separation of concerns throughout the application.

## Technical Architecture

WhisperLang is built using modern React Native patterns including context providers for state management and hooks for component logic. The WebRTC implementation uses the react-native-webrtc library for accessing device cameras and microphones, while Socket.IO handles the signaling required to establish peer connections.

The application follows security best practices by avoiding hardcoded credentials and implementing proper error handling throughout the calling process. User authentication is handled entirely through Firebase, ensuring that user data is managed securely and in compliance with modern security standards.
