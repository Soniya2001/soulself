import { getCurrentIdToken } from "../lib/firebase";
import {
  ChatMessage,
  JournalEntry,
  StructuredSummary,
  SentimentType,
  AyraMessage,
  AyraConversationMode,
  AyraJournalReflectionDraft,
  CrisisResourceInfo,
} from "../types";

async function authorizedFetch(url: string, options: RequestInit = {}) {
  const token = await getCurrentIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired or authentication is required. Please sign in again.");
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Something went wrong. Please try again.");
  }

  return response.json();
}

/**
 * Fetch Gemini observation / reflection for current user's journal entries
 */
export async function getDashboardReflection(
  entries: JournalEntry[],
  userName: string
): Promise<{ reflection: string; sentiment?: string; tags?: string[] }> {
  try {
    const data = await authorizedFetch("/api/gemini/reflect", {
      method: "POST",
      body: JSON.stringify({
        entries: entries.slice(0, 6).map((e) => ({
          date: e.date,
          title: e.title,
          mood: e.mood,
          content: e.content ? e.content.slice(0, 350) : "",
          stickers: e.stickers?.map((s) => s.emoji),
        })),
        userName,
      }),
    });
    return data;
  } catch (err: any) {
    console.error("Dashboard reflection error:", err);
    return {
      reflection:
        "Your thoughts radiate thoughtful sincerity and quiet warmth. Honoring every emotion creates a deeper space for personal clarity.",
      sentiment: "Peaceful & Reflective",
    };
  }
}

/**
 * Fetch Gemini observation & reflection for a dynamic yearly tracker
 */
