import React, { useEffect, useState } from "react";
import { Sparkles, BookHeart, Lock, Heart } from "lucide-react";
import { audioManager } from "../utils/audio";

interface DiaryBookOpeningProps {
  title?: string;
  onAnimationComplete: () => void;
}

export const DiaryBookOpening: React.FC<DiaryBookOpeningProps> = ({
  title = "SoulSelf Sanctuary",
  onAnimationComplete,
}) => {
  const [stage, setStage] = useState<"closed" | "opening" | "turning" | "open">("closed");

  useEffect(() => {
    // Sequence the realistic diary opening animation
    const t1 = setTimeout(() => {
      setStage("opening");
      audioManager.playPageTurn();
    }, 400);

    const t2 = setTimeout(() => {
      setStage("turning");
      audioManager.playPageTurn();
    }, 1100);

    const t3 = setTimeout(() => {
      setStage("open");
      onAnimationComplete();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onAnimationComplete]);

  return (
    <div
      id="diary-opening-experience"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#FAF0F5] via-[#FDF2F8] to-[#F5E8FF] overflow-hidden p-4"
    >
      {/* Background Ambience & floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-purple-300/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        {/* 3D Perspective Container */}
        <div
          className="relative w-72 sm:w-88 h-96 sm:h-[460px] rounded-r-3xl rounded-l-lg shadow-2xl transition-all duration-1000"
          style={{
            perspective: "1400px",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Back Cover & Inner Pages Stack */}
          <div className="absolute inset-0 bg-[#FFFDFB] rounded-r-3xl rounded-l-lg border-r-8 border-b-8 border-pink-200/80 shadow-2xl flex flex-col p-6 overflow-hidden">
            {/* Lined paper mockup inside */}
            <div className="w-full h-full diary-paper-lined p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-pink-400 font-serif">
                <span>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                <span>Page 1 🌸</span>
              </div>
              <div className="space-y-2 opacity-50">
                <div className="h-3 bg-pink-200/50 rounded-full w-3/4" />
                <div className="h-3 bg-pink-200/50 rounded-full w-full" />
                <div className="h-3 bg-pink-200/50 rounded-full w-5/6" />
              </div>
              <div className="text-center text-xs text-purple-400 font-handwriting text-lg">
                Opening your thoughts...
              </div>
            </div>
          </div>

          {/* Turning Page Overlay during animation */}
          {stage === "turning" && (
            <div
              className="absolute inset-0 bg-[#FFFDFD] rounded-r-3xl rounded-l-lg border border-pink-100 shadow-xl origin-left transition-all duration-700"
              style={{
                transform: "rotateY(-120deg)",
              }}
            />
          )}

          {/* Front Cover (Embossed Leather / Velvet feel) */}
          <div
            className={`absolute inset-0 rounded-r-3xl rounded-l-lg bg-gradient-to-br from-[#FF9EBC] via-[#F472B6] to-[#C084FC] border-2 border-pink-300 shadow-2xl p-8 flex flex-col items-center justify-between origin-left transition-all duration-1000 ${
              stage !== "closed" ? "opacity-0" : "opacity-100"
            }`}
            style={{
              transform: stage !== "closed" ? "rotateY(-140deg)" : "rotateY(0deg)",
              transformStyle: "preserve-3d",
              boxShadow: "0 25px 50px -12px rgba(236, 72, 153, 0.35)",
            }}
          >
            {/* Book Spine Crease */}
            <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-pink-800/30 to-transparent pointer-events-none rounded-l-lg" />
            <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-white/40 pointer-events-none" />

            {/* Gold foil embossed header */}
            <div className="flex flex-col items-center text-center mt-6">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 border border-white/40 shadow-inner text-3xl">
                <span className="drop-shadow-sm">🌸</span>
              </div>

              <span className="text-xs uppercase tracking-widest text-pink-100 font-semibold mb-1">
                Private Journal
              </span>
              <h2 className="font-serif-title text-3xl font-bold text-white tracking-wide drop-shadow-md">
                SoulSelf
              </h2>
              <span className="text-xs text-pink-100 italic mt-0.5">
                Gemini AI Companion
              </span>
            </div>

            {/* Gold Lock / Clasp Decoration */}
            <div className="w-full flex items-center justify-center gap-3">
              <div className="h-[1px] flex-1 bg-white/40" />
              <div className="px-3 py-1 rounded-full bg-white/25 border border-white/50 text-white flex items-center gap-1 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your Sanctuary</span>
              </div>
              <div className="h-[1px] flex-1 bg-white/40" />
            </div>

            {/* Bookmark ribbon */}
            <div className="absolute bottom-0 right-10 w-6 h-12 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-b-md shadow-md" />
          </div>
        </div>

        {/* Status text */}
        <div className="mt-8 text-center">
          <p className="font-serif-title text-xl text-[#5B3E60] font-medium flex items-center justify-center gap-2">
            <span>Opening your diary...</span>
            <span className="animate-spin text-pink-500">🌸</span>
          </p>
          <span className="text-xs text-[#8B6E92] font-sans-ui mt-1">
            Setting the sacred space for your authentic voice
          </span>
        </div>
      </div>
    </div>
  );
};
