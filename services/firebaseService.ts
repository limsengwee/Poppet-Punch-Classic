import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, logEvent, Analytics, setUserId } from "firebase/analytics";
import { 
  getAuth, 
  Auth,
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";
import { firebaseConfig } from "../firebaseConfig";

let app;
let analytics: Analytics | null = null;
export let auth: Auth;

const initializeFirebase = () => {
  const isConfigured = Object.values(firebaseConfig).every(value => value && !value.includes('AIzaSy') || value.length > 30);
  
  if (!isConfigured) {
    console.warn("Firebase is not fully configured. Please update firebaseConfig.ts with your project credentials. Firebase services will be disabled.");
    return;
  }

  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
};

initializeFirebase();

// --- Analytics ---

export const setAnalyticsUser = (userId: string | null) => {
    if (!analytics) return;
    setUserId(analytics, userId || '');
}

export const logLogin = (method: string) => {
  if (!analytics) return;
  try {
    logEvent(analytics, 'login', { method });
  } catch (error) {
    console.error("Failed to log 'login' event:", error);
  }
};

export const logSignUp = (method: string) => {
  if (!analytics) return;
  try {
    logEvent(analytics, 'sign_up', { method });
  } catch (error) {
    console.error("Failed to log 'sign_up' event:", error);
  }
};

export const logToolUse = (toolId: string) => {
  if (!analytics) return;
  try {
    logEvent(analytics, 'tool_use', { tool_id: toolId });
  } catch (error) {
    console.error("Failed to log 'tool_use' event:", error);
  }
};

// --- Authentication ---

export { onAuthStateChanged };

export const signUp = async (email: string, password: string, username: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });

    // User data creation (with initial credits) is now handled by the onAuthStateChanged
    // listener in App.tsx to centralize logic and avoid race conditions.

    logSignUp('password');
    return userCredential.user;
};

export const signIn = async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

export const googleSignIn = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // The user's credit and profile data management is now handled centrally
    // by the onAuthStateChanged listener in App.tsx to prevent race conditions.
    // We only check for new user status here for analytics logging.
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (!users[user.uid]) {
        logSignUp('google.com');
    }
    
    return user;
};

export const logout = async (): Promise<void> => {
    await firebaseSignOut(auth);
};

export const getFirebaseAuthErrorMessage = (errorCode: string, t: (key: string) => string): string => {
    switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
             return t('auth.error_not_found');
        case 'auth/wrong-password':
            return t('auth.error_wrong_password');
        case 'auth/email-already-in-use':
            return t('auth.error_user_exists');
        case 'auth/weak-password':
            return t('auth.error_short_password');
        case 'auth/invalid-email':
            return t('auth.error_invalid_email');
        default:
            console.error("Firebase Auth Error:", errorCode);
            return t('auth.error_generic');
    }
};