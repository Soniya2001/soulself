import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Calendar,
  Moon,
  Globe,
  RefreshCw,
  BookOpen,
  MapPin,
  Flame,
  Heart,
  TrendingUp,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Clock,
} from "lucide-react";
import { JournalEntry, PeriodType, PeriodReflectionDoc } from "../../types";
import {
  savePeriodReflectionDoc,
  getPeriodReflectionDoc,
  subscribeToUserPeriodReflections,
} from "../../services/firestoreService";
import { generateStructuredPeriodReflection } from "../../services/geminiClient";
import { AIContextBuilder, AIResponseValidator } from "../../services/aiOrchestrator";
import { useAuth } from "../../context/AuthContext";

interface ReflectionCornerViewProps {
  entries: JournalEntry[];
  userName: string;
  onOpenJournal?: (entry: JournalEntry) => void;
}

// Helpers for deterministic Week, Month, and Year identifiers
function getWeekKeyAndTitle(dateObj: Date) {
  const target = new Date(dateObj.valueOf());
  const dayNr = (dateObj.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNr = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();
  const weekKey = `${year}-W${String(weekNr).padStart(2, "0")}`;
  
  // Start date (Mon) and end date (Sun)
  const mon = new Date(dateObj);
  mon.setDate(dateObj.getDate() - dayNr);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const formatShort = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    weekKey,
    title: `Week ${weekNr} (${year})`,
    startDate: mon.toISOString().split("T")[0],
    endDate: sun.toISOString().split("T")[0],
    dateRangeStr: `${formatShort(mon)} – ${formatShort(sun)}, ${year}`,
  };
}

