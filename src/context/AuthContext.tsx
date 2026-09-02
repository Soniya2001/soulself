import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle as firebaseSignInWithGoogle, signInDemoAccount, signOutUser, getCurrentIdToken } from "../lib/firebase";
import { AuthContextType } from "../types";
import { saveUserProfileDoc, getUserProfileDoc } from "../services/firestoreService";

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setError(null);

        if (currentUser) {
          try {
            // Check if profile exists, otherwise initialize in Firestore
            const existing = await getUserProfileDoc(currentUser.uid);
            if (!existing) {
              const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "Beloved Friend";
              await saveUserProfileDoc(currentUser.uid, {
                name: displayName,
                greetingTitle: "Beloved Journaler",
                bio: "Writing my thoughts, finding peace in small moments, and growing with SoulSelf.",
                soundEnabled: false,
                themePreference: "soft-pink",
                favoriteStickers: ["🌸", "✨", "🦋", "💜", "☕"],
                email: currentUser.email || undefined,
                photoURL: currentUser.photoURL || undefined,
              });
            }
          } catch (err: any) {
            console.error("Error setting up user profile:", err);
          }
        }

        setLoading(false);
      },
      (err) => {
        console.error("Auth state listener error:", err);
        setError("Failed to verify authentication status. Please try refreshing.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignInWithGoogle();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      let msg = "Unable to sign in with Google. Please try again.";
      if (err.code === "auth/popup-blocked") {
        msg = "The sign-in popup was blocked by your browser. Please allow popups or use demo mode.";
      } else if (err.code === "auth/popup-closed-by-user") {
        msg = "Sign in was cancelled.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = async (demoType: "User A (Soniya)" | "User B (Alex)") => {
    try {
      setLoading(true);
      setError(null);
      await signInDemoAccount(demoType);
    } catch (err: any) {
      console.error("Demo sign in error:", err);
      let msg = err.message || "Failed to sign in demo account.";
      if (
        err.code === "auth/admin-restricted-operation" ||
        err.message?.includes("admin-restricted-operation")
      ) {
        msg =
          "Anonymous Sign-In is disabled in your Firebase Console project. To use Test Accounts (User A / User B), please go to Firebase Console -> Authentication -> Sign-in method and enable 'Anonymous'. Alternatively, sign in using 'Continue with Google'.";
      }
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOutUser();
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error("Logout error:", err);
      setError("Failed to sign out cleanly. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const getIdToken = async () => {
    return await getCurrentIdToken();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signInAsDemo,
        logout,
        getIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
