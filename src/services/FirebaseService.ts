import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export { 
  initializeFirebase, 
  isFirebaseReady, 
  waitForAuthReady
} from './FirebaseConfig';

export { 
  testFirebaseConnection, 
  getFirebaseServices,
  getAuthInstance,
  getFirestoreInstance 
} from './FirebaseInstances';

export { 
  registerWithEmail, 
  loginWithEmail 
} from './EmailAuth';

export { 
  signInWithGoogle,
  signInWithGoogleLogin,
  debugGoogleOAuthConfig
} from './GoogleAuth';

export { 
  logoutUser,
  getCurrentUser,
  isAuthenticated,
  initAuthState,
  getCompleteUserData
} from './AuthState';

export {
  isEmailFromTrustedProvider
} from './SecurityUtils';

export type { UserData } from './AuthStorage';