function getMonthKeyAndTitle(dateObj: Date) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const monthKey = `${year}-${month}`;
  const monthName = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
  const start = new Date(year, dateObj.getMonth(), 1);
  const end = new Date(year, dateObj.getMonth() + 1, 0);

  return {
    monthKey,
    title: monthName,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function getYearKeyAndTitle(dateObj: Date) {
  const year = dateObj.getFullYear();
  const yearKey = `${year}`;
  return {
    yearKey,
    title: `Year ${year}`,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export const ReflectionCornerView: React.FC<ReflectionCornerViewProps> = ({
  entries,
  userName,
  onOpenJournal,
}) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<PeriodType>("weekly");
  const [savedReflections, setSavedReflections] = useState<PeriodReflectionDoc[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Subscribe to user's saved periodic reflections in Firestore
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserPeriodReflections(user.uid, activeTab, (list) => {
      setSavedReflections(list);
    });
    return () => unsubscribe();
  }, [user, activeTab]);

  // Compute available period options based on user's actual journal entry dates
  const availablePeriods = useMemo(() => {
    const periodMap = new Map<
      string,
      {
        key: string;
        title: string;
        startDate: string;
        endDate: string;
        dateRangeStr?: string;
        entries: JournalEntry[];
      }
    >();

    entries.forEach((entry) => {
      if (!entry.date) return;
      const dateObj = new Date(entry.date + "T00:00:00");
      if (isNaN(dateObj.getTime())) return;

      if (activeTab === "weekly") {
        const info = getWeekKeyAndTitle(dateObj);
        if (!periodMap.has(info.weekKey)) {
          periodMap.set(info.weekKey, {
            key: info.weekKey,
            title: info.title,
            startDate: info.startDate,
            endDate: info.endDate,
            dateRangeStr: info.dateRangeStr,
            entries: [],
          });
        }
        periodMap.get(info.weekKey)!.entries.push(entry);
      } else if (activeTab === "monthly") {
        const info = getMonthKeyAndTitle(dateObj);
        if (!periodMap.has(info.monthKey)) {
          periodMap.set(info.monthKey, {
            key: info.monthKey,
            title: info.title,
            startDate: info.startDate,
            endDate: info.endDate,
            entries: [],
          });
        }
        periodMap.get(info.monthKey)!.entries.push(entry);
      } else if (activeTab === "yearly") {
        const info = getYearKeyAndTitle(dateObj);
        if (!periodMap.has(info.yearKey)) {
          periodMap.set(info.yearKey, {
            key: info.yearKey,
            title: info.title,
            startDate: info.startDate,
            endDate: info.endDate,
            entries: [],
          });
        }
        periodMap.get(info.yearKey)!.entries.push(entry);
      }
    });

    // If current user has no entries for this period, create a current active period slot
    if (periodMap.size === 0) {
      const now = new Date();
      if (activeTab === "weekly") {
        const info = getWeekKeyAndTitle(now);
        periodMap.set(info.weekKey, {
          key: info.weekKey,
          title: info.title,
          startDate: info.startDate,
          endDate: info.endDate,
          dateRangeStr: info.dateRangeStr,
          entries: [],
        });
      } else if (activeTab === "monthly") {
        const info = getMonthKeyAndTitle(now);
        periodMap.set(info.monthKey, {
          key: info.monthKey,
          title: info.title,
          startDate: info.startDate,
          endDate: info.endDate,
          entries: [],
        });
      } else if (activeTab === "yearly") {
        const info = getYearKeyAndTitle(now);
        periodMap.set(info.yearKey, {
          key: info.yearKey,
          title: info.title,
          startDate: info.startDate,
          endDate: info.endDate,
          entries: [],
        });
      }
    }

    return Array.from(periodMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [entries, activeTab]);

  // Set default selected period key when tab or periods change
  useEffect(() => {
    if (availablePeriods.length > 0) {
      const firstKey = availablePeriods[0].key;
      if (!selectedPeriodKey || !availablePeriods.some((p) => p.key === selectedPeriodKey)) {
        setSelectedPeriodKey(firstKey);
      }
    }
  }, [availablePeriods, activeTab]);

  // Active period selection object
  const currentPeriod = useMemo(() => {
    return availablePeriods.find((p) => p.key === selectedPeriodKey) || availablePeriods[0];
  }, [availablePeriods, selectedPeriodKey]);

  // Saved reflection document from Firestore (if already generated)
  const currentSavedReflection = useMemo(() => {
    if (!currentPeriod) return null;
    return savedReflections.find((r) => r.periodKey === currentPeriod.key) || null;
  }, [savedReflections, currentPeriod]);

  // Compute real statistics for current period
  const periodStats = useMemo(() => {
    if (!currentPeriod) return null;
    const periodEntries = currentPeriod.entries;

    const validDates = periodEntries
      .map((e) => e.date)
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0);
    const uniqueDays = Array.from(new Set(validDates)).length;

    const moodCounts: Record<string, { count: number; emoji: string }> = {};
    const categoryCounts: Record<string, number> = {};
    const locationsSet = new Set<string>();

    periodEntries.forEach((e) => {
      if (e.mood) {
        if (!moodCounts[e.mood]) {
          moodCounts[e.mood] = { count: 0, emoji: e.moodEmoji || "🌸" };
        }
        moodCounts[e.mood].count += 1;
      }
      (e.categories || []).forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      if (e.location?.name) {
        locationsSet.add(e.location.name);
      }
    });

    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1].count - a[1].count);
    const topMoodObj = sortedMoods[0]
      ? { mood: sortedMoods[0][0], emoji: sortedMoods[0][1].emoji }
      : { mood: "Calm", emoji: "🌿" };

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Personal";

    return {
      journalCount: periodEntries.length,
      journalDaysCount: uniqueDays,
      topMood: topMoodObj.mood,
      topMoodEmoji: topMoodObj.emoji,
      topCategory,
      locationCount: locationsSet.size,
    };
  }, [currentPeriod]);

  // Trigger Gemini Periodic Reflection Generation
  const handleGenerateReflection = async (forceRegenerate: boolean = false) => {
    if (!user || !currentPeriod || isGenerating) return;

    if (currentPeriod.entries.length === 0) {
      setGenError("Cannot generate reflection: No journal entries were recorded for this period.");
      return;
    }

    setIsGenerating(true);
    setGenError(null);

    try {
      const periodContext = AIContextBuilder.buildPeriodContext(
        activeTab,
        currentPeriod.key,
        currentPeriod.entries
      );

      const resData = await generateStructuredPeriodReflection({
        periodType: activeTab,
        periodKey: currentPeriod.key,
        periodTitle: currentPeriod.title,
        journalContext: periodContext,
        userName: userName || user.displayName || "Friend",
      });

      const validated = AIResponseValidator.validateStructuredReflection(resData.reflection);

      const newReflectionDoc: PeriodReflectionDoc = {
        id: currentPeriod.key,
        userId: user.uid,
        periodType: activeTab,
        periodKey: currentPeriod.key,
        periodTitle: currentPeriod.title,
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        journalCount: periodStats?.journalCount || 0,
        journalDaysCount: periodStats?.journalDaysCount || 0,
        streakCount: 0,
        mostRecordedMood: periodStats?.topMood || "Calm",
        mostRecordedMoodEmoji: periodStats?.topMoodEmoji || "🌿",
        topCategory: periodStats?.topCategory || "Personal",
        locationCount: periodStats?.locationCount || 0,
        summary: validated.summary || "A quiet period of personal reflection.",
        emotionalSummary: validated.emotionalSummary || "Your emotional flow showed steady awareness.",
        meaningfulMoments: validated.meaningfulMoments || [],
        brightSpots: validated.brightSpots || [],
        challenges: validated.challenges || [],
        themes: validated.themes || [],
        changes: validated.changes || [],
        explorationPrompts: validated.explorationPrompts || [],
        nextQuestion: validated.nextQuestion || "What intention would you like to nurture next?",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePeriodReflectionDoc(user.uid, newReflectionDoc);
    } catch (err: any) {
      console.error("Failed to generate reflection:", err);
      setGenError(err.message || "Failed to generate reflection. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="reflection-corner-main-view" className="w-full space-y-8 animate-fade-in pb-12">
      {/* 1. Serene Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-[36px] border border-pink-100/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">✨</span>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950">
              MINDFUL SELF-AWARENESS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-purple-950">
            Reflection Corner
          </h2>
          <p className="text-xs sm:text-sm text-purple-900/70 font-serif italic mt-1">
            "A quiet place to look back, notice patterns, and understand your journey."
          </p>
        </div>

        {/* Navigation Tabs: Weekly, Monthly, Yearly */}
        <div className="flex items-center gap-2 bg-pink-50/80 p-1.5 rounded-full border border-pink-100/80 self-start md:self-auto">
          <button
            onClick={() => {
              setActiveTab("weekly");
              setSelectedPeriodKey(null);
              setGenError(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "weekly"
                ? "bg-white text-purple-950 shadow-xs border border-pink-200"
                : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-pink-500" />
            <span>📅 Weekly</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("monthly");
              setSelectedPeriodKey(null);
              setGenError(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "monthly"
                ? "bg-white text-purple-950 shadow-xs border border-pink-200"
                : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-purple-500" />
            <span>🌙 Monthly</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("yearly");
              setSelectedPeriodKey(null);
              setGenError(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "yearly"
                ? "bg-white text-purple-950 shadow-xs border border-pink-200"
                : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-rose-500" />
            <span>🌎 Yearly</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body Grid: Left Timeline Drawer + Right Reflection Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (4 cols): Period Selection List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white/90 backdrop-blur-md rounded-[32px] p-5 border border-pink-100/80 shadow-xs space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-purple-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-500" />
              <span>
                {activeTab === "weekly"
                  ? "Weekly History"
                  : activeTab === "monthly"
                  ? "Monthly History"
                  : "Yearly History"}
              </span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {availablePeriods.map((period) => {
                const isSelected = currentPeriod?.key === period.key;
                const hasSavedDoc = savedReflections.some((r) => r.periodKey === period.key);

                return (
                  <button
                    key={period.key}
                    onClick={() => {
                      setSelectedPeriodKey(period.key);
                      setGenError(null);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? "bg-gradient-to-r from-pink-50 to-purple-50 border-pink-300 shadow-sm ring-1 ring-pink-300/50"
                        : "bg-white border-pink-100 hover:border-pink-200 hover:bg-pink-50/40"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-purple-950">
                          {period.title}
                        </span>
                        {hasSavedDoc && (
                          <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full font-mono">
                            ✨ Generated
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-purple-900/60 font-serif italic">
                        {period.dateRangeStr || `${period.startDate} to ${period.endDate}`}
                      </p>
                      <span className="text-[10px] text-purple-900/50 font-mono block">
                        📖 {period.entries.length} {period.entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform ${
                        isSelected ? "text-pink-600" : ""
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Real Statistics & Structured Reflection Card */}
        <div className="lg:col-span-8 space-y-6">
          {currentPeriod && (
            <>
              {/* Genuine Real Statistics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs text-center">
                  <span className="text-xl block mb-1">📖</span>
                  <span className="text-2xl font-bold font-serif text-purple-950">
                    {periodStats?.journalCount || 0}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-900/60 block mt-0.5">
                    Entries
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs text-center">
                  <span className="text-xl block mb-1">📅</span>
                  <span className="text-2xl font-bold font-serif text-purple-950">
                    {periodStats?.journalDaysCount || 0}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-900/60 block mt-0.5">
                    Active Days
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs text-center">
                  <span className="text-xl block mb-1">
                    {periodStats?.topMoodEmoji || "🌸"}
                  </span>
                  <span className="text-lg font-bold font-serif text-purple-950 truncate block">
                    {periodStats?.topMood || "Calm"}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-900/60 block mt-0.5">
                    Primary Mood
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs text-center">
                  <span className="text-xl block mb-1">📍</span>
                  <span className="text-2xl font-bold font-serif text-purple-950">
                    {periodStats?.locationCount || 0}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-900/60 block mt-0.5">
                    Places
                  </span>
                </div>
              </div>

              {/* Empty Period State */}
              {currentPeriod.entries.length === 0 ? (
                <div className="bg-white p-10 rounded-[36px] border border-dashed border-pink-200 text-center space-y-4 font-serif">
                  <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto text-2xl">
                    🌸
                  </div>
                  <h4 className="text-xl font-bold text-purple-950">
                    No journal entries recorded for this {activeTab === "weekly" ? "week" : activeTab === "monthly" ? "month" : "year"}
                  </h4>
                  <p className="text-xs text-purple-900/60 max-w-md mx-auto italic">
                    Your reflection for {currentPeriod.title} will appear once you begin capturing your reflections in your diary.
                  </p>
                </div>
              ) : currentSavedReflection ? (
                /* Saved Structured Reflection Document */
                <div className="bg-white rounded-[36px] p-6 sm:p-8 border border-pink-100 shadow-lg space-y-8 animate-fade-in">
                  {/* Header & Regenerate Action */}
                  <div className="flex items-center justify-between border-b border-pink-100 pb-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-pink-600 uppercase tracking-widest block mb-1">
                        {currentSavedReflection.periodTitle}
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-purple-950">
                        {currentSavedReflection.periodTitle} Reflection
                      </h3>
                    </div>

                    <button
                      onClick={() => handleGenerateReflection(true)}
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-pink-200"
                      title="Regenerate Reflection"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                      <span>{isGenerating ? "Reflecting..." : "Refresh"}</span>
                    </button>
                  </div>

                  {/* Summary & Overview */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-rose-50/60 border border-pink-200/60 space-y-3 font-serif">
                    <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>{activeTab === "weekly" ? "Week" : activeTab === "monthly" ? "Month" : "Year"} at a Glance</span>
                    </div>
                    <p className="text-sm sm:text-base text-purple-950 leading-relaxed font-medium">
                      "{currentSavedReflection.summary}"
                    </p>
                  </div>

                  {/* Emotional Journey */}
                  <div className="space-y-3">
                    <h4 className="font-serif text-lg font-bold text-purple-950 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Emotional Rhythm</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-900/80 font-serif leading-relaxed italic bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
                      "{currentSavedReflection.emotionalSummary}"
                    </p>
                  </div>

                  {/* Meaningful Moments & Bright Spots Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Meaningful Moments */}
                    {currentSavedReflection.meaningfulMoments.length > 0 && (
                      <div className="bg-pink-50/30 p-5 rounded-3xl border border-pink-100 space-y-3">
                        <h4 className="font-serif text-sm font-bold text-purple-950 flex items-center gap-2">
                          <span>✨ Meaningful Moments</span>
                        </h4>
                        <ul className="space-y-2">
                          {currentSavedReflection.meaningfulMoments.map((item, idx) => (
                            <li key={idx} className="text-xs text-purple-900/80 font-serif flex items-start gap-2">
                              <span className="text-pink-500">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bright Spots */}
                    {currentSavedReflection.brightSpots.length > 0 && (
                      <div className="bg-purple-50/30 p-5 rounded-3xl border border-purple-100 space-y-3">
                        <h4 className="font-serif text-sm font-bold text-purple-950 flex items-center gap-2">
                          <span>🌸 Bright Spots & Wins</span>
                        </h4>
                        <ul className="space-y-2">
                          {currentSavedReflection.brightSpots.map((item, idx) => (
                            <li key={idx} className="text-xs text-purple-900/80 font-serif flex items-start gap-2">
                              <span className="text-purple-500">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Themes & Shifts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Themes */}
                    {currentSavedReflection.themes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-purple-950">
                          Recurring Themes
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {currentSavedReflection.themes.map((theme, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-serif font-semibold border border-pink-200"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Challenges */}
                    {currentSavedReflection.challenges.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-purple-950">
                          Processed Challenges
                        </h4>
                        <ul className="space-y-1.5">
                          {currentSavedReflection.challenges.map((c, i) => (
                            <li key={i} className="text-xs text-purple-900/70 font-serif italic">
                              "{c}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Reflection Question for Next Period */}
                  {currentSavedReflection.nextQuestion && (
                    <div className="p-6 rounded-3xl bg-purple-950 text-white space-y-2 shadow-md">
                      <div className="flex items-center gap-2 text-pink-300 text-xs uppercase font-bold tracking-widest">
                        <HelpCircle className="w-4 h-4 text-pink-400" />
                        <span>Question for Your Next {activeTab === "weekly" ? "Week" : activeTab === "monthly" ? "Month" : "Year"}</span>
                      </div>
                      <p className="font-serif text-base sm:text-lg font-bold text-pink-100 italic">
                        "{currentSavedReflection.nextQuestion}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Generate Reflection Prompt Banner */
                <div className="bg-white p-8 sm:p-10 rounded-[36px] border border-pink-200 shadow-md text-center space-y-5 animate-fade-in font-serif">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-100 via-purple-100 to-rose-100 text-pink-600 flex items-center justify-center mx-auto text-2xl shadow-sm border border-pink-200">
                    ✨
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold text-purple-950">
                      Your {currentPeriod.title} Reflection is Ready to Generate
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-900/70 max-w-md mx-auto italic">
                      SoulSelf will analyze your {currentPeriod.entries.length} journal entries for {currentPeriod.title} to create a personalized reflection.
                    </p>
                  </div>

                  {genError && (
                    <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs font-sans max-w-md mx-auto border border-rose-200">
                      {genError}
                    </div>
                  )}

                  <button
                    onClick={() => handleGenerateReflection(false)}
                    disabled={isGenerating}
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all cursor-pointer inline-flex items-center gap-2 hover:scale-105"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-pink-200" />
                        <span>Reflecting with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-pink-200" />
                        <span>Generate {currentPeriod.title} Reflection</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
