import React, { useState, useRef } from "react";
import {
  Sparkles,
  Shield,
  Lock,
  ArrowRight,
  Heart,
  AlertCircle,
  Loader2,
  BookOpen,
  MessageCircle,
  Globe,
  BarChart3,
  Sun,
  X,
  CheckCircle2,
  HelpCircle,
  Info,
  Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInAsDemo, loading, error, clearError } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeModal, setActiveModal] = useState<"features" | "how-it-works" | "our-story" | "faq" | null>(null);
  const authCardRef = useRef<HTMLDivElement>(null);

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

  const scrollToAuth = () => {
    if (authCardRef.current) {
      authCardRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FAF7F9] text-slate-800 font-sans selection:bg-pink-200 selection:text-pink-900 overflow-x-hidden flex flex-col">

      {/* Radiant Glowing Background Lighting */}
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-pink-200/40 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-purple-200/35 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed top-[30%] left-[40%] w-[500px] h-[500px] bg-rose-100/30 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-400 p-0.5 shadow-md shadow-pink-300/40 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
              <span className="text-xl">🌸</span>
            </div>
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-wider text-purple-950 uppercase leading-none">
              SOULSELF
            </h1>
            <p className="text-[9px] font-bold tracking-[0.2em] text-pink-600 uppercase mt-0.5">
              MINDFUL SANCTUARY
            </p>
          </div>
        </div>

        {/* Navigation Bar Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-pink-100 shadow-sm shadow-pink-100/50 text-xs font-semibold text-purple-900/80">
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-1.5 rounded-full bg-pink-100/80 text-pink-700 font-bold transition-all"
          >
            Home
          </button>
          <button
            onClick={() => setActiveModal("features")}
            className="px-4 py-1.5 rounded-full hover:bg-pink-50 text-purple-900/70 hover:text-purple-950 transition-all"
          >
            Features
          </button>
          <button
            onClick={() => setActiveModal("how-it-works")}
            className="px-4 py-1.5 rounded-full hover:bg-pink-50 text-purple-900/70 hover:text-purple-950 transition-all"
          >
            How It Works
          </button>
          <button
            onClick={() => setActiveModal("our-story")}
            className="px-4 py-1.5 rounded-full hover:bg-pink-50 text-purple-900/70 hover:text-purple-950 transition-all"
          >
            Our Story
          </button>
          <button
            onClick={() => setActiveModal("faq")}
            className="px-4 py-1.5 rounded-full hover:bg-pink-50 text-purple-900/70 hover:text-purple-950 transition-all"
          >
            FAQ
          </button>
        </nav>

        {/* Top Right Tagline */}
        <div className="flex items-center gap-2 text-xs font-serif italic text-purple-900/70">
          <Sun className="w-4 h-4 text-amber-400 animate-spin-slow shrink-0" />
          <span className="hidden sm:inline">A kinder you, a brighter tomorrow.</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Hero Information & Features */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 text-left">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100/80 border border-pink-200/80 text-pink-700 text-xs font-semibold w-fit shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
              <span>Your Personal Mindful Sanctuary</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-purple-950 leading-[1.15]">
              Reflect. Heal. <br />
              Grow.{" "}
              <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                Be You.
              </span>
            </h1>

            {/* Subtitle Paragraph */}
            <p className="text-sm sm:text-base text-purple-900/75 leading-relaxed max-w-xl">
              SoulSelf is a private, AI-powered journaling and wellness companion that helps you understand yourself deeper, turn moments into meaning, and build a more mindful, fulfilling life.
            </p>

            {/* Bullet Highlights Row */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-pink-100/80 max-w-lg">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>Journal</span>
                </div>
                <p className="text-[11px] text-purple-900/60 mt-0.5">Your story</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>Reflect</span>
                </div>
                <p className="text-[11px] text-purple-900/60 mt-0.5">With AI companionship</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>Grow</span>
                </div>
                <p className="text-[11px] text-purple-900/60 mt-0.5">Into your brighter self</p>
              </div>
            </div>

            {/* CTA Button & Trust Badges */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || isProcessing}
                className="py-3.5 px-8 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-3 group"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="text-[11px] text-purple-900/50 font-medium">
                Free to get started • Private & secure • Powered by Gemini
              </div>
            </div>

            {/* App Laptop & Smartphone Visual Mockup Display */}
            <div className="relative pt-6 pb-2 w-full max-w-xl">
              {/* Playful Handwritten Annotations */}
              <div className="absolute top-0 right-10 z-20 hidden sm:block text-right">
                <span className="font-serif italic text-xs text-pink-600/90 tracking-wide font-semibold block">
                  Your world <br /> Your memories
                </span>
                <svg className="w-8 h-8 text-pink-400 ml-auto transform -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 4v16m0 0l-4-4m4 4l4-4" />
                </svg>
              </div>

              {/* Central Laptop Container */}
              <div className="relative mx-auto bg-slate-900 rounded-t-2xl p-2 sm:p-3 shadow-2xl border border-slate-700">
                {/* Laptop Screen Content */}
                <div className="bg-[#FAF7F9] rounded-xl overflow-hidden p-3 sm:p-4 text-xs font-sans border border-pink-100 shadow-inner">
                  {/* Top Mini Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-pink-100/80 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🌸</span>
                      <span className="font-bold text-[10px] text-purple-950 uppercase tracking-wider">SOULSELF</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-purple-900/60">
                      <span className="font-semibold text-pink-600">Journal</span>
                      <span>Memory</span>
                      <span>⚙️</span>
                    </div>
                  </div>

                  {/* Greeting */}
                  <div className="mb-3">
                    <h4 className="font-serif text-sm font-bold text-purple-950">Good Morning, Soniya ✨</h4>
                    <p className="text-[10px] text-purple-900/50">A new day, a kinder you.</p>
                  </div>

                  {/* Mini AYRA Card */}
                  <div className="p-3 rounded-2xl bg-white/90 border border-pink-200/80 shadow-xs mb-3 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 text-xs">
                      💜
                    </div>
                    <div className="text-[10px] text-purple-900/80 leading-relaxed">
                      <p className="font-bold text-purple-950">Hi, I'm AYRA 💜</p>
                      <p className="text-purple-900/60">You can talk to me about your day, your thoughts, or whatever is on your mind.</p>
                    </div>
                  </div>

                  {/* Action Shortcuts */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-pink-50/80 border border-pink-100 text-[9px] font-semibold text-purple-950 flex flex-col items-center gap-1">
                      <span>📖</span>
                      <span>New Journal</span>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-100 text-[9px] font-semibold text-purple-950 flex flex-col items-center gap-1">
                      <span>🌐</span>
                      <span>Memory Globe</span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-100 text-[9px] font-semibold text-purple-950 flex flex-col items-center gap-1">
                      <span>💗</span>
                      <span>Trackers</span>
                    </div>
                  </div>
                </div>

                {/* Laptop Base */}
                <div className="h-2 w-full bg-slate-800 rounded-b-lg mt-1" />
              </div>

              {/* Smartphone Overlay Container */}
              <div className="absolute -bottom-2 -right-4 sm:-right-8 w-44 sm:w-52 bg-slate-950 rounded-[32px] p-2 shadow-2xl border-2 border-slate-700 z-10 transform rotate-2">
                <div className="bg-[#FAF7F9] rounded-[24px] overflow-hidden p-2.5 text-[9px] border border-pink-100">
                  <div className="flex items-center justify-between pb-1 mb-2">
                    <span className="font-bold text-purple-950">Memory Globe</span>
                    <span className="text-[10px]">📍</span>
                  </div>
                  {/* Globe Mockup */}
                  <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-blue-400 via-teal-400 to-indigo-500 flex items-center justify-center relative shadow-inner overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-xs rounded-2xl" />
                    <div className="w-16 h-16 rounded-full bg-blue-500/40 border border-white/40 flex items-center justify-center shadow-lg">
                      <Globe className="w-10 h-10 text-white/90 animate-pulse" />
                    </div>
                    <div className="absolute top-3 left-6 px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-bold text-[8px] flex items-center gap-0.5 shadow-md">
                      📍 Paris
                    </div>
                    <div className="absolute bottom-3 right-6 px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-bold text-[8px] flex items-center gap-0.5 shadow-md">
                      📍 Tokyo
                    </div>
                  </div>
                  <div className="mt-2 p-1.5 rounded-xl bg-white border border-pink-100 text-[8px] text-purple-900/70">
                    "A beautiful reminder that growth lives at the edges of comfort."
                  </div>
                </div>
              </div>

              {/* Bottom Annotation Arrow */}
              <div className="absolute -bottom-6 left-12 hidden sm:flex items-center gap-2 text-pink-600 font-serif italic text-xs">
                <span>Turn moments into a meaningful journey</span>
                <span className="text-sm">↗</span>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Auth Card (Google & Test Login) */}
          <div ref={authCardRef} className="lg:col-span-5 flex justify-center w-full">
            <div
              id="auth-card-container"
              className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[40px] p-8 sm:p-10 border border-pink-200/80 shadow-2xl shadow-pink-200/50 text-center relative z-10 animate-fade-in"
            >
              {/* Blossom Emblem Badge */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-3xl bg-gradient-to-tr from-pink-400 via-pink-500 to-purple-500 p-0.5 shadow-lg shadow-pink-300/50 flex items-center justify-center">
                <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center">
                  <span className="text-3xl animate-pulse">🌸</span>
                </div>
              </div>

              {/* Brand Title */}
              <h2
                id="auth-brand-title"
                className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-purple-950 mb-1.5"
              >
                Soul Self
              </h2>

              <p className="font-serif italic text-sm sm:text-base text-purple-900/70 mb-8">
                Your thoughts. Your story. Your journey.
              </p>

              {/* Error Alert if any */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-left flex items-start gap-3 animate-fade-in shadow-xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold text-amber-950 mb-1">Firebase Configuration Notice</p>
                    <p className="mb-2">{error}</p>
                    {error.includes("Anonymous Sign-In") && (
                      <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-[11px] text-amber-900 space-y-1 font-sans">
                        <p className="font-bold text-amber-950">How to enable Test Accounts:</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-amber-850">
                          <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-semibold text-pink-700">Firebase Console</a></li>
                          <li>Select your project &gt; <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
                          <li>Click <strong>Anonymous</strong> provider and toggle <strong>Enable</strong></li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Auth Action: Continue with Google */}
              <div className="space-y-5">
                <button
                  id="auth-continue-google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading || isProcessing}
                  className="w-full py-4 px-6 rounded-full bg-white hover:bg-pink-50/70 border-2 border-pink-200/90 hover:border-pink-300 text-purple-950 font-bold text-sm tracking-wide flex items-center justify-center gap-3.5 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 group"
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

                {/* Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="w-full border-t border-pink-100" />
                  <span className="absolute bg-white px-3 text-xs text-purple-900/40 font-serif italic">or</span>
                </div>

                {/* Data Isolation Test Accounts */}
                <div className="pt-2 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900/70 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-pink-500" />
                      Data Isolation Test Accounts
                    </span>
                    <span className="text-[10px] text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full font-semibold border border-pink-100">
                      Section 13 Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-900/60 leading-normal mb-3">
                    Switch between isolated Firebase accounts to verify that User A's private journals and conversations cannot be accessed by User B.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleDemoSignIn("User A (Soniya)")}
                      disabled={loading || isProcessing}
                      className="py-3 px-3 rounded-2xl bg-pink-50/80 hover:bg-pink-100 border border-pink-200 text-xs font-semibold text-purple-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                    >
                      <span>🌸</span>
                      <span>User A (Soniya)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoSignIn("User B (Alex)")}
                      disabled={loading || isProcessing}
                      className="py-3 px-3 rounded-2xl bg-purple-50/80 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                    >
                      <span>🌿</span>
                      <span>User B (Alex)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Security & Privacy Badges */}
              <div className="mt-8 pt-6 border-t border-pink-100 flex items-center justify-center gap-6 text-[11px] text-purple-900/60">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-pink-500" />
                  <span>End-to-end Isolated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-500" />
                  <span>Firestore Rules Protected</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM FEATURE SHOWCASE GRID (5 Cards matching design) */}
        <div className="mt-12 pt-8 border-t border-pink-200/60">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Feature 1: AI Journaling */}
            <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-md border border-pink-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-center group cursor-pointer" onClick={() => setActiveModal("features")}>
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-purple-950 mb-0.5">AI Journaling</h3>
              <p className="text-[11px] text-purple-900/60">Write, reflect, heal</p>
            </div>

            {/* Feature 2: AYRA */}
            <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-md border border-pink-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-center group cursor-pointer" onClick={() => setActiveModal("features")}>
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-purple-950 mb-0.5">AYRA</h3>
              <p className="text-[11px] text-purple-900/60">Your AI companion</p>
            </div>

            {/* Feature 3: Memory Globe */}
            <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-md border border-pink-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-center group cursor-pointer" onClick={() => setActiveModal("features")}>
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-purple-950 mb-0.5">Memory Globe</h3>
              <p className="text-[11px] text-purple-900/60">See your journey across the world</p>
            </div>

            {/* Feature 4: Trackers */}
            <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-md border border-pink-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-center group cursor-pointer" onClick={() => setActiveModal("features")}>
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-purple-950 mb-0.5">Trackers</h3>
              <p className="text-[11px] text-purple-900/60">Build mindful habits</p>
            </div>

            {/* Feature 5: Insights */}
            <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-md border border-pink-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-center col-span-2 sm:col-span-1 group cursor-pointer" onClick={() => setActiveModal("features")}>
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-purple-950 mb-0.5">Insights</h3>
              <p className="text-[11px] text-purple-900/60">Understand & grow</p>
            </div>

          </div>
        </div>
      </main>

      {/* Interactive Information Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-pink-200 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 text-purple-900/70 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {activeModal === "features" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>SoulSelf Feature Highlights</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-950">Designed for your Mindful Wellbeing</h3>
                <div className="space-y-3 pt-2 text-xs leading-relaxed text-purple-900/80">
                  <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100">
                    <strong className="text-purple-950 block text-xs mb-0.5">💜 AYRA Conversational AI Companion</strong>
                    A gentle, non-judgmental AI space to talk about your day, clarify feelings, and receive empathetic support.
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                    <strong className="text-purple-950 block text-xs mb-0.5">🌐 Memory Globe</strong>
                    Map your memories across the globe with interactive 3D location tags and location-aware reflection prompts.
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                    <strong className="text-purple-950 block text-xs mb-0.5">✨ Reflection Corner</strong>
                    Weekly, monthly, and annual reflection toolkits powered by Gemini to distill trends and growth.
                  </div>
                </div>
              </div>
            )}

            {activeModal === "how-it-works" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
                  <Compass className="w-4 h-4" />
                  <span>How SoulSelf Works</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-950">Three Simple Steps to Reflection</h3>
                <ol className="space-y-3 pt-2 text-xs text-purple-900/80">
                  <li className="flex items-start gap-3 p-3 rounded-2xl bg-pink-50/60 border border-pink-100">
                    <span className="w-6 h-6 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                    <div>
                      <strong className="text-purple-950 block mb-0.5">Express & Capture</strong>
                      Write daily thoughts, capture voice snippets, or chat directly with AYRA whenever inspiration strikes.
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                    <div>
                      <strong className="text-purple-950 block mb-0.5">Reflect & Synthesize</strong>
                      Gemini processes your entries privately to generate emotional trends, gratitude summaries, and mindful prompts.
                    </div>
                  </li>
                  <li className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                    <div>
                      <strong className="text-purple-950 block mb-0.5">Grow & Celebrate</strong>
                      Track your habits, see your memory globe come alive, and cultivate a kinder relationship with yourself.
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {activeModal === "our-story" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
                  <Info className="w-4 h-4" />
                  <span>Our Mission & Story</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-950">A Sanctuary Built for Privacy & Healing</h3>
                <p className="text-xs text-purple-900/80 leading-relaxed">
                  SoulSelf was created out of a simple belief: everyone deserves a safe, private space to process thoughts without fear of judgment, data selling, or intrusive ads.
                </p>
                <p className="text-xs text-purple-900/80 leading-relaxed">
                  Every feature—from Firebase UID data isolation to client-side data sanitization—is engineered to give you absolute peace of mind while you embark on your self-growth journey.
                </p>
              </div>
            )}

            {activeModal === "faq" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span>Frequently Asked Questions</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-950">Common Questions</h3>
                <div className="space-y-3 text-xs text-purple-900/80">
                  <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100">
                    <strong className="text-purple-950 block mb-0.5">Is my journal data private?</strong>
                    Yes! Your data is protected by Firebase Security Rules scoped strictly to your authenticated UID.
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                    <strong className="text-purple-950 block mb-0.5">Is AYRA a replacement for therapy?</strong>
                    No. AYRA is a supportive AI companion for daily reflection and journaling, not a licensed medical professional.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              className="mt-6 w-full py-3 rounded-full bg-pink-500 text-white font-bold text-xs shadow-md hover:bg-pink-600 transition-colors"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
