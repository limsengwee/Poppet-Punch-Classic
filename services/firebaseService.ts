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

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    users[userCredential.user.uid] = { name: username, credits: 100 };
    localStorage.setItem('users', JSON.stringify(users));

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

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const isNewUser = !users[user.uid];

    if (user.email === 'sengwee.lim@gmail.com') {
        // Special demo account: always set credits to 1000
        users[user.uid] = { ...users[user.uid], name: user.displayName, credits: 1000, isGoogleUser: true };
        if (isNewUser) {
            logSignUp('google.com');
        }
    } else if (isNewUser) {
        // New regular user: grant 100 credits
        users[user.uid] = { name: user.displayName, credits: 100, isGoogleUser: true };
        logSignUp('google.com');
    }
    // For existing regular users, their data is already in `users` and doesn't need to be changed.
    
    localStorage.setItem('users', JSON.stringify(users));
    
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