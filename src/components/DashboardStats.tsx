import React from "react";
import { Sparkles, Calendar, Flame, BookOpen, Smile, Heart, TrendingUp } from "lucide-react";
import { JournalEntry } from "../types";

interface DashboardStatsProps {
  entries: JournalEntry[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ entries }) => {
  // Calculate unique journal days
  const validDates: string[] = entries
    .map((e) => e.date)
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0);
  const uniqueDates: string[] = Array.from(new Set(validDates)).sort().reverse();
  const journalDaysCount = uniqueDates.length;

  // Total entries count
  const totalEntriesCount = entries.length;

  // Streak calculation (consecutive active days)
  const calculateStreak = (): number => {
    if (uniqueDates.length === 0) return 0;
    if (uniqueDates.length === 1) return 1;

    const parseDateAtMidnight = (dateStr: string) => {
      const parts = dateStr.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = parseDateAtMidnight(uniqueDates[i]);
      const prev = parseDateAtMidnight(uniqueDates[i + 1]);
      const diffMs = current.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };
  const streakDays = calculateStreak();

  // Overall Emotional Tone calculation
  const getEmotionalTone = () => {
    if (entries.length === 0) return { tone: "Mostly Positive", emoji: "😊", sub: "Grounded & Optimistic" };
    const positiveMoods = ["Happy", "Calm", "Excited"];
    const positiveCount = entries.filter((e) => positiveMoods.includes(e.mood)).length;
    const ratio = positiveCount / entries.length;

    if (ratio >= 0.6) {
      return { tone: "Mostly Positive", emoji: "😊", sub: `${Math.round(ratio * 100)}% Uplifting Moments` };
    } else if (ratio >= 0.4) {
      return { tone: "Gentle & Balanced", emoji: "🌿", sub: "Thoughtful Equanimity" };
    } else {
      return { tone: "Deeply Reflective", emoji: "💭", sub: "Processing & Growing" };
    }
  };

  const emotionInfo = getEmotionalTone();

  return (
    <div id="dashboard-statistics-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Journal Days Card */}
      <div
        id="stat-card-journal-days"
        className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
      >
        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📅</span>
        <span className="text-3xl font-bold block text-purple-950 font-serif mb-1">
          {journalDaysCount}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-purple-950/60">
          Journal Days
        </span>
      </div>

      {/* 2. Current Streak Card */}
      <div
        id="stat-card-streak"
        className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
      >
        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🔥</span>
        <span className="text-3xl font-bold block text-purple-950 font-serif mb-1">
          {streakDays}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-purple-950/60">
          Day Streak
        </span>
      </div>

      {/* 3. Journals Card */}
      <div
        id="stat-card-total-journals"
        className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
      >
        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📖</span>
        <span className="text-3xl font-bold block text-purple-950 font-serif mb-1">
          {totalEntriesCount}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-purple-950/60">
          Entries
        </span>
      </div>

      {/* 4. Overall Emotional Tone Card */}
      <div
        id="stat-card-emotional-tone"
        className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
      >
        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
          {emotionInfo.emoji}
        </span>
        <span className="text-lg sm:text-xl font-bold block text-purple-950 font-serif truncate max-w-full mb-1">
          {emotionInfo.tone}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-purple-950/60">
          Mood Tone
        </span>
      </div>
    </div>
  );
};
