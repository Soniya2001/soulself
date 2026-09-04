import React, { useState, useMemo } from "react";
import { Sparkles, Heart, Calendar, ArrowRight, Plus, Info } from "lucide-react";
import { JournalEntry, MoodType } from "../types";

interface EmotionalJourneyProps {
  entries: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
  onNewJournalClick?: () => void;
}

interface TimelinePoint {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  entry: JournalEntry;
  emoji: string;
  mood: string;
}

// Map broad mood strings to standard emojis and labels
const MOOD_EMOJI_MAP: Record<string, { emoji: string; label: string }> = {
  Happy: { emoji: "😊", label: "Happy" },
  Calm: { emoji: "😌", label: "Calm" },
  Excited: { emoji: "✨", label: "Excited" },
  Worried: { emoji: "😟", label: "Worried" },
  Sad: { emoji: "😢", label: "Sad" },
  Frustrated: { emoji: "😤", label: "Frustrated" },
  Tired: { emoji: "😴", label: "Tired" },
  Neutral: { emoji: "😐", label: "Neutral" },
};

export const EmotionalJourney: React.FC<EmotionalJourneyProps> = ({
  entries,
  onSelectEntry,
  onNewJournalClick,
}) => {
  // 1. Group & extract recent 7 unique journal days chronologically (oldest -> newest)
  const timelinePoints: TimelinePoint[] = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    // Group entries by date
    const dateMap = new Map<string, JournalEntry[]>();
    entries.forEach((e) => {
      const dateKey = e.date || new Date(e.createdAt).toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(e);
    });

    // Sort date keys (latest first), take top 7, then reverse to show chronological flow (left to right)
    const sortedDates = Array.from(dateMap.keys()).sort().reverse().slice(0, 7).reverse();

    return sortedDates.map((dateKey) => {
      const dayEntries = dateMap.get(dateKey)!;
      // Pick the latest entry of the day
      const primaryEntry = dayEntries[dayEntries.length - 1];

      // Format display date (e.g. "Aug 29" or "Sep 1")
      const parsedDate = new Date(dateKey + "T00:00:00");
      const displayDate = isNaN(parsedDate.getTime())
        ? dateKey
        : parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullDate = isNaN(parsedDate.getTime())
        ? dateKey
        : parsedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

      // Get emoji and mood label
      const moodKey = primaryEntry.mood || "Calm";
      const config = MOOD_EMOJI_MAP[moodKey] || {
        emoji: primaryEntry.moodEmoji || "🌸",
        label: moodKey,
      };

      return {
        dateKey,
        displayDate,
        fullDate,
        entry: primaryEntry,
        emoji: config.emoji,
        mood: config.label,
      };
    });
  }, [entries]);

  // Selected timeline point for details preview
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(() => {
    return timelinePoints.length > 0 ? timelinePoints.length - 1 : null;
  });

  // Keep selected point within bounds if timeline changes
  const activePoint = useMemo(() => {
    if (timelinePoints.length === 0) return null;
    if (selectedPointIndex !== null && timelinePoints[selectedPointIndex]) {
      return timelinePoints[selectedPointIndex];
    }
    return timelinePoints[timelinePoints.length - 1];
  }, [timelinePoints, selectedPointIndex]);

  // 2. Natural language summary generation based on actual entries
  const summaryText = useMemo(() => {
    if (timelinePoints.length === 0) return null;
    if (timelinePoints.length === 1) {
      return "Your emotional rhythm will become clearer as you add more journal entries. 🌸";
    }

    const moodCounts: Record<string, number> = {};
    timelinePoints.forEach((pt) => {
      moodCounts[pt.mood] = (moodCounts[pt.mood] || 0) + 1;
    });

    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (topMood === "Calm") {
      return "Your recent entries have been mostly calm, creating a serene and grounded rhythm. 🌸";
    } else if (topMood === "Happy" || topMood === "Excited") {
      return "Your recent entries reflect a cheerful, uplifting rhythm filled with bright moments. ✨";
    } else if (topMood === "Worried" || topMood === "Sad" || topMood === "Frustrated") {
      return "Your recent entries show thoughtful reflection as you process quiet feelings. 💜";
    }
    return "Your recent entries show a balanced, gentle emotional flow across your days. 🌸";
  }, [timelinePoints]);

  return (
    <div
      id="recent-emotional-rhythm-section"
      className="bg-white rounded-[36px] p-6 sm:p-8 border border-pink-100/80 shadow-sm mb-8 space-y-6 animate-fade-in"
    >
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-pink-100/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💗</span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-purple-950">
              Recent Emotional Rhythm
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-purple-900/70 font-serif">
            Your emotional journey over the last 7 days
          </p>
        </div>

        {timelinePoints.length > 0 && (
          <span className="text-[11px] font-mono text-purple-900/50 self-start sm:self-auto">
            {timelinePoints.length} day{timelinePoints.length === 1 ? "" : "s"} tracked
          </span>
        )}
      </div>

      {/* 2. Empty State (0 Entries) */}
      {timelinePoints.length === 0 ? (
        <div className="py-10 px-4 text-center space-y-4 font-serif bg-pink-50/40 rounded-3xl border border-pink-100/70">
          <div className="text-4xl animate-pulse">🌸</div>
          <div className="space-y-1">
            <h4 className="font-bold text-lg text-purple-950">
              Your emotional journey will appear here
            </h4>
            <p className="text-xs text-purple-900/60 max-w-md mx-auto leading-relaxed">
              Write a few journal entries and SoulSelf will gently map your recent emotional rhythm over time.
            </p>
          </div>
          {onNewJournalClick && (
            <button
              onClick={onNewJournalClick}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Write Today's Journal</span>
            </button>
          )}
        </div>
      ) : (
        /* 3. Horizontal Emotional Timeline */
        <div className="space-y-6">
          <div className="relative py-6 px-2 sm:px-6">
            {/* Connecting Timeline Line behind nodes */}
            <div className="absolute top-[58px] left-8 right-8 h-0.5 border-t-2 border-dashed border-pink-200/90 pointer-events-none" />

            {/* Timeline Nodes */}
            <div className="flex items-center justify-between sm:justify-around gap-2 overflow-x-auto scrollbar-none pb-2">
              {timelinePoints.map((pt, idx) => {
                const isSelected = activePoint?.dateKey === pt.dateKey;

                return (
                  <button
                    key={pt.dateKey}
                    onClick={() => setSelectedPointIndex(idx)}
                    className={`flex flex-col items-center gap-1.5 transition-all cursor-pointer group focus:outline-none ${
                      isSelected ? "scale-105" : "hover:scale-102 opacity-85 hover:opacity-100"
                    }`}
                  >
                    {/* Emoji */}
                    <span className="text-2xl sm:text-3xl transition-transform group-hover:scale-110">
                      {pt.emoji}
                    </span>

                    {/* Emotion Label */}
                    <span
                      className={`text-xs font-serif font-bold ${
                        isSelected ? "text-pink-600" : "text-purple-950/70"
                      }`}
                    >
                      {pt.mood}
                    </span>

                    {/* Timeline Circle Node (●) */}
                    <div className="relative my-1 flex items-center justify-center z-10">
                      <div
                        className={`w-4 h-4 rounded-full transition-all flex items-center justify-center ${
                          isSelected
                            ? "bg-pink-500 ring-4 ring-pink-200 shadow-sm"
                            : "bg-white border-2 border-pink-400 group-hover:bg-pink-300"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    {/* Date Label */}
                    <span className="text-[11px] font-sans-ui text-purple-900/60 font-medium whitespace-nowrap">
                      {pt.displayDate}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Clickable Selected Entry Preview Box */}
          {activePoint && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-50/80 via-white to-purple-50/60 border border-pink-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activePoint.emoji}</span>
                  <span className="font-serif font-bold text-base text-purple-950">
                    {activePoint.mood}
                  </span>
                  <span className="text-xs text-purple-900/50 font-serif">• {activePoint.fullDate}</span>
                </div>

                {activePoint.entry.title && (
                  <p className="text-xs font-serif font-semibold text-purple-950 line-clamp-1">
                    "{activePoint.entry.title}"
                  </p>
                )}

                {activePoint.entry.content && (
                  <p className="text-xs text-purple-900/70 font-serif italic line-clamp-2">
                    "{activePoint.entry.content}"
                  </p>
                )}
              </div>

              {onSelectEntry && (
                <button
                  onClick={() => onSelectEntry(activePoint.entry)}
                  className="px-4 py-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-102 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <span>View Journal</span>
                  <ArrowRight className="w-3.5 h-3.5 text-pink-200" />
                </button>
              )}
            </div>
          )}

          {/* 5. Natural Language Summary */}
          {summaryText && (
            <div className="text-center pt-2">
              <p className="text-xs sm:text-sm font-serif italic text-purple-950/80 bg-pink-50/50 px-4 py-2.5 rounded-full inline-block border border-pink-100">
                "{summaryText}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