export async function getTrackerReflection(params: {
  trackerName: string;
  trackerDescription?: string;
  legend: { color: string; label: string }[];
  counts: Record<string, number>;
  entries: { date: string; label: string; note?: string }[];
  userName: string;
}): Promise<{ observation: string; pattern: string; suggestion: string }> {
  try {
    const data = await authorizedFetch("/api/gemini/tracker-reflect", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return (
      data || {
        observation: "Each day marked in your tracker builds a visual tapestry of your year.",
        pattern: "A steady presence across your active calendar dates.",
        suggestion: "Continue filling your year at your own comfortable pace.",
      }
    );
  } catch (err: any) {
    console.error("Tracker reflection error:", err);
    return {
      observation: "Each day marked in your tracker represents a distinct, meaningful moment.",
      pattern: "A gentle rhythm of tracking throughout your active days.",
      suggestion: "Take a moment to appreciate your creative self-expression.",
    };
  }
}


/**
 * Send multi-turn chat message to Gemini
 */
export async function sendGeminiChatMessage(
  messages: ChatMessage[],
  entryContext: Partial<JournalEntry>,
  userName: string
): Promise<string> {
  try {
    const data = await authorizedFetch("/api/gemini/chat", {
      method: "POST",
      body: JSON.stringify({
        messages,
        entryContext: {
          title: entryContext.title,
          date: entryContext.date,
          mood: entryContext.mood,
          content: entryContext.content,
        },
        userName,
      }),
    });
    return data.reply || "I am holding space for your words. What feelings arise when you look back at these thoughts?";
  } catch (err: any) {
    console.error("Chat error:", err);
    throw new Error(err.message || "Something went wrong communicating with Gemini. Please try again.");
  }
}

/**
 * Generate structured summary from journal entry and reflection chat
 */
export async function generateJournalSummary(
  entry: Partial<JournalEntry>,
  chatHistory: ChatMessage[] = []
): Promise<StructuredSummary> {
  try {
    const data = await authorizedFetch("/api/gemini/summarize", {
      method: "POST",
      body: JSON.stringify({
        entry: {
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          date: entry.date,
        },
        chatHistory,
      }),
    });
    return (
      data.summary || {
        mainThemes: ["Self-awareness", "Daily Reflection"],
        importantThoughts: ["Expressing thoughts on paper brings clarity and calm."],
        whatWentWell: ["Honored the daily journaling ritual."],
        challenges: ["Allowing thoughts to flow without self-judgment."],
        possibleNextSteps: ["Rest well and revisit these intentions tomorrow."],
        emotionalTone: "Calm & Reflective",
      }
    );
  } catch (err: any) {
    console.error("Summary error:", err);
    throw new Error(err.message || "Unable to generate summary. Please try again.");
  }
}

/**
 * Suggest Categories using Gemini
 */
export async function suggestJournalCategories(
  title: string,
  content: string,
  location?: any,
  availableCategories?: string[]
): Promise<{ suggestedCategories: string[]; reasoning: string }> {
  try {
    const data = await authorizedFetch("/api/gemini/suggest-categories", {
      method: "POST",
      body: JSON.stringify({ title, content, location, availableCategories }),
    });
    return data;
  } catch (err: any) {
    console.error("Suggest categories error:", err);
    return {
      suggestedCategories: ["Personal", "Reflection"],
      reasoning: "Categories tailored to daily reflection.",
    };
  }
}

/**
 * Memory reflection starter & suggestions
 */
export async function getMemoryReflectionAdvice(
  memory: any,
  currentDraft: string,
  userPrompt: string,
  userName: string
): Promise<{ reflection: string }> {
  try {
    const data = await authorizedFetch("/api/gemini/memory-reflection", {
      method: "POST",
      body: JSON.stringify({ memory, currentDraft, userPrompt, userName }),
    });
    return data;
  } catch (err: any) {
    console.error("Memory reflection error:", err);
    return {
      reflection:
        "Every photograph holds a quiet story. What was the feeling in the air right before this moment was captured?",
    };
  }
}

/**
 * Send multi-turn chat message to AYRA AI Companion with streaming SSE support
 */
export async function streamAyraChatMessage(params: {
  messages: AyraMessage[];
  mode: AyraConversationMode;
  countryCode?: string;
  journalContext?: string;
  userName?: string;
  onChunk: (chunkText: string) => void;
  onSafetyResponse?: (data: {
    reply: string;
    isSafetyResponse: boolean;
    isAmbiguousClarification?: boolean;
    isImminentDanger?: boolean;
    safetyQuestion?: string;
    actionOptions?: string[];
    crisisResource?: CrisisResourceInfo;
  }) => void;
}): Promise<string> {
  try {
    console.log("[AYRA CLIENT] request started", { messageCount: params.messages?.length });

    const token = await getCurrentIdToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const requestBody = {
      messages: params.messages,
      mode: params.mode,
      countryCode: params.countryCode,
      journalContext: params.journalContext,
      userName: params.userName,
    };

    const response = await fetch("/api/gemini/ayra/chat/stream", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const statusText = response.status === 401
        ? "Authentication required. Please sign in again."
        : response.status === 429
        ? "Too many messages. Please wait a moment."
        : `Server error (${response.status})`;
      console.warn("[AYRA Stream] Non-OK response:", response.status, statusText);
      throw new Error(statusText);
    }

    if (!response.body) {
      throw new Error("No readable stream received from AYRA server");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, "");
          if (jsonStr === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              console.error("[AYRA CLIENT ERROR]", parsed.error);
              throw new Error(parsed.error);
            }

            // Check for safety response payload
            if (parsed.isSafetyResponse) {
              if (params.onSafetyResponse) {
                params.onSafetyResponse(parsed);
              }
              return parsed.reply || "";
            }

            if (parsed.chunk) {
              accumulatedText += parsed.chunk;
              console.log("[AYRA CLIENT] SSE chunk received", { length: parsed.chunk.length });
              params.onChunk(parsed.chunk);
            }

            if (parsed.done) {
              // Stream completed signal
            }
          } catch (jsonErr: any) {
            if (jsonErr?.message && jsonErr.message.includes("Gemini")) {
              throw jsonErr;
            }
          }
        }
      }

      if (done) break;
    }

    // Process leftover buffer content
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (jsonStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.isSafetyResponse && params.onSafetyResponse) {
              params.onSafetyResponse(parsed);
              return parsed.reply || "";
            }
            if (parsed.chunk) {
              accumulatedText += parsed.chunk;
              console.log("[AYRA CLIENT] SSE chunk received", { length: parsed.chunk.length });
              params.onChunk(parsed.chunk);
            }
          } catch {}
        }
      }
    }

    console.log("[AYRA CLIENT] stream completed", { totalLength: accumulatedText.length });
    return accumulatedText;
  } catch (err: any) {
    console.error("[AYRA CLIENT ERROR] Streaming error:", err);
    throw err;
  }
}

