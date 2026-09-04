import React from "react";
import { MessageCircle, Heart, Sparkles } from "lucide-react";

interface AyraFloatingButtonProps {
  onClick: () => void;
  isOpen?: boolean;
}

export const AyraFloatingButton: React.FC<AyraFloatingButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      id="ayra-floating-quick-btn"
      onClick={onClick}
      aria-label="Open AYRA AI Companion"
      title="Talk with AYRA 💜"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl border border-pink-300/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
    >
      <div className="relative">
        <span className="text-base group-hover:scale-110 transition-transform">🌸</span>
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-pink-600 rounded-full" />
      </div>
      <div className="flex flex-col text-left">
        <span className="font-serif font-bold text-xs leading-none text-white flex items-center gap-1">
          <span>Talk with AYRA</span>
        </span>
        <span className="text-[9px] text-pink-100 font-sans tracking-tight">AI Companion</span>
      </div>
    </button>
  );
};
