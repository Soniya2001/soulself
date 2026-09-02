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
      // Fallback to standard non-streaming endpoint
      const fallbackData = await sendAyraChatMessage(params);
      if (fallbackData.isSafetyResponse && params.onSafetyResponse) {
        params.onSafetyResponse(fallbackData);
      } else {
        params.onChunk(fallbackData.reply);
      }
      return fallbackData.reply;
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
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);

          // Check for safety response payload
          if (parsed.isSafetyResponse) {
            if (params.onSafetyResponse) {
              params.onSafetyResponse(parsed);
            }
            return parsed.reply || "";
          }

          if (parsed.chunk) {
            accumulatedText += parsed.chunk;
            params.onChunk(parsed.chunk);
          }
        } catch {
          // Ignore JSON parse errors for incomplete line fragments
        }
      }
    }

    return accumulatedText;
  } catch (err: any) {
    console.warn("Streaming encountered an issue, trying standard call:", err);
    const fallback = await sendAyraChatMessage(params);
    if (fallback.isSafetyResponse && params.onSafetyResponse) {
      params.onSafetyResponse(fallback);
    } else {
      params.onChunk(fallback.reply);
    }
    return fallback.reply;
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


