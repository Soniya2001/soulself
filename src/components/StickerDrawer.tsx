import React, { useState } from "react";
import { STICKER_CATALOG } from "../data/initialData";
import { Sparkles, X, Heart, Smile, Sparkle, Coffee, Leaf } from "lucide-react";

interface StickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSticker: (emoji: string) => void;
}

export const StickerDrawer: React.FC<StickerDrawerProps> = ({
  isOpen,
  onClose,
  onAddSticker,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  if (!isOpen) return null;

  const categories = ["All", "Nature", "Sparkles", "Cute", "Cozy"];

  const filteredStickers =
    activeCategory === "All"
      ? STICKER_CATALOG
      : STICKER_CATALOG.filter((s) => s.category === activeCategory);

  return (
    <div
      id="cute-sticker-drawer"
      className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-pink-200/90 animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎀</span>
          <h4 className="font-serif-title text-xl font-bold text-[#4A3E4E]">
            Cute Diary Stickers
          </h4>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-pink-100/60 hover:bg-pink-200 text-pink-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-[#8B6E92] mb-3">
        Click any sticker to drop it onto your journal page, then drag, rotate, or resize it! 🌸
      </p>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeCategory === cat
                ? "bg-pink-500 text-white shadow-2xs font-semibold"
                : "bg-pink-50 text-[#7E6584] hover:bg-pink-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stickers Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-1">
        {filteredStickers.map((st, i) => (
          <button
            key={`${st.emoji}-${i}`}
            onClick={() => {
              onAddSticker(st.emoji);
            }}
            title={st.label}
            className="w-11 h-11 rounded-2xl bg-pink-50/70 hover:bg-pink-100/90 hover:scale-125 hover:rotate-6 active:scale-95 border border-pink-100 flex items-center justify-center text-2xl transition-all duration-200 cursor-pointer group shadow-2xs"
          >
            <span className="group-hover:animate-bounce drop-shadow-xs">{st.emoji}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-pink-100 flex items-center justify-between text-[10px] text-[#9E83A4]">
        <span>✨ Interactive Drag & Rotate</span>
        <span>25+ Cute Embellishments</span>
      </div>
    </div>
  );
};
