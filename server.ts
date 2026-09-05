import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, getApps, App as AdminApp } from "firebase-admin/app";
import { getAuth, Auth as AdminAuth } from "firebase-admin/auth";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

dotenv.config();

// Initialize Firebase Admin SDK for Server-Side ID Token Verification
let adminApp: AdminApp;
try {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "researchos-ai",
    });
  } else {
    adminApp = getApps()[0]!;
  }
  console.log("🔒 Firebase Admin SDK initialized successfully");
} catch (err: any) {
  console.error("Firebase Admin initialization notice:", err.message);
}

const adminAuth = getAuth();

// Google Cloud Secret Manager Client & Key Caching
let cachedApiKey: string | null = null;
let secretClient: SecretManagerServiceClient | null = null;

async function getGeminiApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;

  // 1. Prioritize environment variable process.env.GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    cachedApiKey = process.env.GEMINI_API_KEY.trim();
    console.log("🔑 Successfully loaded Gemini API key from environment variable");
    return cachedApiKey;
  }

  // 2. Fall back to Google Cloud Secret Manager if configured
  try {
    if (!secretClient) {
      secretClient = new SecretManagerServiceClient();
    }
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "buildathon-504708";
    const secretName =
      process.env.GEMINI_SECRET_NAME || `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;

    const [version] = await secretClient.accessSecretVersion({ name: secretName });
    const payload = version.payload?.data?.toString();
    if (payload && payload.trim().length > 0) {
      cachedApiKey = payload.trim();
      console.log("🔑 Successfully retrieved Gemini API key from Google Cloud Secret Manager");
      return cachedApiKey;
    }
  } catch (smErr: any) {
    // Secret manager fallback non-fatal
  }

  return null;
}

async function getGenAI(): Promise<GoogleGenAI | null> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "soulself-journal-secure",
      },
    },
  });
}

const CANDIDATE_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

async function safeGenerateContent(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        ...params,
      });
      return res;
    } catch (err: any) {
      console.warn(`[Gemini Model ${model} Warning]:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

async function safeGenerateContentStream(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContentStream({
        model,
        ...params,
      });
      return res;
    } catch (err: any) {
      console.warn(`[Gemini Stream Model ${model} Warning]:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

// Middleware: Authenticate requests using Firebase ID Token
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing Bearer authorization token" });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Empty Bearer token" });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    // Never log raw tokens
    console.warn(`[Auth Guard] Token verification rejected on ${req.method} ${req.path}`);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired Firebase ID token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  app.use(express.json({ limit: "5mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "SoulSelf",
      authRequired: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Spotify Authentication & Catalog Search Backend Service
  let spotifyAccessToken: string | null = null;
  let spotifyTokenExpiresAt = 0;

  async function getSpotifyAccessToken(): Promise<string | null> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    if (spotifyAccessToken && Date.now() < spotifyTokenExpiresAt - 60000) {
      return spotifyAccessToken;
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      spotifyAccessToken = data.access_token;
      spotifyTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return spotifyAccessToken;
    } catch (err) {
      console.warn("[Spotify Auth Warning]:", err);
      return null;
    }
  }

  async function searchSpotifyCatalog(query: string) {
    const token = await getSpotifyAccessToken();
    if (!token) return null;

    try {
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      if (!data.tracks || !Array.isArray(data.tracks.items)) return [];

      return data.tracks.items.map((item: any) => ({
        provider: "spotify",
        providerTrackId: item.id,
        title: item.name,
        artist: item.artists ? item.artists.map((a: any) => a.name).join(", ") : "Unknown Artist",
        album: item.album ? item.album.name : "Single",
        artworkUrl: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || "",
        externalUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
        previewUrl: item.preview_url || undefined,
        duration: item.duration_ms ? Math.round(item.duration_ms / 1000) : 210,
      }));
    } catch (err) {
      console.warn("[Spotify Search Warning]:", err);
      return null;
    }
  }

  async function searchITunesCatalog(query: string, targetProvider: string = "spotify") {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      if (!data.results || !Array.isArray(data.results)) return [];

      return data.results.map((item: any) => ({
        provider: targetProvider,
        providerTrackId: item.trackId ? String(item.trackId) : item.artistName,
        title: item.trackName || "Untitled Track",
        artist: item.artistName || "Unknown Artist",
        album: item.collectionName || "Single",
        artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "",
        externalUrl: item.trackViewUrl || "https://music.apple.com",
        previewUrl: item.previewUrl || undefined,
        duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 210,
      }));
    } catch (err) {
      console.warn("[iTunes Fallback Search Warning]:", err);
      return [];
    }
  }

  // Dynamic Provider Music Search Route
  app.get("/api/music/search", async (req, res) => {
    const q = req.query.q as string;
    const provider = (req.query.provider as string) || "spotify";

    if (!q || !q.trim()) {
      return res.json({ tracks: [] });
    }

    try {
      let tracks: any[] | null = null;

      if (provider === "spotify") {
        // Try official Spotify Web API first if credentials exist
        tracks = await searchSpotifyCatalog(q.trim());
      }

      // If Spotify credentials not provided or failed, fall back to global music catalog
      if (!tracks) {
        tracks = await searchITunesCatalog(q.trim(), provider);
      }

      return res.json({ tracks });
    } catch (err: any) {
      console.error("[Music Search Endpoint Error]:", err?.message || err);
      return res.status(500).json({ error: "Failed to search music catalog", tracks: [] });
    }
  });

  // 1. Authenticated Gemini Reflection for User's Journals
  app.post("/api/gemini/reflect", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { entries, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Beloved Friend";

      if (!ai) {
        return res.json({
          reflection:
            "Your recent entries reflect a beautiful journey of self-discovery, gentle progress, and quiet resilience. Keep nurturing your peaceful sanctuary.",
          sentiment: "Peaceful & Uplifted",
          tags: ["Mindfulness", "Creativity", "Gratitude"],
        });
      }

      // Safe summary formulation without leaking or logging raw content
      const entriesSummary =
        Array.isArray(entries) && entries.length > 0
          ? entries
              .slice(0, 5)
              .map(
                (e: any) =>
                  `Date: ${e.date || "Recent"}\nTitle: ${e.title || "Untitled"}\nMood: ${e.mood || "Neutral"}\nContent: ${(e.content || "").slice(0, 300)}`
              )
              .join("\n---\n")
          : "No recent entries yet. User is just starting their journaling journey.";

      const prompt = `You are SoulSelf, a warm, cozy, poetic, gentle, and empathetic digital diary companion.
The user's name is ${userDisplayName}.
Here are their recent journal entries:
${entriesSummary}

Provide a short, deeply supportive, non-clinical reflective observation (2 to 3 sentences max) on what you noticed about their patterns, growth, creativity, or feelings.
Do NOT give medical, clinical, or psychiatric diagnoses.
Keep it cozy, encouraging, and poetic, suitable for an elegant personal diary.`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
      });

      res.json({
        reflection:
          response.text ||
          "Your thoughts radiate thoughtful sincerity and quiet warmth. Each word is a step on your unfolding path.",
      });
    } catch (err: any) {
      console.error("[Reflect Handler Error]:", err?.name || "Server error");
      res.status(500).json({
        reflection:
          "Your recent entries show moments of thoughtful reflection and personal growth. Honoring every feeling brings deeper clarity.",
      });
    }
  });

  // 1b. Authenticated Gemini Reflection for Dynamic Yearly Trackers
  app.post("/api/gemini/tracker-reflect", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { trackerName, trackerDescription, legend, counts, entries, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Beloved Friend";

      const legendSummary = Array.isArray(legend)
        ? legend.map((l: any) => `- Color "${l.color}" represents: "${l.label}"`).join("\n")
        : "";

      const countsSummary =
        counts && typeof counts === "object"
          ? Object.entries(counts)
              .map(([label, count]) => `- ${label}: ${count} day(s)`)
              .join("\n")
          : "";

      const sampleEntries =
        Array.isArray(entries) && entries.length > 0
          ? entries
              .slice(0, 10)
              .map((e: any) => `Date ${e.date}: ${e.label}${e.note ? ` (Note: "${e.note}")` : ""}`)
              .join("\n")
          : "No specific notes entered yet.";

      if (!ai) {
        return res.json({
          reflection: `Looking over your "${trackerName || "Yearly Tracker"}", every color recorded represents a distinct page of your journey. You've had meaningful consistency, and each step adds to a colorful pattern of growth. 🌸`,
          pattern: "Steady consistency throughout your active dates.",
          suggestion: "Continue honoring each day as it unfolds, step by gentle step.",
        });
      }

      const prompt = `You are SoulSelf, a gentle, encouraging, non-judgmental, reflective AI companion.
The user ${userDisplayName} is tracking their days using a custom dynamic color tracker titled "${trackerName || "My Year in Colors"}".
Tracker Description: "${trackerDescription || "A visual representation of my days."}"

CRITICAL RULE FOR COLOR MEANINGS:
Do NOT assume colors have standard meanings (e.g. yellow = happy, blue = sad, green = healthy).
You MUST interpret colors ONLY according to the user's explicit legend definitions below:
${legendSummary}

Here is the actual historical data of their tracker:
Legend Counts:
${countsSummary}

Recent Marked Days and Notes:
${sampleEntries}

Instructions:
1. Provide a gentle, encouraging, non-judgmental observation (2-3 sentences).
2. Point out a thoughtful pattern or rhythm based strictly on the actual data provided.
3. Offer a gentle, supportive suggestion or invitation.
4. Tone requirements: Be warm, empathetic, and encouraging. NEVER use harsh words like "failed", "lazy", "inconsistent", or "behind". Instead use gentle phrasing like "a quieter stretch", "returned to your rhythm", "building momentum".

Format your response as valid JSON with keys:
- "observation": string
- "pattern": string
- "suggestion": string`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              observation: { type: Type.STRING },
              pattern: { type: Type.STRING },
              suggestion: { type: Type.STRING },
            },
            required: ["observation", "pattern", "suggestion"],
          },
        },
      });

      let parsed: any = {};
      try {
        parsed = JSON.parse(response.text || "{}");
      } catch {
        parsed = {
          observation: response.text || "Every color in your tracker builds a unique visual picture of your path.",
          pattern: "A balance of different moments across your calendar.",
          suggestion: "Take a moment to appreciate how far you've come.",
        };
      }

      res.json(parsed);
    } catch (err: any) {
      console.error("[Tracker Reflect Error]:", err?.name || err?.message);
      res.json({
        observation: "Each day marked in your tracker tells a story of your rhythm and intentions.",
        pattern: "You are actively creating a visual tapestry of your year.",
        suggestion: "Keep filling your grid at your own comfortable pace.",
      });
    }
  });

  // 2. Authenticated Multi-turn Conversation with Gemini
  app.post("/api/gemini/chat", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { messages, entryContext, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Beloved Friend";

      if (!ai) {
        return res.json({
          reply: `Thank you for sharing your thoughts with SoulSelf. It sounds like you're processing something meaningful. What part of today brought you the most peace? 🌸`,
        });
      }

      const formattedHistory = (messages || []).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.content || "") }],
      }));

      const systemInstruction = `You are SoulSelf, a gentle, cozy, empathetic journaling companion.
You are conversing with ${userDisplayName} about their private diary entry.
Entry Title: "${entryContext?.title || "My Journal Entry"}"
Entry Date: "${entryContext?.date || "Today"}"
Entry Mood: "${entryContext?.mood || "Reflective"}"
Entry Content:
"""
${(entryContext?.content || "").slice(0, 2000)}
"""

Guidelines:
- Speak with warm compassion, gentle curiosity, and poetic tenderness.
- Help the user reflect deeper on their feelings, wins, challenges, and hopes.
- Keep responses relatively concise (2-4 gentle sentences or a thoughtful question).
- Never give clinical psychological or medical assessments.
- Use soft emojis like 🌸, ✨, 🌿, 💜, ☁️ naturally.`;

      const response = await safeGenerateContent(ai, {
        contents: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        reply:
          response.text ||
          "I hear you deeply. What feelings arise when you look back at these thoughts?",
      });
    } catch (err: any) {
      console.error("[Chat Handler Error]:", err?.name || "Server error");
      res.status(500).json({
        reply: "I am holding space for your words. What part of today feels most worth remembering?",
      });
    }
  });

  // 3. Authenticated Structured Summary Generation
  app.post("/api/gemini/summarize", requireAuth, async (req, res) => {
    try {
      const { entry, chatHistory } = req.body;
      const ai = await getGenAI();

      if (!ai) {
        return res.json({
          summary: {
            mainThemes: ["Self-reflection", "Daily milestones", "Inner calm"],
            importantThoughts: ["Taking time to pause and acknowledge progress made today."],
            whatWentWell: ["Dedicated time to write and reflect without rushing."],
            challenges: ["Balancing multiple priorities with gentle patience."],
            possibleNextSteps: ["Enjoy a restorative evening and celebrate small wins."],
            emotionalTone: entry?.mood || "Peaceful & Hopeful",
            sentiment: "Positive",
          },
        });
      }

      const prompt = `Analyze this journal entry and optional reflection conversation to create a structured reflection summary.
Entry Title: "${entry?.title || ""}"
Entry Content: "${(entry?.content || "").slice(0, 3000)}"
Current Mood: "${entry?.mood || ""}"
Chat history with Gemini: ${JSON.stringify(chatHistory || []).slice(0, 3000)}

Create a structured JSON summary with:
- mainThemes (array of 2-4 strings)
- importantThoughts (array of 1-3 strings)
- whatWentWell (array of 1-3 strings)
- challenges (array of 1-2 strings)
- possibleNextSteps (array of 1-3 strings)
- emotionalTone (a 1-3 word high level emotional tone string, e.g. "Calm & Inspired", "Grateful & Focused")
- sentiment (strictly one of: "Positive", "Neutral", "Negative", "Mixed")
`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mainThemes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key themes identified in the entry",
              },
              importantThoughts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Deep realizations or core thoughts",
              },
              whatWentWell: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Positive moments, wins, or gratitudes",
              },
              challenges: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Obstacles, worries, or difficulties mentioned",
              },
              possibleNextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Gentle actions or intentions moving forward",
              },
              emotionalTone: {
                type: Type.STRING,
                description: "High-level emotional tone (e.g. Calm, Uplifted, Hopeful)",
              },
              sentiment: {
                type: Type.STRING,
                enum: ["Positive", "Neutral", "Negative", "Mixed"],
                description: "Broad sentiment category for personal reflection",
              },
            },
            required: [
              "mainThemes",
              "importantThoughts",
              "whatWentWell",
              "challenges",
              "possibleNextSteps",
              "emotionalTone",
              "sentiment",
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ summary: parsed });
    } catch (err: any) {
      console.error("[Summarize Handler Error]:", err?.name || "Server error");
      res.json({
        summary: {
          mainThemes: ["Self-awareness", "Creative focus"],
          importantThoughts: ["Expressing thoughts on paper brings clarity."],
          whatWentWell: ["Honored the daily journaling ritual."],
          challenges: ["Allowing thoughts to flow without self-judgment."],
          possibleNextSteps: ["Rest well and revisit these intentions tomorrow."],
          emotionalTone: "Gentle & Reflective",
          sentiment: "Positive",
        },
      });
    }
  });

  // 4. Authenticated Lightweight Emotion & Sentiment Analysis
  app.post("/api/gemini/analyze-emotion", requireAuth, async (req, res) => {
    try {
      const { title, content } = req.body;
      const ai = await getGenAI();

      if (!ai) {
        return res.json({
          emotion: "Calm",
          sentiment: "Positive",
          moodEmoji: "🌸",
        });
      }

      const prompt = `Analyze this journal entry for personal reflection (non-clinical):
Title: "${title || ""}"
Content: "${(content || "").slice(0, 1500)}"

Return JSON with:
- emotion: One of ["Happy", "Calm", "Excited", "Worried", "Sad", "Frustrated", "Tired", "Neutral"]
- sentiment: One of ["Positive", "Neutral", "Negative", "Mixed"]
- moodEmoji: A single matching emoji representing the tone (e.g. 🌸, 🌿, ✨, 🌧️, 💭, 💤, 😊)
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emotion: {
                type: Type.STRING,
                enum: ["Happy", "Calm", "Excited", "Worried", "Sad", "Frustrated", "Tired", "Neutral"],
              },
              sentiment: {
                type: Type.STRING,
                enum: ["Positive", "Neutral", "Negative", "Mixed"],
              },
              moodEmoji: {
                type: Type.STRING,
              },
            },
            required: ["emotion", "sentiment", "moodEmoji"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("[Emotion Analysis Error]:", err?.name || "Server error");
      res.json({
        emotion: "Calm",
        sentiment: "Neutral",
        moodEmoji: "🌸",
      });
    }
  });

  // 5. Authenticated AI Category Suggestions (Never auto-mutates, returns suggestions for user approval)
  app.post("/api/gemini/suggest-categories", requireAuth, async (req, res) => {
    try {
      const { title, content, location, availableCategories } = req.body;
      const ai = await getGenAI();

      const defaultCategoriesList = availableCategories || [
        "Personal",
        "Work",
        "Travel",
        "Learning",
        "Ideas",
        "Events",
        "Relationships",
        "Family",
        "Reflection",
        "Creative",
      ];

      if (!ai) {
        const text = `${title || ""} ${content || ""}`.toLowerCase();
        const fallback: string[] = [];
        if (text.includes("travel") || text.includes("trip") || location) fallback.push("Travel");
        if (text.includes("work") || text.includes("project") || text.includes("code") || text.includes("meeting"))
          fallback.push("Work");
        if (text.includes("family") || text.includes("mom") || text.includes("dad") || text.includes("home"))
          fallback.push("Family");
        if (fallback.length === 0) fallback.push("Personal", "Reflection");

        return res.json({
          suggestedCategories: fallback,
          reasoning: "Selected based on key themes in your entry.",
        });
      }

      const prompt = `You are SoulSelf's journaling assistant.
Based on the following journal entry text and optional location, select 1 to 3 the most fitting categories from the available categories list, or propose a concise custom category if none fit.

Journal Title: "${title || ""}"
Journal Content: "${(content || "").slice(0, 2000)}"
Location: "${location?.name ? `${location.name}, ${location.country || ""}` : "None"}"
Available Categories: ${JSON.stringify(defaultCategoriesList)}

Return JSON with:
- suggestedCategories: array of 1 to 3 category names (strings).
- reasoning: a brief 1-sentence friendly explanation of why these fit.
`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedCategories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 to 3 suggested category names",
              },
              reasoning: {
                type: Type.STRING,
                description: "Friendly reason for the suggestion",
              },
            },
            required: ["suggestedCategories", "reasoning"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("[Suggest Categories Error]:", err?.name || "Server error");
      res.json({
        suggestedCategories: ["Personal", "Reflection"],
        reasoning: "General categories for personal daily reflection.",
      });
    }
  });

  // 6. Authenticated Memory Reflection (Multi-turn guidance specifically for turning memories/photos into journal stories)
  app.post("/api/gemini/memory-reflection", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { memory, currentDraft, userPrompt, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Beloved Friend";

      if (!ai) {
        return res.json({
          reflection:
            "Looking back at this moment, what smells, sounds, or feelings from that day stay with you the most? Try describing who you were with or what made you pause to capture this photograph. 🌸",
        });
      }

      const prompt = `You are SoulSelf, a gentle, poetic, and heartwarming diary companion.
The user ${userDisplayName} is writing a journal entry inspired by a photo memory.

Memory Info:
- Caption / Description: "${memory?.caption || "A cherished moment"}"
- Date: "${memory?.date || "A past date"}"
- Location: "${memory?.location?.name ? `${memory.location.name}, ${memory.location.country || ""}` : "Unspecified location"}"
- Platform / Source: "${memory?.source || "Photo upload"}"

Current Journal Draft:
"${(currentDraft || "").slice(0, 1500)}"

User's Reflection Prompt / Question:
"${userPrompt || "Help me write about this memory and what it meant to me."}"

Provide a warm, inspiring 2-3 sentence reflection prompt or gentle starter paragraph that helps the user evoke sensory details (sounds, weather, emotions, gratitude) and weave this photo into their life story. Keep it tender, cozy, and poetic.`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
      });

      res.json({
        reflection:
          response.text ||
          "This moment holds a gentle spark of time. What was in your heart right before this photograph was taken?",
      });
    } catch (err: any) {
      console.error("[Memory Reflection Error]:", err?.name || "Server error");
      res.json({
        reflection:
          "Photos are anchors for the soul. What small detail from this day brings the warmest smile to your face?",
      });
    }
  });

  // -------------------------------------------------------------
  // AYRA AI Companion Endpoints & Dedicated Safety Architecture
  // -------------------------------------------------------------

  // Rate Limiting Map (User UID -> timestamps[])
  const ayraRateLimits = new Map<string, number[]>();

  function checkAyraRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30; // 30 requests per minute

    const timestamps = ayraRateLimits.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= maxRequests) {
      return false; // rate limited
    }

    recent.push(now);
    ayraRateLimits.set(userId, recent);
    return true;
  }

  // Crisis Resources Dictionary for Server-Side Fallback & Injection
  const SERVER_CRISIS_DATA: Record<string, any> = {
    IN: {
      countryCode: "IN",
      countryName: "India",
      primaryServiceName: "Tele-MANAS (Mental Health Support)",
      organization: "Ministry of Health & Family Welfare, Govt. of India (NIMHANS)",
      description: "24×7 free, confidential tele-mental health support across India with trained counselors.",
      phoneNumbers: ["14416", "1800-89-14416"],
      emergencyNumber: "112",
      is24x7: true,
      website: "https://telemanas.mohfw.gov.in",
    },
    US: {
      countryCode: "US",
      countryName: "United States",
      primaryServiceName: "988 Suicide & Crisis Lifeline",
      organization: "SAMHSA",
      description: "24/7 free and confidential support for people in distress.",
      phoneNumbers: ["988"],
      emergencyNumber: "911",
      is24x7: true,
      website: "https://988lifeline.org",
    },
    UK: {
      countryCode: "UK",
      countryName: "United Kingdom",
      primaryServiceName: "Samaritans & NHS 111",
      organization: "Samaritans",
      description: "24/7 free emotional support helpline and urgent mental health support.",
      phoneNumbers: ["116 123", "111"],
      emergencyNumber: "999",
      is24x7: true,
      website: "https://www.samaritans.org",
    },
    CA: {
      countryCode: "CA",
      countryName: "Canada",
      primaryServiceName: "988 Suicide Crisis Helpline",
      organization: "Public Health Agency of Canada",
      description: "24/7 suicide prevention and crisis support across Canada.",
      phoneNumbers: ["988"],
      emergencyNumber: "911",
      is24x7: true,
      website: "https://988.ca",
    },
    GLOBAL: {
      countryCode: "GLOBAL",
      countryName: "International",
      primaryServiceName: "Emergency & Crisis Support",
      organization: "Befrienders Worldwide",
      description: "Immediate emergency medical services or national crisis helpline.",
      phoneNumbers: ["112"],
      emergencyNumber: "112",
      is24x7: true,
      website: "https://www.befrienders.org",
    },
  };

  function evaluateSafetyRisk(text: string): {
    riskType: "IMMINENT_DANGER" | "METHOD_REQUEST" | "SELF_HARM_CONCERN" | "AMBIGUOUS_DISTRESS" | "NONE";
    reason?: string;
  } {
    const lower = text.toLowerCase().trim();

    // 1. Explicit Method / Dosage / Instruction Requests (Strict refusal & immediate safety shift)
    const methodPatterns = [
      /how to (kill|hang|poison|shoot|suffocate|cut|overdose|harm) (my|one)self/,
      /how many (pills|tablets|mg|grams) to (die|overdose|kill)/,
      /best way to (commit suicide|die|end my life|kill myself)/,
      /lethal dose of/,
      /painless way to (die|kill myself)/,
      /instruction.*for suicide/,
    ];
    if (methodPatterns.some((pattern) => pattern.test(lower))) {
      return { riskType: "METHOD_REQUEST" };
    }

    // 2. Imminent Danger / Active Self-Harm
    const imminentPatterns = [
      /i('m| am) going to (kill|hurt|end) (myself|my life) (right now|tonight|today)/,
      /i (have|took) an overdose/,
      /i already (hurt|cut|injured) myself/,
      /goodbye everyone (forever|this is the end)/,
      /about to (jump|hang|swallow|slit|shoot)/,
      /i have a (gun|knife|rope|blade|bottle of pills) (and|ready)/,
    ];
    if (imminentPatterns.some((pattern) => pattern.test(lower))) {
      return { riskType: "IMMINENT_DANGER" };
    }

    // 3. Self-Harm / Suicide Ideation & Intent
    const selfHarmPatterns = [
      /(thinking|thoughts) (about|of) (killing|hurting|ending) (myself|my life)/,
      /i (want|wish) to (die|kill myself|end it all|end my life)/,
      /don't want to live (anymore|any longer)/,
      /better off dead/,
      /suicid(e|al)/,
      /self-harm/,
      /want to cut myself/,
      /tired of living/,
      /no reason to (live|stay alive)/,
      /everyone would be better without me/,
    ];
    if (selfHarmPatterns.some((pattern) => pattern.test(lower))) {
      return { riskType: "SELF_HARM_CONCERN" };
    }

    // 4. Ambiguous Distress Statements (Require gentle, non-panicked clarification)
    const ambiguousPatterns = [
      /i wish i could disappear/,
      /i just want (everything|it all) to (stop|go away|disappear)/,
      /i don't want to wake up/,
      /i can't (take|handle) this anymore/,
      /i feel like disappearing/,
      /what is the point of anything/,
    ];
    if (ambiguousPatterns.some((pattern) => pattern.test(lower))) {
      return { riskType: "AMBIGUOUS_DISTRESS" };
    }

    return { riskType: "NONE" };
  }

  function buildAyraSystemInstruction(
    userDisplayName: string,
    mode: string,
    journalContext?: string
  ): string {
    let modeInstruction = "";
    switch (mode) {
      case "vent":
        modeInstruction = `MODE: "Let Me Vent" (☁️). Focus primarily on active listening, empathetic validation, and holding space. DO NOT immediately jump into unsolicited advice or solutions unless the user asks. Let them express their feelings freely and feel completely heard.`;
        break;
      case "motivate":
        modeInstruction = `MODE: "Motivate Me" (🌱). Provide encouraging, practical, and grounded support. Help the user break down overwhelming tasks into bite-sized, achievable 15-20 minute steps. Focus on forward momentum without cheesy slogans.`;
        break;
      case "think":
        modeInstruction = `MODE: "Help Me Think" (🧠). Assist with gentle structured brainstorming, clarifying trade-offs, and organizing tangled thoughts. Ask clear, clarifying questions to help the user discover their own answers.`;
        break;
      case "reflect":
        modeInstruction = `MODE: "Reflect With Me" (📖). Help the user reflect deeper on their day, emotions, lessons, and personal growth. Formulate thoughtful reflective prompts. When appropriate, offer to summarize the thoughts into a journal entry.`;
        break;
      case "just-talk":
      default:
        modeInstruction = `MODE: "Just Talk" (💬). Natural, warm, relaxed conversation and friendly companionship. Be curious, present, and supportive.`;
        break;
    }

    let journalSnippet = "";
    if (journalContext && typeof journalContext === "string" && journalContext.trim().length > 0) {
      journalSnippet = `\nUSER'S RECENT JOURNAL MEMORY (Shared by user for reflection):\n"""\n${journalContext.slice(0, 1500)}\n"""\nYou may gently weave in insights or patterns from their journal if relevant to what they are asking, showing that you understand their journey.`;
    }

    return `You are AYRA, a warm, kind, and emotionally aware AI companion inside SoulSelf (a mindful digital diary app).
You are having an ongoing, continuous multi-turn conversation with ${userDisplayName}.

AYRA IDENTITY & CORE PHILOSOPHY:
- Tagline: "A little space to talk, reflect, and grow." / "Whenever you need a little company."
- Personality: Warm, kind, patient, encouraging, respectful, playful when appropriate, curious, non-judgmental, supportive, calm, genuine.
- Conversation Flow: Listen → Understand → Respond → Ask when appropriate → Support.
- Tone: Cozy, grounded, conversational, thoughtful, and humanely warm, using soft emojis like 💜, 🌸, ✨, 🌿, ☁️ naturally without overdoing them.

CRITICAL MULTI-TURN CONVERSATION DIRECTIVES:
- Maintain full continuity across all turns in this conversation.
- Remember previous details, emotions, names, and topics the user mentioned earlier in this chat.
- DO NOT start responses with repetitive boilerplate like "I hear you deeply", "I'm right here with you", "Thank you for sharing", or "It sounds like". Vary your openings and sentence structures naturally, just like an empathetic confidant.
- Keep responses concise and human-scaled (usually 2 to 4 thoughtful sentences, or a gentle follow-up question when appropriate). Avoid long generic essays unless the user asks for detailed brainstorming.
- Avoid robotic bullet lists in casual chat; speak conversationally.

CRITICAL IDENTITY & SAFETY BOUNDARIES:
- You are strictly an AI companion inside SoulSelf.
- NEVER pretend to be a human, doctor, therapist, or medical professional.
- NEVER claim to have physical human body experiences, physically be in the room with the user, or have personal real-world life events.
- NEVER encourage emotional dependency, exclusivity, or isolation. Do NOT say things like "You only need me" or discourage their real-world human relationships.
- NEVER provide clinical psychiatric diagnoses or prescribe medications.
- If the user expresses self-harm or suicidal thoughts, respond with compassion and prioritize emergency support (Tele-MANAS in India, 988, 112).

${modeInstruction}
${journalSnippet}`;
  }

  function formatAyraHistoryForGemini(userMessages: any[]): { role: "user" | "model"; parts: { text: string }[] }[] {
    const filtered = (userMessages || []).filter(
      (m) => m && m.content && String(m.content).trim().length > 0 && m.id !== "ayra-welcome"
    );

    const recent = filtered.slice(-20);
    const history: { role: "user" | "model"; parts: { text: string }[] }[] = [];

    for (const m of recent) {
      const role: "user" | "model" = m.role === "user" ? "user" : "model";
      const text = String(m.content || "").slice(0, 3000);

      if (history.length === 0 && role === "model") {
        continue;
      }

      if (history.length > 0 && history[history.length - 1].role === role) {
        history[history.length - 1].parts[0].text += `\n\n${text}`;
      } else {
        history.push({
          role,
          parts: [{ text }],
        });
      }
    }

    if (history.length === 0 && filtered.length > 0) {
      const lastUser = [...filtered].reverse().find((m) => m.role === "user");
      if (lastUser) {
        history.push({
          role: "user",
          parts: [{ text: String(lastUser.content || "").slice(0, 3000) }],
        });
      }
    }

    return history;
  }

  // 7a. AYRA Streaming Chat (Server-Sent Events)
  app.post("/api/gemini/ayra/chat/stream", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { messages, mode = "just-talk", countryCode = "IN", journalContext, userName } = req.body;

      if (!checkAyraRateLimit(user.uid)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait a moment before sending another message.",
        });
      }

      const userDisplayName = userName || user.name || "friend";
      const crisisResource = SERVER_CRISIS_DATA[countryCode.toUpperCase()] || SERVER_CRISIS_DATA["IN"];

      const userMessages = Array.isArray(messages) ? messages : [];
      const latestMessage = userMessages[userMessages.length - 1];
      const latestText = String(latestMessage?.content || "").slice(0, 4000);

      const safetyCheck = evaluateSafetyRisk(latestText);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      // Handle safety scenarios immediately via SSE
      if (safetyCheck.riskType === "METHOD_REQUEST") {
        res.write(
          `data: ${JSON.stringify({
            isSafetyResponse: true,
            isImminentDanger: true,
            reply: `I cannot provide instructions, methods, or details related to self-harm or ending your life, because your safety and well-being matter deeply. 💜\n\nIf you are carrying unbearable weight or feeling like you cannot go on, please connect with someone who can support you right now. You don't have to carry this alone.`,
            safetyQuestion: "Are you in immediate physical danger right now?",
            actionOptions: ["Call Tele-MANAS", "Emergency Help (112)", "Talk to Someone I Trust"],
            crisisResource,
            done: true,
          })}\n\n`
        );
        return res.end();
      }

      if (safetyCheck.riskType === "IMMINENT_DANGER") {
        res.write(
          `data: ${JSON.stringify({
            isSafetyResponse: true,
            isImminentDanger: true,
            reply: `💜 ${userDisplayName}, I am really glad you reached out, but I am very concerned for your safety right now. Because you may be in immediate danger, please do not stay alone.\n\nPlease call emergency services immediately or reach out to Tele-MANAS or someone physically near you right now.`,
            safetyQuestion: "Have you already injured yourself, or do you have immediate emergency help with you?",
            actionOptions: ["Call Emergency Services (112)", "Call Tele-MANAS (14416)", "Reach Someone Nearby"],
            crisisResource,
            done: true,
          })}\n\n`
        );
        return res.end();
      }

      if (safetyCheck.riskType === "SELF_HARM_CONCERN") {
        res.write(
          `data: ${JSON.stringify({
            isSafetyResponse: true,
            isImminentDanger: false,
            reply: `💜 I'm really glad you told me. What you're describing sounds really heavy and painful, and I don't want you to have to handle it alone.\n\nWhile I'm here as an AI companion to listen, having real human support makes a world of difference when thoughts like this arise.\n\nIf you think you may hurt yourself or you are in immediate danger, please contact emergency services or reach out to Tele-MANAS. Their trained counselors are available 24×7, completely free and confidential.\n\nIf you can, please stay with someone you trust right now.`,
            safetyQuestion: "Are you in immediate danger right now, or have you already hurt yourself?",
            actionOptions: ["Call Tele-MANAS", "Emergency Help (112)", "Talk to Someone I Trust"],
            crisisResource,
            done: true,
          })}\n\n`
        );
        return res.end();
      }

      if (safetyCheck.riskType === "AMBIGUOUS_DISTRESS") {
        res.write(
          `data: ${JSON.stringify({
            isSafetyResponse: true,
            isAmbiguousClarification: true,
            reply: `It sounds like things may be feeling really overwhelming right now. 💜\n\nWhen you say you wish you could disappear, do you mean you want some space and rest from everything, or are you thinking about hurting yourself?`,
            safetyQuestion: "Are you feeling safe right now, or are you thinking about harming yourself?",
            actionOptions: ["I just need space and rest", "I'm having thoughts of hurting myself", "I'm safe, just overwhelmed"],
            crisisResource,
            done: true,
          })}\n\n`
        );
        return res.end();
      }

      const ai = await getGenAI();
      if (!ai) {
        const fallback = `I hear you 💜. When you're carrying feelings like this, take a quiet breath. I'm right here with you—tell me more about what's going on.`;
        res.write(`data: ${JSON.stringify({ chunk: fallback })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return res.end();
      }

      const formattedHistory = formatAyraHistoryForGemini(userMessages);
      const systemInstruction = buildAyraSystemInstruction(userDisplayName, mode, journalContext);

      let isClosed = false;
      req.on("close", () => {
        isClosed = true;
      });

      const responseStream = await safeGenerateContentStream(ai, {
        contents: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.75,
        },
      });

      for await (const chunk of responseStream) {
        if (isClosed) break;
        const chunkText = chunk.text;
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
          // Explicitly flush to ensure data is sent immediately (not buffered)
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }
      }

      if (!isClosed) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    } catch (err: any) {
      console.error("[AYRA Chat Stream Error]:", err?.name || "Server error");
      if (!res.headersSent) {
        res.status(500).json({ error: "AYRA streaming failed" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error", done: true })}\n\n`);
        res.end();
      }
    }
  });

  // 7b. AYRA Multi-Turn Chat (Standard JSON Non-Streaming fallback)
  app.post("/api/gemini/ayra/chat", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { messages, mode = "just-talk", countryCode = "IN", journalContext, userName } = req.body;

      // Rate limit check
      if (!checkAyraRateLimit(user.uid)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait a moment before sending another message.",
        });
      }

      const userDisplayName = userName || user.name || "friend";
      const crisisResource = SERVER_CRISIS_DATA[countryCode.toUpperCase()] || SERVER_CRISIS_DATA["IN"];

      const userMessages = Array.isArray(messages) ? messages : [];
      const latestMessage = userMessages[userMessages.length - 1];
      const latestText = String(latestMessage?.content || "").slice(0, 4000);

      // Perform dedicated safety evaluation on user's latest input
      const safetyCheck = evaluateSafetyRisk(latestText);

      // A. Explicit Method Request Handler
      if (safetyCheck.riskType === "METHOD_REQUEST") {
        return res.json({
          reply: `I cannot provide instructions, methods, or details related to self-harm or ending your life, because your safety and well-being matter deeply. 💜\n\nIf you are carrying unbearable weight or feeling like you cannot go on, please connect with someone who can support you right now. You don't have to carry this alone.`,
          isSafetyResponse: true,
          isImminentDanger: true,
          safetyQuestion: "Are you in immediate physical danger right now?",
          actionOptions: ["Call Tele-MANAS", "Emergency Help (112)", "Talk to Someone I Trust"],
          crisisResource,
        });
      }

      // B. Imminent Danger Handler
      if (safetyCheck.riskType === "IMMINENT_DANGER") {
        return res.json({
          reply: `💜 ${userDisplayName}, I am really glad you reached out, but I am very concerned for your safety right now. Because you may be in immediate danger, please do not stay alone.\n\nPlease call emergency services immediately or reach out to Tele-MANAS or someone physically near you right now.`,
          isSafetyResponse: true,
          isImminentDanger: true,
          safetyQuestion: "Have you already injured yourself, or do you have immediate emergency help with you?",
          actionOptions: ["Call Emergency Services (112)", "Call Tele-MANAS (14416)", "Reach Someone Nearby"],
          crisisResource,
        });
      }

      // C. Self-Harm / Suicide Ideation Concern
      if (safetyCheck.riskType === "SELF_HARM_CONCERN") {
        return res.json({
          reply: `💜 I'm really glad you told me. What you're describing sounds really heavy and painful, and I don't want you to have to handle it alone.\n\nWhile I'm here as an AI companion to listen, having real human support makes a world of difference when thoughts like this arise.\n\nIf you think you may hurt yourself or you are in immediate danger, please contact emergency services or reach out to Tele-MANAS. Their trained counselors are available 24×7, completely free and confidential.\n\nIf you can, please stay with someone you trust right now.`,
          isSafetyResponse: true,
          isImminentDanger: false,
          safetyQuestion: "Are you in immediate danger right now, or have you already hurt yourself?",
          actionOptions: ["Call Tele-MANAS", "Emergency Help (112)", "Talk to Someone I Trust"],
          crisisResource,
        });
      }

      // D. Ambiguous Distress Clarification
      if (safetyCheck.riskType === "AMBIGUOUS_DISTRESS") {
        return res.json({
          reply: `It sounds like things may be feeling really overwhelming right now. 💜\n\nWhen you say you wish you could disappear, do you mean you want some space and rest from everything, or are you thinking about hurting yourself?`,
          isSafetyResponse: true,
          isAmbiguousClarification: true,
          safetyQuestion: "Are you feeling safe right now, or are you thinking about harming yourself?",
          actionOptions: ["I just need space and rest", "I'm having thoughts of hurting myself", "I'm safe, just overwhelmed"],
          crisisResource,
        });
      }

      // E. Normal AYRA Conversation via Gemini API
      const ai = await getGenAI();
      if (!ai) {
        return res.json({
          reply: `I hear you 💜. When you're carrying feelings like this, take a quiet breath. I'm right here with you—tell me more about what's going on.`,
          isSafetyResponse: false,
        });
      }

      const formattedHistory = formatAyraHistoryForGemini(userMessages);
      const systemInstruction = buildAyraSystemInstruction(userDisplayName, mode, journalContext);

      const response = await safeGenerateContent(ai, {
        contents: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.75,
        },
      });

      const reply =
        response.text ||
        "I'm here with you and listening 💜. What part of that is feeling most prominent right now?";

      res.json({
        reply,
        isSafetyResponse: false,
      });
    } catch (err: any) {
      console.error("[AYRA Chat Handler Error]:", err?.name || "Server error");
      res.status(500).json({
        reply:
          "I'm right here with you 💜. I had a brief hiccup catching that, but I'm listening. Could you share that with me once more?",
        isSafetyResponse: false,
      });
    }
  });

  // 8. AYRA Convert Conversation to Structured Journal Draft
  app.post("/api/gemini/ayra/reflect-to-journal", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { messages, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Friend";

      if (!ai) {
        return res.json({
          draft: {
            title: "A Conversation with AYRA 💜",
            mainThoughts: "Took time today to pause, share what was on my mind, and process my feelings honestly.",
            whatIRealized: "Allowing space to talk through thoughts brings a deeper sense of clarity and inner calm.",
            nextStep: "Take a deep breath and carry this mindful intention through the rest of the day.",
            emotion: "Reflective",
            categories: ["Personal", "Reflection"],
          },
        });
      }

      const conversationText = (messages || [])
        .map((m: any) => `${m.role === "user" ? userDisplayName : "AYRA"}: ${m.content}`)
        .join("\n\n")
        .slice(0, 4000);

      const prompt = `Convert the following conversation between ${userDisplayName} and AYRA into a structured personal journal reflection draft.

Conversation:
"""
${conversationText}
"""

Create a structured JSON with:
- title: A short, meaningful, poetic journal title (3 to 6 words) capturing the essence of what was discussed.
- mainThoughts: A thoughtful 2-3 sentence summary of the core thoughts and themes the user expressed.
- whatIRealized: Key insight, clarity, or emotional realization gained from this conversation.
- nextStep: A gentle, practical, achievable next step or intention for the user.
- emotion: One dominant emotion word from ["Reflective", "Relieved", "Hopeful", "Calm", "Grateful", "Inspired", "Thoughtful", "Peaceful"].
- categories: 1 to 3 category tags from ["Personal", "Reflection", "Growth", "Life", "Work", "Relationships", "Mindfulness", "Creativity"].
`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              mainThoughts: { type: Type.STRING },
              whatIRealized: { type: Type.STRING },
              nextStep: { type: Type.STRING },
              emotion: { type: Type.STRING },
              categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["title", "mainThoughts", "whatIRealized", "nextStep", "emotion", "categories"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ draft: parsed });
    } catch (err: any) {
      console.error("[AYRA Reflect-to-Journal Error]:", err?.name || "Server error");
      res.json({
        draft: {
          title: "Thoughts & Reflections with AYRA 💜",
          mainThoughts: "Shared thoughts and feelings openly during a quiet moment of reflection today.",
          whatIRealized: "Acknowledging my emotions without judgment gives me room to breathe and grow.",
          nextStep: "Honor my current feelings and take one gentle step forward.",
          emotion: "Reflective",
          categories: ["Personal", "Reflection"],
        },
      });
    }
  });

  // 9. Periodic Structured Reflection (Weekly, Monthly, Yearly)
  app.post("/api/gemini/reflection/period", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { periodType, periodKey, periodTitle, journalContext, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Friend";

      if (!ai) {
        return res.json({
          reflection: {
            summary: `During ${periodTitle || periodKey}, you spent time documenting your inner thoughts and moments.`,
            emotionalSummary: "Your entries reflect a steady, mindful presence.",
            meaningfulMoments: ["Taking quiet moments to express your reflections."],
            brightSpots: ["Honoring your feelings with self-compassion."],
            challenges: ["Navigating busy days with self-care."],
            themes: ["Self-awareness", "Personal Growth"],
            changes: ["Growing more comfortable holding space for your feelings."],
            explorationPrompts: ["What intention would bring you the most peace next?"],
            nextQuestion: "How do you want to show up for yourself in the coming period?",
          },
        });
      }

      const prompt = `You are SoulSelf's Structured Reflection Agent. Analyze the following ${periodType} journal data for ${userDisplayName} for ${periodTitle || periodKey}.

Journal Data & Statistics:
"""
${JSON.stringify(journalContext, null, 2)}
"""

Guidelines:
- Ground all insights in the actual journal entries provided. Do NOT fabricate events, moods, or numbers.
- Maintain a warm, encouraging, non-judgmental, serene diary tone.
- Do NOT diagnose, label mental illnesses, or make clinical claims.

Return a JSON object conforming strictly to this schema:
{
  "summary": "Concise 2-3 sentence overview of this ${periodType}.",
  "emotionalSummary": "2-3 sentence reflection on the emotional rhythm and mood flow.",
  "meaningfulMoments": ["2-4 specific key moments or reflections mentioned in the entries"],
  "brightSpots": ["2-3 positive themes, uplifting insights, or small wins"],
  "challenges": ["1-3 challenges or feelings being processed"],
  "themes": ["2-4 overarching themes"],
  "changes": ["1-2 subtle shifts or growth patterns noticed"],
  "explorationPrompts": ["1-2 gentle prompts for self-discovery"],
  "nextQuestion": "One thoughtful, open question for the next ${periodType}."
}`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              emotionalSummary: { type: Type.STRING },
              meaningfulMoments: { type: Type.ARRAY, items: { type: Type.STRING } },
              brightSpots: { type: Type.ARRAY, items: { type: Type.STRING } },
              challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
              themes: { type: Type.ARRAY, items: { type: Type.STRING } },
              changes: { type: Type.ARRAY, items: { type: Type.STRING } },
              explorationPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextQuestion: { type: Type.STRING },
            },
            required: ["summary", "emotionalSummary", "meaningfulMoments", "brightSpots", "challenges", "themes", "nextQuestion"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ reflection: parsed });
    } catch (err: any) {
      console.error("[Period Reflection Error]:", err?.name || "Server error");
      res.json({
        reflection: {
          summary: "A meaningful period of personal reflection.",
          emotionalSummary: "Your emotional journey showed grounded awareness.",
          meaningfulMoments: ["Taking quiet moments to express your reflections."],
          brightSpots: ["Honoring your feelings with self-compassion."],
          challenges: ["Allowing space to process daily experiences."],
          themes: ["Self-awareness", "Personal Growth"],
          changes: ["Nurturing a habit of mindful expression."],
          explorationPrompts: ["What intention would bring you peace next?"],
          nextQuestion: "How do you want to show up for yourself in the coming period?",
        },
      });
    }
  });

  // 10. Diary Contextual Reflection Agent ("Think with me")
  app.post("/api/gemini/reflection/diary", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { entryContext, messages, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Friend";

      if (!ai) {
        return res.json({
          reply: `I'm reading your journal entry "${entryContext.title || "Untitled"}" 📖. It sounds like you're processing some thoughtful feelings. What aspect would you like to explore deeper?`,
        });
      }

      const formattedMessages = (messages || []).map((m: any) => `${m.role === "user" ? userDisplayName : "Diary Reflection Agent"}: ${m.content}`).join("\n\n");

      const prompt = `You are SoulSelf's Diary Reflection Agent ("Think with me"). You help ${userDisplayName} explore, brainstorm, and think deeply about their CURRENT journal entry.

CURRENT JOURNAL ENTRY CONTEXT ONLY:
Title: "${entryContext.title || "Untitled"}"
Date: ${entryContext.date || "Unknown"}
Mood: ${entryContext.mood || "Calm"}
Categories: ${(entryContext.categories || []).join(", ")}
Location: ${entryContext.location || "None"}
Body:
"""
${entryContext.content || "Empty content"}
"""

Conversation History:
"""
${formattedMessages}
"""

Guidelines:
- GROUND EVERYTHING IN THIS SPECIFIC JOURNAL ENTRY. Do NOT refer to unrelated entries.
- Help the user think, explore feelings, brainstorm ideas, or find themes.
- Use observational, non-judgmental language ("It sounds like...", "One possibility is...", "Your entry touches on...").
- Never diagnose, claim psychological certainty, or make clinical judgments.
- Be warm, quiet, encouraging, and supportive.`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: { temperature: 0.7 },
      });

      res.json({ reply: response.text || "I'm holding space for this journal entry with you. What feelings arise when you re-read these words?" });
    } catch (err: any) {
      console.error("[Diary Reflection Error]:", err?.name || "Server error");
      res.json({ reply: "I'm holding space for your journal entry. What thoughts or feelings feel most present right now?" });
    }
  });

  // 11. Memory Globe Contextual Reflection Agent ("Remember with me about this place")
  app.post("/api/gemini/reflection/globe", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { locationName, matchedJournals, messages, userName } = req.body;
      const ai = await getGenAI();

      const userDisplayName = userName || user.name || "Friend";

      if (!ai) {
        return res.json({
          reply: `Reflecting on your memories from ${locationName} 📍. You have ${matchedJournals?.length || 0} journal entries recorded here. What memories stand out to you most?`,
        });
      }

      const journalsText = (matchedJournals || [])
        .map((e: any) => `[${e.date}] "${e.title || "Untitled"}" (${e.mood}): ${e.contentExcerpt || ""}`)
        .join("\n\n")
        .slice(0, 4000);

      const formattedMessages = (messages || []).map((m: any) => `${m.role === "user" ? userDisplayName : "Globe Reflection Agent"}: ${m.content}`).join("\n\n");

      const prompt = `You are SoulSelf's Globe Reflection Agent ("Remember with me about this place"). You help ${userDisplayName} reflect on their memories from a specific geographic location.

LOCATION: ${locationName}
MATCHED JOURNALS FROM THIS PLACE ONLY:
"""
${journalsText}
"""

Conversation History:
"""
${formattedMessages}
"""

Guidelines:
- Ground insights strictly in the memories recorded for ${locationName}.
- Highlight themes, emotions, and how their experience of this place unfolded over time.
- Use warm, atmospheric, nostalgic, reflective language.
- Never diagnose or make clinical claims.`;

      const response = await safeGenerateContent(ai, {
        contents: prompt,
        config: { temperature: 0.7 },
      });

      res.json({ reply: response.text || `Looking across your memories in ${locationName}, a quiet story of experiences unfolds. What stays with you most from this place?` });
    } catch (err: any) {
      console.error("[Globe Reflection Error]:", err?.name || "Server error");
      res.json({ reply: `Looking across your memories in ${locationName}, a quiet story of experiences unfolds. What stays with you most from this place?` });
    }
  });

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌸 SoulSelf running securely on http://localhost:${PORT}`);
  });
}

startServer();
