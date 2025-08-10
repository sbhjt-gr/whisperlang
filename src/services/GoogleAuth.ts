import { Platform } from 'react-native';
import { 
  signInWithCredential, 
  GoogleAuthProvider
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { getAuthInstance } from './FirebaseInstances';
import { storeAuthState } from './AuthStorage';

const configureGoogleSignIn = async (): Promise<void> => {
  const extra = Constants.expoConfig?.extra;
  
  if (!extra?.GOOGLE_SIGN_IN_WEB_CLIENT_ID) {
    throw new Error('Google Sign-In Web Client ID not configured');
  }
  
  if (__DEV__) {
    console.log('Configuring Google Sign-In with Web Client ID...');
    console.log('Web Client ID (first 20 chars):', extra.GOOGLE_SIGN_IN_WEB_CLIENT_ID.substring(0, 20) + '...');
  }
  
  try {
    await GoogleSignin.configure({
      webClientId: extra.GOOGLE_SIGN_IN_WEB_CLIENT_ID,
    });
    
    if (__DEV__) {
      console.log('Google Sign-In configured successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Google Sign-In configuration failed:', error);
    }
    throw error;
  }
};

const ensureGoogleSignInConfigured = async (): Promise<void> => {
  await configureGoogleSignIn();
  
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    if (__DEV__) {
      console.log('Google Sign-In configuration verified');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Google Sign-In verification failed:', error);
    }
    throw error;
  }
};

export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await ensureGoogleSignInConfigured();

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    const response = await GoogleSignin.signIn();
    
    if (!response.data?.idToken) {
      return { success: false, error: 'Failed to get authentication' };
    }

    const googleCredential = GoogleAuthProvider.credential(response.data.idToken);
    const userCredential = await signInWithCredential(getAuthInstance(), googleCredential);
    const user = userCredential.user;

    await storeAuthState(user);

    return { success: true };

  } catch (error: any) {
    if (__DEV__) {
      console.error('Google Sign-In Error:', error);
    }
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Sign-in was cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in is already in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Play Services not available or outdated' };
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      return { 
        success: false, 
        error: 'An account already exists with this email using a different sign-in method.' 
      };
    } else if (error.code === 'auth/invalid-credential') {
      return { 
        success: false, 
        error: 'Invalid credentials. Please try again.' 
      };
    } else if (error.code === 'auth/operation-not-allowed') {
      return { 
        success: false, 
        error: 'Google sign-in is not enabled. Please contact support.' 
      };
    } else if (error.code === 'auth/user-disabled') {
      return { 
        success: false, 
        error: 'This account has been disabled.' 
      };
    }
    
    return { 
      success: false, 
      error: 'Google sign-in failed. Please try again.' 
    };
  }
};

export const signInWithGoogleLogin = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await ensureGoogleSignInConfigured();

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    const response = await GoogleSignin.signIn();
    
    if (!response.data?.idToken || !response.data?.user?.email) {
      return { success: false, error: 'Failed to get authentication' };
    }

    const googleCredential = GoogleAuthProvider.credential(response.data.idToken);
    const userCredential = await signInWithCredential(getAuthInstance(), googleCredential);
    const user = userCredential.user;

    await storeAuthState(user);

    return { success: true };

  } catch (error: any) {
    if (__DEV__) {
      console.error('Google Sign-In Login Error:', error);
    }
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Sign-in was cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in is already in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Play Services not available or outdated' };
    } else if (error.code === 'auth/user-not-found') {
      return { 
        success: false, 
        error: 'No account found with this email. Please sign up first.' 
      };
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      return { 
        success: false, 
        error: 'An account already exists with this email using a different sign-in method.' 
      };
    } else if (error.code === 'auth/invalid-credential') {
      return { 
        success: false, 
        error: 'Invalid credentials. Please try again.' 
      };
    } else if (error.code === 'auth/operation-not-allowed') {
      return { 
        success: false, 
        error: 'Google sign-in is not enabled. Please contact support.' 
      };
    } else if (error.code === 'auth/user-disabled') {
      return { 
        success: false, 
        error: 'This account has been disabled.' 
      };
    }
    
    return { 
      success: false, 
      error: 'Google sign-in failed. Please try again.' 
    };
  }
};

export const debugGoogleOAuthConfig = () => {
  if (!__DEV__) {
    return {
      webClientId: 'Production mode',
      hasConfig: true,
    };
  }
  
  const extra = Constants.expoConfig?.extra;
  return {
    webClientId: extra?.GOOGLE_SIGN_IN_WEB_CLIENT_ID ? 'Configured' : 'Not configured',
    hasConfig: !!extra?.GOOGLE_SIGN_IN_WEB_CLIENT_ID,
  };
};