import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

// Fallback config if JSON is missing attributes
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication instance
export const auth = getAuth(app);

// Google Auth Provider configured for personal journal access
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Firestore database instance (targeting user's provisioned database)
const customDbId = (firebaseConfigJson as any).firestoreDatabaseId;
export const db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // If popup is blocked by iframe environment, try redirect or throw friendly message
    console.warn("Popup sign-in encounter:", error?.code, error?.message);
    throw error;
  }
}

/**
 * Quick Switch to a Demo / Testing Account (User A or User B)
 * for testing cross-user Firestore security isolation
 */
export async function signInDemoAccount(demoName: "User A (Soniya)" | "User B (Alex)") {
  // Sign in anonymously and update display name for testing isolation
  const cred = await signInAnonymously(auth);
  if (cred.user) {
    await updateProfile(cred.user, {
      displayName: demoName,
      photoURL: demoName.includes("Soniya")
        ? "https://api.dicebear.com/7.x/bottts/svg?seed=Soniya"
        : "https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
    });
  }
  return cred.user;
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  await signOut(auth);
}

/**
 * Helper to fetch fresh ID token for backend authorization
 */
export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error("Failed to get Firebase ID token:", err);
    return null;
  }
}
