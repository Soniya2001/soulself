import React, { useEffect, useState } from "react";
import { PetalsCanvas } from "./PetalsCanvas";
import { Sparkles, ArrowRight, BookOpen, Heart } from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Smooth loading progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsReady(true);
          return 100;
        }
        return prev + 15;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="splash-screen-container"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#FDF0F5] via-[#FCE4EC] to-[#F5E6FF] select-none"
    >
      {/* Dynamic Animated Floating Petals */}
      <PetalsCanvas count={36} />

      {/* Radiant Background Bokeh & Glow Orbs */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-pink-300/30 blur-3xl animate-glow pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-purple-300/25 blur-3xl animate-glow pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-[500px] h-64 rounded-full bg-rose-200/40 blur-3xl pointer-events-none" />

      {/* Soft reflective water/floor sheen effect at bottom matching the reference image */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-white/40 via-pink-100/20 to-transparent pointer-events-none backdrop-blur-[1px]" />

      {/* Main Centered Content */}
      <div className="relative z-30 flex flex-col items-center text-center px-6 max-w-xl mx-auto">
        {/* Glowing Pink Flower Logo */}
        <div className="relative mb-6 group cursor-pointer" onClick={onEnter}>
          {/* Subtle logo background glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-400 via-rose-300 to-purple-400 opacity-40 blur-2xl group-hover:opacity-60 transition-opacity" />

          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
            >
              <defs>
                <radialGradient id="sakuraCenterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF1F2" />
                  <stop offset="60%" stopColor="#FBCFE8" />
                  <stop offset="100%" stopColor="#F472B6" />
                </radialGradient>
                <linearGradient id="petalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDF2F8" />
                  <stop offset="30%" stopColor="#F472B6" />
                  <stop offset="85%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#DB2777" />
                </linearGradient>
                <linearGradient id="petalGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFF1F2" />
                  <stop offset="35%" stopColor="#FB7185" />
                  <stop offset="85%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#BE123C" />
                </linearGradient>
                <radialGradient id="goldPistil" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="70%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </radialGradient>
              </defs>

              {/* Ambient Floating Mini Petals around */}
              <path
                d="M 18,22 C 14,20 12,26 15,29 C 18,32 23,28 21,24 Z"
                fill="#F472B6"
                opacity="0.75"
              />
              <path
                d="M 82,20 C 86,18 88,24 85,27 C 82,30 77,26 79,22 Z"
                fill="#FB7185"
                opacity="0.8"
              />
              <path
                d="M 85,78 C 88,80 84,86 80,84 C 77,81 81,76 85,78 Z"
                fill="#F472B6"
                opacity="0.7"
              />

              {/* Five Sakura Blossom Petals (Rotated with notch at outer tip) */}
              {[0, 72, 144, 216, 288].map((angle) => (
                <g key={angle} transform={`rotate(${angle} 50 50)`}>
                  {/* Outer Petal with Sakura Notch */}
                  <path
                    d="M 50,50 C 41,38 34,24 43,14 C 47,9 49,12 50,15 C 51,12 53,9 57,14 C 66,24 59,38 50,50 Z"
                    fill="url(#petalGrad1)"
                    stroke="#FFF1F2"
                    strokeWidth="0.8"
                    opacity="0.95"
                  />
                  {/* Inner Petal Sheen highlight */}
                  <path
                    d="M 50,47 C 44,38 40,28 46,20 C 48,17 50,18 50,20 C 50,18 52,17 54,20 C 60,28 56,38 50,47 Z"
                    fill="url(#petalGrad2)"
                    opacity="0.65"
                  />
                  {/* Petal Vein */}
                  <path
                    d="M 50,48 Q 50,30 50,18"
                    stroke="#FFF1F2"
                    strokeWidth="0.7"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                </g>
              ))}

              {/* Flower Center Radiant Core */}
              <circle cx="50" cy="50" r="11" fill="url(#sakuraCenterGlow)" />
              <circle cx="50" cy="50" r="7" fill="#F43F5E" opacity="0.85" />
              <circle cx="50" cy="50" r="4.5" fill="url(#goldPistil)" />

              {/* Center Stamens / Anthers */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((stamenAngle) => (
                <g key={stamenAngle} transform={`rotate(${stamenAngle} 50 50)`}>
                  <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="38"
                    stroke="#FEF08A"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  <circle cx="50" cy="37" r="1.4" fill="#F59E0B" />
                  <circle cx="50" cy="37" r="0.7" fill="#FEF08A" />
                </g>
              ))}

              {/* Sparkle Glints */}
              <path
                d="M 50,46 Q 50,50 46,50 Q 50,50 50,54 Q 50,50 54,50 Q 50,50 50,46 Z"
                fill="#FFFFFF"
                opacity="0.95"
              />
              <circle cx="50" cy="50" r="2" fill="#FFFFFF" opacity="0.9" />
            </svg>
          </div>
        </div>

        {/* Application Main Title */}
        <h1
          id="splash-app-title"
          className="font-serif-title text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#D94680] via-[#C026D3] to-[#7C3AED] drop-shadow-sm mb-3"
        >
          SoulSelf
        </h1>

        {/* Delicate Ornamental Divider */}
        <div className="flex items-center justify-center gap-3 w-48 mx-auto my-2 text-pink-400/80">
          <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-pink-300 to-pink-400" />
          <span className="text-xs">✦</span>
          <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-purple-300 to-purple-400" />
        </div>

        {/* Subtitle */}
        <p className="font-sans-ui text-base sm:text-lg text-[#6E5474] font-normal tracking-wide mt-1 mb-8">
          Your thoughts. Your space. Your growth.
        </p>

        {/* Loading Spinner / Progress or Home Button */}
        <div className="flex flex-col items-center gap-4 mt-2">
          {/* Subtle Ring Spinner */}
          <div className="relative w-9 h-9">
            <div className="w-full h-full rounded-full border-2 border-pink-200 border-t-pink-500 border-r-purple-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
            </div>
          </div>

          <span className="text-sm font-sans-ui text-[#8B6E92] font-medium tracking-wide">
            {progress < 100 ? "Loading your journal..." : "Your sanctuary is ready 🌸"}
          </span>

          {/* Primary Home / Enter Button as requested */}
          <button
            id="splash-home-enter-btn"
            onClick={onEnter}
            className="group mt-2 inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-gradient-to-r from-[#EC4899] via-[#D946EF] to-[#8B5CF6] text-white font-medium text-base shadow-lg shadow-pink-300/50 hover:shadow-xl hover:shadow-pink-400/60 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer"
          >
            <span>Welcome Home</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Credit */}
      <div className="absolute bottom-4 z-30 text-xs text-[#9E83A4] font-sans-ui flex items-center gap-1.5">
        <span>SoulSelf Sanctuary</span>
        <span>•</span>
        <span>Cozy Digital Diary & Gemini AI</span>
      </div>
    </div>
  );
};
