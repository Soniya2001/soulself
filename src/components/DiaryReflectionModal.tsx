import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Compass,
  MessageSquare,
} from "lucide-react";
import { JournalEntry, ContextualReflectionMessage } from "../types";
import { sendDiaryReflectionMessage } from "../services/geminiClient";
import { AIContextBuilder, AIErrorHandler } from "../services/aiOrchestrator";

interface DiaryReflectionModalProps {
  entry: JournalEntry;
  userName: string;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  "Help me understand this 💭",
  "What am I really trying to say? ✨",
  "Help me brainstorm ideas 🧠",
  "What themes do you notice? 🌸",
  "Give me another perspective 💡",
];

export const DiaryReflectionModal: React.FC<DiaryReflectionModalProps> = ({
  entry,
  userName,
  onClose,
}) => {
  const [messages, setMessages] = useState<ContextualReflectionMessage[]>([
    {
      id: "init-1",
      role: "agent",
      content: `I'm holding space for your journal entry "${entry.title || "Untitled"}" 📖. What would you like to reflect on or explore deeper?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isSending) return;

    const userMsg: ContextualReflectionMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setErrorNotice(null);

    try {
      const entryContext = AIContextBuilder.buildDiaryContext(entry);
      const res = await sendDiaryReflectionMessage({
        entryContext,
        messages: nextMessages,
        userName,
      });

      const agentMsg: ContextualReflectionMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error("Diary reflection error:", err);
      setErrorNotice(AIErrorHandler.formatUserFacingError(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-purple-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl border border-pink-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 border-b border-pink-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-pink-600 shadow-xs border border-pink-200 flex items-center justify-center text-xl">
              📖
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-pink-700 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diary Reflection Agent</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-purple-950 line-clamp-1">
                "{entry.title || "Untitled Entry"}"
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-purple-900/60 hover:text-purple-950 hover:bg-pink-100/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 font-serif text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-3xl ${
                  m.role === "user"
                    ? "bg-pink-600 text-white shadow-sm"
                    : "bg-gradient-to-br from-pink-50/80 to-purple-50/80 text-purple-950 border border-pink-200/60 shadow-2xs"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
              <span className="text-[10px] text-purple-900/40 font-mono mt-1 px-2">
                {m.timestamp}
              </span>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-pink-600 font-serif italic py-2">
              <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
              <span>Thinking with you...</span>
            </div>
          )}

          {errorNotice && (
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs font-sans border border-rose-200 text-center">
              {errorNotice}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 bg-pink-50/50 border-t border-pink-100 flex items-center gap-1.5 overflow-x-auto">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={isSending}
              className="px-3 py-1 rounded-full bg-white hover:bg-pink-100 text-xs text-purple-950 font-serif border border-pink-200/80 whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Footer Input */}
        <div className="p-4 bg-white border-t border-pink-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a reflective question about this entry..."
            className="flex-1 px-4 py-3 rounded-full bg-pink-50/40 border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-xs text-purple-950 placeholder:text-purple-900/40 font-serif"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className="w-10 h-10 rounded-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