/**
 * Send multi-turn chat message to AYRA AI Companion with safety handling (Standard)
 */
export async function sendAyraChatMessage(params: {
  messages: AyraMessage[];
  mode: AyraConversationMode;
  countryCode?: string;
  journalContext?: string;
  userName?: string;
}): Promise<{
  reply: string;
  isSafetyResponse: boolean;
  isAmbiguousClarification?: boolean;
  isImminentDanger?: boolean;
  safetyQuestion?: string;
  actionOptions?: string[];
  crisisResource?: CrisisResourceInfo;
}> {
  try {
    const data = await authorizedFetch("/api/gemini/ayra/chat", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data;
  } catch (err: any) {
    console.error("AYRA chat client error:", err);
    throw new Error(err.message || "Something went wrong talking to AYRA. Please try again.");
  }
}

/**
 * Convert AYRA conversation to a structured journal draft
 */
export async function generateAyraJournalDraft(params: {
  messages: AyraMessage[];
  userName?: string;
}): Promise<{ draft: AyraJournalReflectionDraft }> {
  try {
    const data = await authorizedFetch("/api/gemini/ayra/reflect-to-journal", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data;
  } catch (err: any) {
    console.error("AYRA reflect-to-journal client error:", err);
    return {
      draft: {
        title: "A Conversation with AYRA 💜",
        mainThoughts: "Shared thoughts and feelings during a quiet moment of reflection.",
        whatIRealized: "Taking time to pause and reflect brings clarity and relief.",
        nextStep: "Take a deep breath and take one mindful step forward.",
        emotion: "Reflective",
        categories: ["Personal", "Reflection"],
      },
    };
  }
}

/**
 * Generate Structured Reflection (Weekly, Monthly, Yearly) via Gemini
 */
export async function generateStructuredPeriodReflection(params: {
  periodType: "weekly" | "monthly" | "yearly";
  periodKey: string;
  periodTitle: string;
  journalContext: any;
  userName?: string;
}): Promise<{ reflection: any }> {
  try {
    const data = await authorizedFetch("/api/gemini/reflection/period", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data;
  } catch (err: any) {
    console.error("Structured period reflection error:", err);
    throw new Error(err.message || "Unable to generate reflection. Please try again.");
  }
}

/**
 * Send message to Contextual Diary Reflection Agent ("Think with me")
 */
export async function sendDiaryReflectionMessage(params: {
  entryContext: any;
  messages: { id: string; role: "user" | "agent"; content: string }[];
  userName?: string;
}): Promise<{ reply: string }> {
  try {
    const data = await authorizedFetch("/api/gemini/reflection/diary", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data;
  } catch (err: any) {
    console.error("Diary reflection error:", err);
    throw new Error(err.message || "Unable to connect with Diary Reflection Agent.");
  }
}

/**
 * Send message to Contextual Globe Reflection Agent ("Remember with me about this place")
 */
export async function sendGlobeReflectionMessage(params: {
  locationName: string;
  matchedJournals: any[];
  messages: { id: string; role: "user" | "agent"; content: string }[];
  userName?: string;
}): Promise<{ reply: string }> {
  try {
    const data = await authorizedFetch("/api/gemini/reflection/globe", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data;
  } catch (err: any) {
    console.error("Globe reflection error:", err);
    throw new Error(err.message || "Unable to connect with Globe Reflection Agent.");
  }
}



