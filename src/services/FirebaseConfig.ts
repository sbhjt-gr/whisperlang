import { getApp } from '@react-native-firebase/app';

let isInitialized = false;

export const initializeFirebase = async (): Promise<void> => {
  try {
    if (__DEV__) {
      console.log('Starting Firebase initialization...');
    }
    
    let app;
    try {
      app = getApp();
      isInitialized = true;
      if (__DEV__) {
        console.log('Firebase app initialized from google-services.json/GoogleService-Info.plist');
        console.log('App name:', app.name);
        console.log('Project ID:', app.options.projectId);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Firebase initialization failed:', error);
        console.error('Make sure google-services.json (Android) and GoogleService-Info.plist (iOS) are properly configured');
      }
      throw new Error('Firebase configuration files missing or invalid');
    }

    if (__DEV__) {
      console.log('Firebase initialization completed successfully');
    }

  } catch (error) {
    if (__DEV__) {
      console.error('Firebase initialization failed:', error);
    }
    isInitialized = false;
    
    if (__DEV__) {
      throw error;
    } else {
      throw new Error('Service initialization failed');
    }
  }
};

export const isFirebaseReady = (): boolean => {
  if (!isInitialized) {
    return false;
  }
  
  try {
    getApp();
    return true;
  } catch (error) {
    isInitialized = false;
    return false;
  }
};

export const waitForAuthReady = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const maxAttempts = 50;
    let attempts = 0;
    
    const checkReady = () => {
      if (isInitialized || attempts >= maxAttempts) {
        resolve(isInitialized);
        return;
      }
      
      attempts++;
      setTimeout(checkReady, 100);
    };
    
    checkReady();
  });
};

export { isInitialized };