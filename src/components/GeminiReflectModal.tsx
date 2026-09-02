import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  BookmarkPlus,
  Loader2,
  Lightbulb,
  Heart,
  FileText,
  Save,
  MessageSquare,
} from "lucide-react";
import { ChatMessage, JournalEntry, StructuredSummary } from "../types";
import { audioManager } from "../utils/audio";
import { sendGeminiChatMessage, generateJournalSummary } from "../services/geminiClient";
import { saveConversationDoc } from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";

interface GeminiReflectModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Partial<JournalEntry>;
  userName: string;
  onSaveSummary: (summary: StructuredSummary) => void;
}

export const GeminiReflectModal: React.FC<GeminiReflectModalProps> = ({
  isOpen,
  onClose,
  entry,
  userName,
  onSaveSummary,
}) => {
  const { user } = useAuth();
  const [conversationId] = useState<string>(() => `convo-${entry.id || Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (entry.geminiChat && entry.geminiChat.length > 0) {
      return entry.geminiChat;
    }
    return [
      {
        id: "welcome-1",
        role: "model",
        content: `Hello ${userName || "dear"} 🌸 I have read your journal thoughts on "${entry.title || "Today's Reflections"}". How does it feel to put these thoughts into words today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<StructuredSummary | null>(
    entry.summary || null
  );
  const [summarySaved, setSummarySaved] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Persist conversation to Firestore whenever messages change and user is logged in
  useEffect(() => {
    if (user && messages.length > 1) {
      saveConversationDoc(user.uid, {
        id: conversationId,
        userId: user.uid,
        journalId: entry.id,
        title: `Reflection: ${entry.title || "Daily Journal"}`,
        messages,
        summary: generatedSummary || undefined,
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch((err) => console.warn("Auto-save conversation notice:", err));
    }
  }, [messages, generatedSummary, user, conversationId, entry.id, entry.title, entry.createdAt]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputVal.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputVal("");
    setIsSending(true);

    try {
      const reply = await sendGeminiChatMessage(newHistory, entry, userName);

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, modelMsg]);
      audioManager.playSparkleChime();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `model-fallback-${Date.now()}`,
          role: "model",
          content:
            "I'm listening with care. Taking a quiet moment to reflect on your journey is such a beautiful gift to yourself. What would bring you the most peace right now?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const summary = await generateJournalSummary(entry, messages);
      if (summary) {
        setGeneratedSummary(summary);
        onSaveSummary(summary);
        setSummarySaved(true);
        setSaveSuccessMsg("Summary saved to your journal page ✨");
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        audioManager.playSaveChime();
      }
    } catch (e) {
      console.error("Summary error:", e);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div
      id="gemini-reflect-dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/40 backdrop-blur-xs p-3 sm:p-6 animate-fade-in"
    >
      <div
        id="gemini-reflect-container"
        className="w-full sm:w-[520px] h-[90vh] max-h-[850px] bg-[#FFFDFE] rounded-[36px] shadow-2xl border border-pink-200/90 flex flex-col overflow-hidden animate-slide-in-right"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pink-100" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold leading-tight">
                SoulSelf Reflection ✨
              </h3>
              <p className="text-[11px] text-pink-100/90 font-sans">
                Secure multi-turn companion holding space for your thoughts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action / Context Bar */}
        <div className="px-4 py-2.5 bg-pink-50/70 border-b border-pink-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#7E6584] font-medium truncate">
            <FileText className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span className="truncate">"{entry.title || "Journal Entry"}"</span>
          </div>

          <button
            id="generate-summary-action-btn"
            onClick={handleGenerateSummary}
            disabled={isSummarizing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-purple-900 border border-pink-200 text-xs font-bold shadow-2xs hover:bg-pink-50 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-pink-500" />
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-pink-500" />
                <span>Create Summary ✨</span>
              </>
            )}
          </button>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border-b border-emerald-100 text-xs flex items-center gap-1.5 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Structured Summary Preview Banner if generated */}
        {generatedSummary && (
          <div className="px-4 py-3 bg-purple-50/90 border-b border-purple-100 max-h-48 overflow-y-auto shrink-0 text-xs">
            <div className="flex items-center justify-between font-bold text-purple-900 mb-1.5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Structured Reflection Summary
              </span>
              <div className="flex items-center gap-1">
                {generatedSummary.sentiment && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {generatedSummary.sentiment}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/70 text-purple-800">
                  {generatedSummary.emotionalTone}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-[#5A4360] text-[11px]">
              <div>
                <strong className="text-purple-950">Themes:</strong>{" "}
                {generatedSummary.mainThemes.join(", ")}
              </div>
              <div>
                <strong className="text-purple-950">Key Realizations:</strong>{" "}
                {generatedSummary.importantThoughts.join(" • ")}
              </div>
              <div>
                <strong className="text-emerald-900">What went well:</strong>{" "}
                {generatedSummary.whatWentWell.join(" • ")}
              </div>
              <div>
                <strong className="text-pink-900">Next Steps:</strong>{" "}
                {generatedSummary.possibleNextSteps.join(" • ")}
              </div>
            </div>
          </div>
        )}

        {/* Multi-turn Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-400 to-purple-400 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-br-xs"
                      : "bg-pink-50/90 text-[#4A3E4E] border border-pink-100/90 rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      isUser ? "text-pink-100" : "text-[#8B6E92]"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {userName ? userName.charAt(0) : "U"}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-2.5 items-center text-xs text-[#8B6E92] italic">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />
              </div>
              <span>SoulSelf is reflecting on your thoughts... 🌸</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick reflection suggestions */}
        <div className="px-4 py-2 bg-pink-50/40 border-t border-pink-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] text-pink-600 font-semibold shrink-0">Prompt:</span>
          {[
            "What can I learn from today? 🌱",
            "Help me celebrate small wins 🎉",
            "Suggest a peaceful evening ritual 🌙",
            "How can I reframe my challenges? 💜",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInputVal(prompt);
              }}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-pink-100 text-[10px] text-[#6E5474] border border-pink-200/60 shrink-0 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-pink-100 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Share your thoughts with SoulSelf..."
            className="flex-1 px-4 py-2.5 rounded-full bg-pink-50/60 border border-pink-200/80 text-xs sm:text-sm text-[#4A3E4E] placeholder:text-[#9E83A4] focus:outline-none focus:ring-2 focus:ring-pink-400"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || isSending}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white flex items-center justify-center disabled:opacity-40 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
