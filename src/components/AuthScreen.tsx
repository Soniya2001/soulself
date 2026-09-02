import React, { useState } from "react";
import { Sparkles, Shield, Lock, ArrowRight, Heart, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PetalsCanvas } from "./PetalsCanvas";

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInAsDemo, loading, error, clearError } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"google" | "test">("google");

  const handleGoogleSignIn = async () => {
    try {
      setIsProcessing(true);
      clearError();
      await signInWithGoogle();
    } catch (err) {
      console.warn("Google sign-in completed or cancelled.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoSignIn = async (demo: "User A (Soniya)" | "User B (Alex)") => {
    try {
      setIsProcessing(true);
      clearError();
      await signInAsDemo(demo);
    } catch (err) {
      console.error("Demo sign-in error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#FAF7F9] px-4 py-8">
      {/* Gentle Floating Sakura Petals Canvas */}
      <PetalsCanvas />

      {/* Atmospheric Soft Radiant Blurs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div
        id="auth-card-container"
        className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[40px] p-8 sm:p-10 border border-pink-200/70 shadow-2xl shadow-pink-200/40 text-center animate-fade-in"
      >
        {/* Blossom Emblem Badge */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-pink-400 via-pink-500 to-purple-500 p-0.5 shadow-lg shadow-pink-300/50 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center">
            <span className="text-3xl animate-pulse">🌸</span>
          </div>
        </div>

        {/* Brand Display (Strictly matches requirement) */}
        <h1
          id="auth-brand-title"
          className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-purple-950 mb-2"
        >
          Soul Self
        </h1>

        <p className="font-serif italic text-base sm:text-lg text-purple-900/70 mb-8">
          Your thoughts. Your story. Your journey.
        </p>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-left flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">
              <p className="font-bold mb-0.5">Authentication Note</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Primary Auth Action: Continue with Google */}
        <div className="space-y-4">
          <button
            id="auth-continue-google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading || isProcessing}
            className="w-full py-4 px-6 rounded-full bg-white hover:bg-pink-50/70 border-2 border-pink-200 hover:border-pink-300 text-purple-950 font-bold text-sm tracking-wide flex items-center justify-center gap-3.5 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 group"
          >
            {isProcessing || loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-pink-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="font-semibold">Continue with Google</span>
          </button>

          {/* Cross-User Data Isolation Verification Test accounts */}
          <div className="pt-4 border-t border-pink-100/90 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900/70 flex items-center gap-1">
                <Shield className="w-3 h-3 text-pink-500" />
                Data Isolation Test Accounts
              </span>
              <span className="text-[10px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full font-semibold">
                Section 13 Ready
              </span>
            </div>
            <p className="text-[11px] text-purple-900/60 leading-normal mb-3">
              Switch between isolated Firebase accounts to verify that User A's private journals and
              conversations cannot be accessed by User B.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoSignIn("User A (Soniya)")}
                disabled={loading || isProcessing}
                className="py-2.5 px-3 rounded-2xl bg-pink-50/80 hover:bg-pink-100 border border-pink-200 text-xs font-semibold text-purple-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>🌸</span>
                <span>User A (Soniya)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSignIn("User B (Alex)")}
                disabled={loading || isProcessing}
                className="py-2.5 px-3 rounded-2xl bg-purple-50/80 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>🌿</span>
                <span>User B (Alex)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Privacy Badges */}
        <div className="mt-8 pt-6 border-t border-pink-100 flex items-center justify-center gap-6 text-[11px] text-purple-900/60">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-pink-500" />
            <span>End-to-end Isolated</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-purple-500" />
            <span>Firestore Rules Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
