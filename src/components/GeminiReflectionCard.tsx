import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Lightbulb, Heart, MessageSquareQuote } from "lucide-react";
import { JournalEntry } from "../types";
import { getDashboardReflection } from "../services/geminiClient";

interface GeminiReflectionCardProps {
  entries: JournalEntry[];
  userName: string;
  onPromptClick: (prompt: string) => void;
}

const INSPIRATIONAL_PROMPTS = [
  "What is one small moment from today that made you feel peaceful?",
  "What is something you forgave yourself for or learned recently?",
  "Where did your creative energy flow most effortlessly this week?",
  "Who or what brought an unexpected smile to your heart today?",
];

export const GeminiReflectionCard: React.FC<GeminiReflectionCardProps> = ({
  entries,
  userName,
  onPromptClick,
}) => {
  const [reflection, setReflection] = useState<string>(
    "Your recent entries show a lovely rhythm of creativity, mindful pauses, and gentle progress on your dreams. When you honor both your work and your rest, your spirit blossoms with quiet confidence. 🌸"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [activePromptIdx, setActivePromptIdx] = useState(0);

  const fetchFreshReflection = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardReflection(entries, userName);
      if (data.reflection) {
        setReflection(data.reflection);
      }
    } catch (e) {
      setReflection(
        "Your thoughts weave a meaningful tapestry of self-awareness and gentle resilience. Each journal page holds space for your authentic growth."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="gemini-reflection-card"
      className="bg-gradient-to-br from-pink-600 via-pink-700 to-rose-700 text-white p-7 sm:p-8 rounded-[36px] shadow-2xl relative overflow-hidden mb-8 group"
    >
      {/* Subtle glowing ambient accents */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-pink-300/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-pink-300">
            GEMINI NOTICED
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
        </div>

        <button
          id="refresh-gemini-reflection-btn"
          onClick={fetchFreshReflection}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-purple-200 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-pink-300" : ""}`} />
          <span className="hidden sm:inline">
            {isLoading ? "Listening..." : "Refresh"}
          </span>
        </button>
      </div>

      {/* Reflection Content Quote */}
      <p className="relative z-10 font-serif italic text-lg sm:text-xl leading-relaxed mb-6 text-purple-100 opacity-95">
        "{reflection}"
      </p>

      {/* Today's Reflection Prompts Carousel */}
      <div className="relative z-10 border-t border-purple-700/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-200">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-pink-300 shrink-0" />
          <span className="opacity-75">Prompt:</span>
          <span className="italic text-white line-clamp-1">
            "{INSPIRATIONAL_PROMPTS[activePromptIdx]}"
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() =>
              setActivePromptIdx((prev) => (prev + 1) % INSPIRATIONAL_PROMPTS.length)
            }
            className="text-pink-300 hover:text-white transition-colors cursor-pointer"
          >
            Next Spark
          </button>
          <button
            onClick={() => onPromptClick(INSPIRATIONAL_PROMPTS[activePromptIdx])}
            className="px-3.5 py-1 rounded-full bg-pink-500/30 hover:bg-pink-500/50 text-pink-200 hover:text-white border border-pink-400/40 text-xs font-medium transition-colors cursor-pointer"
          >
            Ask Gemini →
          </button>
        </div>
      </div>
    </div>
  );
};
