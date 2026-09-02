import React, { useState } from "react";
import { Sparkles, Heart, Activity, Info, BarChart2 } from "lucide-react";
import { JournalEntry, MoodType } from "../types";

interface EmotionalJourneyProps {
  entries: JournalEntry[];
}

interface MoodConfig {
  mood: MoodType;
  emoji: string;
  color: string;
  bgColor: string;
  label: string;
}

const MOOD_CONFIGS: MoodConfig[] = [
  { mood: "Happy", emoji: "😊", color: "#EC4899", bgColor: "bg-pink-100 text-pink-700", label: "Happy & Joyful" },
  { mood: "Calm", emoji: "🌿", color: "#10B981", bgColor: "bg-emerald-100 text-emerald-700", label: "Calm & Serene" },
  { mood: "Excited", emoji: "✨", color: "#8B5CF6", bgColor: "bg-purple-100 text-purple-700", label: "Inspired & Excited" },
  { mood: "Neutral", emoji: "💭", color: "#6B7280", bgColor: "bg-slate-100 text-slate-700", label: "Reflective / Neutral" },
  { mood: "Tired", emoji: "💤", color: "#F59E0B", bgColor: "bg-amber-100 text-amber-700", label: "Gentle Rest / Tired" },
  { mood: "Worried", emoji: "🌧️", color: "#06B6D4", bgColor: "bg-cyan-100 text-cyan-700", label: "Uncertain / Processing" },
  { mood: "Sad", emoji: "💧", color: "#3B82F6", bgColor: "bg-blue-100 text-blue-700", label: "Tender / Melancholy" },
  { mood: "Frustrated", emoji: "⚡", color: "#F43F5E", bgColor: "bg-rose-100 text-rose-700", label: "Restless / Seeking Peace" },
];

export const EmotionalJourney: React.FC<EmotionalJourneyProps> = ({ entries }) => {
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<MoodType | "ALL">("ALL");

  // Tally counts for each mood
  const moodCounts = MOOD_CONFIGS.map((config) => {
    const count = entries.filter((e) => e.mood === config.mood).length;
    const percentage = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
    return {
      ...config,
      count,
      percentage,
    };
  });

  const totalLogged = entries.length || 1;

  // Recent timeline entries (last 7)
  const recentTimeline = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div
      id="emotional-journey-section"
      className="bg-white rounded-[36px] p-6 sm:p-8 border border-pink-100/70 shadow-xs mb-8"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950">
              EMOTIONAL JOURNEY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-purple-950">
            Inner Weather & Reflections
          </h3>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-pink-50 text-[10px] uppercase tracking-wider text-purple-900 font-bold border border-pink-100">
          <Info className="w-3.5 h-3.5 text-pink-500" />
          <span>Mindful Sanctuary</span>
        </div>
      </div>

      {/* Visual Mood Distribution Stacked Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[#7E6584] font-medium mb-2">
          <span>Emotional Distribution ({entries.length} memories)</span>
          <span className="text-pink-600 font-semibold">
            {moodCounts.find((m) => m.mood === "Happy")?.percentage || 0}% Happy & Uplifted
          </span>
        </div>

        <div className="h-4 w-full rounded-full overflow-hidden flex bg-pink-100/50 p-0.5 shadow-inner">
          {moodCounts.map((item) => {
            if (item.count === 0) return null;
            return (
              <div
                key={item.mood}
                style={{
                  width: `${(item.count / totalLogged) * 100}%`,
                  backgroundColor: item.color,
                }}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 relative group cursor-pointer"
                title={`${item.label}: ${item.count} entries (${item.percentage}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Mood Category Grid Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {moodCounts.map((item) => (
          <button
            key={item.mood}
            onClick={() =>
              setSelectedMoodFilter(selectedMoodFilter === item.mood ? "ALL" : item.mood)
            }
            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
              selectedMoodFilter === item.mood
                ? "bg-pink-100/90 border-pink-300 ring-2 ring-pink-400 shadow-xs"
                : "bg-white/70 border-pink-100/60 hover:bg-pink-50/60 hover:border-pink-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{item.emoji}</span>
              <span className="text-xs font-bold text-[#4A3E4E]">
                {item.count}
              </span>
            </div>
            <div className="text-xs font-medium text-[#5B3E60] truncate">
              {item.mood}
            </div>
            <div className="text-[10px] text-[#8B6E92]">
              {item.percentage}% of entries
            </div>
          </button>
        ))}
      </div>

      {/* Recent Emotional Timeline Ribbon */}
      <div className="bg-pink-50/50 rounded-2xl p-4 border border-pink-100/60">
        <div className="text-xs font-semibold text-[#6E5474] mb-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-pink-500" />
          <span>Recent Emotional Rhythm</span>
        </div>

        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
          {recentTimeline.map((entry, idx) => (
            <div
              key={entry.id}
              className="flex flex-col items-center gap-1.5 shrink-0 px-2.5 py-2 rounded-xl bg-white/80 border border-pink-100 shadow-2xs hover:scale-105 transition-transform"
            >
              <span className="text-xl animate-sway">{entry.moodEmoji || "🌸"}</span>
              <span className="text-[10px] font-semibold text-pink-700 truncate max-w-[60px]">
                {entry.mood}
              </span>
              <span className="text-[9px] text-[#8B6E92]">
                {entry.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
