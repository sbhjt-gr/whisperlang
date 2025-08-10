import { initializeFirebase, getCurrentUser } from '../services/FirebaseService';

let initialized = false;

export const initApp = async () => {
  if (!initialized) {
    await initializeFirebase();
    initialized = true;
  }
};

export const auth = {
  currentUser: getCurrentUser(),
  signOut: async () => {
    const { logoutUser } = await import('../services/FirebaseService');
    return logoutUser();
  }
}; 