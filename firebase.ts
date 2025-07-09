import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app); 