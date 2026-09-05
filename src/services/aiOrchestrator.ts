import {
  JournalEntry,
  AyraMessage,
  PeriodType,
  PeriodReflectionDoc,
} from "../types";

/**
 * 1. AIContextBuilder
 * Enforces strict contextual boundaries across AI experiences.
 */
export class AIContextBuilder {
  /**
   * AYRA Context: Limited to latest N messages + optional user-requested journal snippet
   */
  static buildAyraContext(messages: AyraMessage[], journalContext?: string) {
    const recentMessages = messages.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
      mode: m.mode,
    }));
    return {
      messages: recentMessages,
      journalContext: journalContext || null,
    };
  }

  /**
   * Diary Context: Strictly limited to CURRENT journal entry ONLY.
   */
  static buildDiaryContext(entry: Partial<JournalEntry>) {
    return {
      title: entry.title || "Untitled",
      date: entry.date || "",
      mood: entry.mood || "Calm",
      categories: entry.categories || [],
      location: entry.location ? entry.location.name : null,
      content: entry.content || "",
      mediaCount: entry.media ? entry.media.length : 0,
      stickersCount: entry.stickers ? entry.stickers.length : 0,
    };
  }

  /**
   * Globe Context: Strictly limited to entries matching currently selected location & active filters.
   */
  static buildGlobeContext(locationName: string, matchedEntries: JournalEntry[]) {
    return {
      locationName,
      matchedJournalsCount: matchedEntries.length,
      entries: matchedEntries.map((e) => ({
        date: e.date,
        title: e.title || "Untitled",
        mood: e.mood,
        contentExcerpt: e.content ? e.content.slice(0, 300) : "",
        categories: e.categories,
      })),
    };
  }

  /**
   * Period Context: Strictly limited to entries belonging to completed week/month/year.
   */
  static buildPeriodContext(
    periodType: PeriodType,
    periodKey: string,
    periodEntries: JournalEntry[]
  ) {
    const validDates = periodEntries
      .map((e) => e.date)
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0);
    const uniqueDays = Array.from(new Set(validDates)).length;

    // Mood count breakdown
    const moodCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const locationsSet = new Set<string>();

    periodEntries.forEach((e) => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      (e.categories || []).forEach((c) => {
        categoryCounts[c] = (categoryCounts[c] || 0) + 1;
      });
      if (e.location?.name) locationsSet.add(e.location.name);
    });

    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Calm";
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Personal";

    return {
      periodType,
      periodKey,
      journalCount: periodEntries.length,
      journalDaysCount: uniqueDays,
      topMood,
      topCategory,
      locationCount: locationsSet.size,
      entries: periodEntries.map((e) => ({
        date: e.date,
        title: e.title || "Untitled",
        mood: e.mood,
        categories: e.categories,
        location: e.location?.name || null,
        excerpt: e.content ? e.content.slice(0, 350) : "",
      })),
    };
  }
}

/**
 * 2. AIResponseValidator
 * Validates structured JSON outputs for Periodic Reflections.
 */
export class AIResponseValidator {
  static validateStructuredReflection(data: any): Partial<PeriodReflectionDoc> {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format received from AI provider.");
    }

    return {
      summary: typeof data.summary === "string" ? data.summary : "A meaningful period of personal reflection.",
      emotionalSummary: typeof data.emotionalSummary === "string" ? data.emotionalSummary : "Your emotional journey showed grounded awareness.",
      meaningfulMoments: Array.isArray(data.meaningfulMoments) ? data.meaningfulMoments : [],
      brightSpots: Array.isArray(data.brightSpots) ? data.brightSpots : [],
      challenges: Array.isArray(data.challenges) ? data.challenges : [],
      themes: Array.isArray(data.themes) ? data.themes : [],
      changes: Array.isArray(data.changes) ? data.changes : [],
      explorationPrompts: Array.isArray(data.explorationPrompts) ? data.explorationPrompts : [],
      nextQuestion: typeof data.nextQuestion === "string" ? data.nextQuestion : "What intention would you like to nurture for the coming days?",
    };
  }
}

/**
 * 3. SafetyLayer
 * Empathy, non-clinical boundaries, and crisis intervention.
 */
export class SafetyLayer {
  static evaluateSafety(text: string): { isRisk: boolean; type?: string } {
    const lower = (text || "").toLowerCase();
    const selfHarmTerms = ["suicide", "kill myself", "end my life", "want to die", "cut myself", "self harm"];
    const isRisk = selfHarmTerms.some((term) => lower.includes(term));
    return {
      isRisk,
      type: isRisk ? "SELF_HARM_CONCERN" : undefined,
    };
  }
}

/**
 * 4. AIErrorHandler
 * Formats user-friendly, safe error messages without exposing technical stack traces.
 */
export class AIErrorHandler {
  static formatUserFacingError(err: any): string {
    const message = err?.message || "";
    if (message.includes("401") || message.includes("Authentication")) {
      return "Your session has expired. Please sign in to continue reflecting.";
    }
    if (message.includes("429")) {
      return "AYRA and Gemini are taking a short pause. Please try again in a moment.";
    }
    return "Your reflection is taking a little longer than usual. Please try again.";
  }
}
