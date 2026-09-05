import React, { useMemo } from "react";
import { JournalEntry, MoodType } from "../types";
import { Smile, Sparkles, Heart } from "lucide-react";

interface EmotionKPICardsProps {
  entries: JournalEntry[];
  onSelectMood?: (mood: MoodType) => void;
}

interface EmotionConfig {
  mood: MoodType;
  label: string;
  emoji: string;
  gradient: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}

const ALL_EMOTIONS: EmotionConfig[] = [
  {
    mood: "Happy",
    label: "Happy",
    emoji: "😊",
    gradient: "from-amber-500/10 via-amber-100/30 to-amber-50/50",
    borderColor: "border-amber-200/80 hover:border-amber-300",
    textColor: "text-amber-900",
    badgeBg: "bg-amber-100 text-amber-800",
  },
  {
    mood: "Calm",
    label: "Calm",
    emoji: "🌿",
    gradient: "from-emerald-500/10 via-emerald-100/30 to-emerald-50/50",
    borderColor: "border-emerald-200/80 hover:border-emerald-300",
    textColor: "text-emerald-900",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
  {
    mood: "Excited",
    label: "Excited",
    emoji: "✨",
    gradient: "from-pink-500/10 via-pink-100/30 to-pink-50/50",
    borderColor: "border-pink-200/80 hover:border-pink-300",
    textColor: "text-pink-900",
    badgeBg: "bg-pink-100 text-pink-800",
  },
  {
    mood: "Neutral",
    label: "Reflective",
    emoji: "💭",
    gradient: "from-purple-500/10 via-purple-100/30 to-purple-50/50",
    borderColor: "border-purple-200/80 hover:border-purple-300",
    textColor: "text-purple-900",
    badgeBg: "bg-purple-100 text-purple-800",
  },
  {
    mood: "Worried",
    label: "Worried",
    emoji: "🌧️",
    gradient: "from-sky-500/10 via-sky-100/30 to-sky-50/50",
    borderColor: "border-sky-200/80 hover:border-sky-300",
    textColor: "text-sky-900",
    badgeBg: "bg-sky-100 text-sky-800",
  },
  {
    mood: "Sad",
    label: "Sad",
    emoji: "💧",
    gradient: "from-blue-500/10 via-blue-100/30 to-blue-50/50",
    borderColor: "border-blue-200/80 hover:border-blue-300",
    textColor: "text-blue-900",
    badgeBg: "bg-blue-100 text-blue-800",
  },
  {
    mood: "Tired",
    label: "Tired",
    emoji: "💤",
    gradient: "from-indigo-500/10 via-indigo-100/30 to-indigo-50/50",
    borderColor: "border-indigo-200/80 hover:border-indigo-300",
    textColor: "text-indigo-900",
    badgeBg: "bg-indigo-100 text-indigo-800",
  },
  {
    mood: "Frustrated",
    label: "Frustrated",
    emoji: "⚡",
    gradient: "from-rose-500/10 via-rose-100/30 to-rose-50/50",
    borderColor: "border-rose-200/80 hover:border-rose-300",
    textColor: "text-rose-900",
    badgeBg: "bg-rose-100 text-rose-800",
  },
];

export const EmotionKPICards: React.FC<EmotionKPICardsProps> = ({
  entries,
  onSelectMood,
}) => {
  // Calculate unique active days per emotion
  const emotionStats = useMemo(() => {
    // Total unique days across all entries
    const allUniqueDays = new Set(
      entries
        .map((e) => e.date)
        .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    );
    const totalDaysCount = allUniqueDays.size || 1;

    const statsMap = new Map<
      MoodType,
      { daysCount: number; entriesCount: number; percentage: number }
    >();

    ALL_EMOTIONS.forEach((config) => {
      const matchingEntries = entries.filter((e) => e.mood === config.mood);
      const uniqueDays = new Set(
        matchingEntries
          .map((e) => e.date)
          .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      );

      const daysCount = uniqueDays.size;
      const entriesCount = matchingEntries.length;
      const percentage = Math.round((daysCount / totalDaysCount) * 100);

      statsMap.set(config.mood, { daysCount, entriesCount, percentage });
    });

    return { statsMap, totalDaysCount };
  }, [entries]);

  return (
    <div id="emotion-kpi-breakdown-section" className="mb-8 space-y-4 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-pink-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950">
              EMOTION KPI BREAKDOWN
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-pink-50 text-purple-900 border border-pink-100 font-medium">
              8 Emotion States
            </span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-purple-950">
            Days Logged by Emotion
          </h3>
          <p className="text-xs text-purple-900/60 font-serif italic">
            Overview of happy, calm, reflective, sad, and all available emotion days in your sanctuary.
          </p>
        </div>
      </div>

      {/* 8 Emotion KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
        {ALL_EMOTIONS.map((item) => {
          const data = emotionStats.statsMap.get(item.mood) || {
            daysCount: 0,
            entriesCount: 0,
            percentage: 0,
          };

          return (
            <div
              key={item.mood}
              onClick={() => onSelectMood && onSelectMood(item.mood)}
              className={`relative rounded-3xl p-4 sm:p-5 bg-gradient-to-br ${item.gradient} border ${item.borderColor} bg-white/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group`}
            >
              {/* Header: Emoji & Emotion Title */}
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/90 shadow-2xs border border-pink-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  {item.emoji}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${item.badgeBg}`}
                >
                  {data.percentage}%
                </span>
              </div>

              {/* Days Count */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl sm:text-3xl font-bold font-serif ${item.textColor}`}>
                    {data.daysCount}
                  </span>
                  <span className="text-xs font-serif font-medium text-purple-900/70">
                    {data.daysCount === 1 ? "day" : "days"}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-serif font-bold text-purple-950">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-purple-900/50 font-serif italic">
                    {data.entriesCount} {data.entriesCount === 1 ? "entry" : "entries"}
                  </span>
                </div>
              </div>

              {/* Bottom Progress Bar */}
              <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden mt-3 border border-pink-100/50">
                <div
                  className="bg-pink-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(data.percentage, data.daysCount > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
