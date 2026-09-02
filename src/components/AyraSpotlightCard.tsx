import React from "react";
import { Sparkles, MessageCircle, CloudRain, Sprout, Brain, BookMarked, ArrowRight, Heart } from "lucide-react";
import { AyraConversationMode } from "../types";

interface AyraSpotlightCardProps {
  onStartAyra: (mode?: AyraConversationMode) => void;
  userName: string;
}

export const AyraSpotlightCard: React.FC<AyraSpotlightCardProps> = ({ onStartAyra, userName }) => {
  return (
    <div
      id="ayra-spotlight-card"
      className="w-full relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#FFF5F8] via-[#FAF6FB] to-[#F5EFF8] border border-pink-200/80 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-300 group"
    >
      {/* Background soft ambient orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-pink-200/40 via-purple-100/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-radial from-purple-200/30 via-pink-100/10 to-transparent rounded-full blur-xl -mb-12 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Column: Persona details */}
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-400 text-white flex items-center justify-center font-serif font-bold text-base shadow-sm">
              💜
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl text-purple-950">AYRA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200/60">
                AI Companion
              </span>
            </div>
          </div>

          <h2 className="font-serif text-xl sm:text-2xl font-bold text-purple-950 tracking-tight leading-snug">
            Whenever you need a little company or space to reflect.
          </h2>

          <p className="font-serif italic text-sm text-purple-900/70 leading-relaxed">
            You can talk to AYRA about your day, your feelings, or ideas that feel tangled. No judgment. Just a quiet space to breathe, think, and grow.
          </p>

          {/* Quick Mode Starters */}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onStartAyra("just-talk")}
              className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-pink-100/70 text-purple-950 text-xs font-serif font-medium border border-pink-200/70 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>💬</span>
              <span>Just Talk</span>
            </button>

            <button
              onClick={() => onStartAyra("vent")}
              className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-pink-100/70 text-purple-950 text-xs font-serif font-medium border border-pink-200/70 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>☁️</span>
              <span>Let Me Vent</span>
            </button>

            <button
              onClick={() => onStartAyra("motivate")}
              className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-pink-100/70 text-purple-950 text-xs font-serif font-medium border border-pink-200/70 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>🌱</span>
              <span>Motivate Me</span>
            </button>

            <button
              onClick={() => onStartAyra("think")}
              className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-pink-100/70 text-purple-950 text-xs font-serif font-medium border border-pink-200/70 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>🧠</span>
              <span>Help Me Think</span>
            </button>
          </div>
        </div>

        {/* Right CTA Button */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center shrink-0 gap-2">
          <button
            id="ayra-spotlight-primary-cta"
            onClick={() => onStartAyra("just-talk")}
            className="px-6 py-3 rounded-full bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <span>Talk with AYRA</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink-300" />
          </button>
          <span className="text-[11px] text-purple-900/50 font-serif italic">
            Private & non-clinical
          </span>
        </div>
      </div>
    </div>
  );
};
