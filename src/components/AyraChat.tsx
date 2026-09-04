import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Heart,
  Send,
  BookOpen,
  Phone,
  PhoneCall,
  AlertCircle,
  HelpCircle,
  Clock,
  Plus,
  Trash2,
  Share2,
  Check,
  ChevronDown,
  Info,
  Shield,
  MessageCircle,
  CloudRain,
  Sprout,
  Brain,
  BookMarked,
  ArrowRight,
  X,
  ExternalLink,
  LifeBuoy,
  RefreshCw,
  Loader2,
  Edit3,
  Search,
} from "lucide-react";
import {
  AyraConversationMode,
  AyraMessage,
  AyraConversation,
  AyraJournalReflectionDraft,
  CrisisResourceInfo,
  JournalEntry,
} from "../types";
import { CRISIS_RESOURCES, getCrisisResourceForCountry, DEFAULT_CRISIS_COUNTRY } from "../data/crisisResources";
import { streamAyraChatMessage, sendAyraChatMessage, generateAyraJournalDraft } from "../services/geminiClient";
import {
  saveAyraConversationDoc,
  deleteAyraConversationDoc,
  subscribeToUserAyraConversations,
  saveJournalEntryDoc,
} from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";

interface AyraChatProps {
  userEntries: JournalEntry[];
  userName: string;
  onOpenJournalInWriter?: (entryDraft: Partial<JournalEntry>) => void;
  onBackToDashboard?: () => void;
}

const CONVERSATION_MODES: {
  id: AyraConversationMode;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
}[] = [
  {
    id: "just-talk",
    label: "Just Talk",
    emoji: "💬",
    tagline: "Casual conversation & companionship",
    description: "A relaxed, friendly chat about your day, interests, or whatever is on your mind.",
  },
  {
    id: "vent",
    label: "Let Me Vent",
    emoji: "☁️",
    tagline: "Listening without unsolicited advice",
    description: "AYRA holds space for you to let everything out without rushing to fix it.",
  },
  {
    id: "motivate",
    label: "Motivate Me",
    emoji: "🌱",
    tagline: "Encouraging, practical next steps",
    description: "Grounded encouragement to break down overwhelm into bite-sized 15-minute actions.",
  },
  {
    id: "think",
    label: "Help Me Think",
    emoji: "🧠",
    tagline: "Brainstorming & structured clarity",
    description: "Unravel tangled thoughts, clarify choices, and explore perspectives together.",
  },
  {
    id: "reflect",
    label: "Reflect With Me",
    emoji: "📖",
    tagline: "Mindful reflection & journaling",
    description: "Deepen your thoughts and optionally save our conversation as a private journal entry.",
  },
];

const MODE_PROMPT_SPARKS: Record<AyraConversationMode, string[]> = {
  "just-talk": [
    "How was your day so far? 🌸",
    "I had a strange thought today...",
    "Tell me something peaceful ✨",
    "I just need a cozy distraction",
  ],
  vent: [
    "Today has been completely draining 🌧️",
    "I feel like no one understands what I'm dealing with",
    "I'm feeling really anxious about something",
    "I just need to let this off my chest",
  ],
  motivate: [
    "I'm procrastinating on an important task 🌱",
    "Help me take just one small step today",
    "I'm feeling stuck and unmotivated",
    "How do I reset my focus for the evening?",
  ],
  think: [
    "Help me choose between two options 🧠",
    "My mind is totally tangled, help me sort it out",
    "I want to brainstorm a creative idea",
    "Help me look at this situation from another angle",
  ],
  reflect: [
    "Let's reflect on how this week went 📖",
    "What is a lesson I can take from today?",
    "I want to explore why I'm feeling this way",
    "Help me turn my thoughts into a journal entry",
  ],
};

const INITIAL_WELCOME_MESSAGE: AyraMessage = {
  id: "ayra-welcome",
  role: "ayra",
  content: `Hi, I'm AYRA 💜\n\nYou can talk to me about your day, your thoughts, your dreams, or whatever is on your mind.\n\nNo judgment. Just a little space to breathe, think, and talk.`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export const AyraChat: React.FC<AyraChatProps> = ({
  userEntries,
  userName,
  onOpenJournalInWriter,
  onBackToDashboard,
}) => {
  const { user } = useAuth();

  // Active Conversation State
  const [activeConversationId, setActiveConversationId] = useState<string>(() => `ayra-chat-${Date.now()}`);
  const [messages, setMessages] = useState<AyraMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [currentMode, setCurrentMode] = useState<AyraConversationMode>("just-talk");
  const [inputText, setInputText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<string>(DEFAULT_CRISIS_COUNTRY);
  const [includeJournalMemory, setIncludeJournalMemory] = useState<boolean>(false);

  // Firestore Saved Conversations
  const [savedConversations, setSavedConversations] = useState<AyraConversation[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");

  // Reflection / Save to Journal Modal
  const [showSaveJournalModal, setShowSaveJournalModal] = useState<boolean>(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);
  const [reflectionDraft, setReflectionDraft] = useState<AyraJournalReflectionDraft | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Safety & Crisis Banner Focus State
  const [isCrisisActive, setIsCrisisActive] = useState<boolean>(false);

  // Chat scroll container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to user's private AYRA conversations in Firestore
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserAyraConversations(user.uid, (convos) => {
      setSavedConversations(convos);
    });
    return () => unsubscribe();
  }, [user]);

  // Scroll to bottom on message update
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isSending]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  // Build Journal Context snippet if user requested "Reflect using my journal"
  const getJournalContextSnippet = (): string => {
    if (!includeJournalMemory || userEntries.length === 0) return "";
    return userEntries
      .slice(0, 4)
      .map(
        (e) =>
          `[Date: ${e.date} | Title: ${e.title || "Untitled"} | Mood: ${e.mood}] ${(e.content || "").slice(0, 250)}`
      )
      .join("\n---\n");
  };

  // Send Message Handler with Real-Time Streaming SSE
  const handleSendMessage = async (textToSend?: string) => {
    const rawContent = textToSend || inputText;
    const content = rawContent.trim();
    if (!content || isSending) return;

    if (!user) {
      // Show a clear error if user is not authenticated
      const authErrMsg: AyraMessage = {
        id: `ayra-err-${Date.now()}`,
        role: "ayra",
        content: `💜 It looks like you're not signed in. Please sign in to chat with AYRA.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: currentMode,
      };
      setMessages((prev) => [...prev, authErrMsg]);
      return;
    }

    const userMessage: AyraMessage = {
      id: `user-msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode: currentMode,
    };

    const nextMessagesWithUser = [...messages, userMessage];
    const ayraPlaceholderId = `ayra-msg-${Date.now()}`;

    // Update UI immediately with user message
    setMessages(nextMessagesWithUser);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsSending(true);
    setIsTyping(true);

    let streamBuffer = "";
    let isSafety = false;
    let safetyData: any = null;

    try {
      await streamAyraChatMessage({
        messages: nextMessagesWithUser,
        mode: currentMode,
        countryCode: selectedCountry,
        journalContext: getJournalContextSnippet(),
        userName: userName || user.displayName || "Friend",
        onChunk: (chunk) => {
          streamBuffer += chunk;
          setIsTyping(false);
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === ayraPlaceholderId);
            if (!exists) {
              const newAyraMsg: AyraMessage = {
                id: ayraPlaceholderId,
                role: "ayra",
                content: streamBuffer,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                mode: currentMode,
              };
              return [...prev, newAyraMsg];
            } else {
              return prev.map((m) =>
                m.id === ayraPlaceholderId ? { ...m, content: streamBuffer } : m
              );
            }
          });
        },
        onSafetyResponse: (safety) => {
          isSafety = true;
          safetyData = safety;
          setIsTyping(false);
          setIsCrisisActive(true);
          setMessages((prev) => {
            const safetyAyraMsg: AyraMessage = {
              id: ayraPlaceholderId,
              role: "ayra",
              content: safety.reply,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              mode: currentMode,
              isSafetyResponse: true,
              isAmbiguousClarification: safety.isAmbiguousClarification,
              isImminentDanger: safety.isImminentDanger,
              safetyQuestion: safety.safetyQuestion,
              actionOptions: safety.actionOptions,
              crisisResource: safety.crisisResource || getCrisisResourceForCountry(selectedCountry),
            };
            const filtered = prev.filter((m) => m.id !== ayraPlaceholderId);
            return [...filtered, safetyAyraMsg];
          });
        },
      });

      // Prepare final messages snapshot for Firestore persistence
      const finalAyraContent = isSafety && safetyData ? safetyData.reply : streamBuffer;
      if (finalAyraContent) {
        const finalAyraMessage: AyraMessage = {
          id: ayraPlaceholderId,
          role: "ayra",
          content: finalAyraContent,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          mode: currentMode,
          isSafetyResponse: isSafety,
          isAmbiguousClarification: safetyData?.isAmbiguousClarification,
          isImminentDanger: safetyData?.isImminentDanger,
          safetyQuestion: safetyData?.safetyQuestion,
          actionOptions: safetyData?.actionOptions,
          crisisResource: safetyData?.crisisResource || (isSafety ? getCrisisResourceForCountry(selectedCountry) : undefined),
        };

        const finalConversationMessages = [...nextMessagesWithUser, finalAyraMessage];

        const firstUserMsg = finalConversationMessages.find((m) => m.role === "user");
        const titleSnippet = firstUserMsg ? firstUserMsg.content.slice(0, 36).trim() : `Talk with AYRA`;

        const conversationDoc: AyraConversation = {
          id: activeConversationId,
          userId: user.uid,
          title: titleSnippet.length > 33 ? `${titleSnippet}...` : titleSnippet,
          mode: currentMode,
          messages: finalConversationMessages,
          isCrisisActive: isSafety,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveAyraConversationDoc(user.uid, conversationDoc);
      }
    } catch (err: any) {
      console.error("Failed to send message to AYRA:", err);
      const errDetail = err?.message?.includes("401") || err?.message?.includes("Authentication")
        ? "It looks like your session expired. Please refresh the page and sign in again."
        : err?.message?.includes("429")
        ? "You're sending messages too quickly. Please wait a moment and try again."
        : "I had a small connection pause 💜. Please try again in a moment.";
      const fallbackAyraMessage: AyraMessage = {
        id: `ayra-err-${Date.now()}`,
        role: "ayra",
        content: `${errDetail}\n\nWhat was on your mind?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: currentMode,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== ayraPlaceholderId), fallbackAyraMessage]);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  // Start a fresh new chat session
  const handleStartNewChat = (mode?: AyraConversationMode) => {
    const newId = `ayra-chat-${Date.now()}`;
    setActiveConversationId(newId);
    const welcome = {
      ...INITIAL_WELCOME_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
    if (mode) setCurrentMode(mode);
    setIsCrisisActive(false);
    setIsTyping(false);
    setIsSending(false);
    setShowHistoryDrawer(false);
  };

  // Load a saved conversation from history
  const handleLoadConversation = (convo: AyraConversation) => {
    setActiveConversationId(convo.id);
    setMessages(convo.messages.length > 0 ? convo.messages : [INITIAL_WELCOME_MESSAGE]);
    setCurrentMode(convo.mode || "just-talk");
    setIsCrisisActive(!!convo.isCrisisActive);
    setShowHistoryDrawer(false);
  };

  // Delete a saved conversation
  const handleDeleteConversation = async (convoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await deleteAyraConversationDoc(user.uid, convoId);
    if (activeConversationId === convoId) {
      handleStartNewChat();
    }
  };

  // Trigger Save to Journal Draft Generation
  const handleOpenSaveJournalModal = async () => {
    setShowSaveJournalModal(true);
    setIsGeneratingDraft(true);

    try {
      const { draft } = await generateAyraJournalDraft({
        messages: messages.filter((m) => m.id !== "ayra-welcome"),
        userName,
      });
      setReflectionDraft(draft);
    } catch (err) {
      console.error("Draft generation error:", err);
      setReflectionDraft({
        title: "Reflection with AYRA 💜",
        mainThoughts: "Shared thoughts and feelings openly during a quiet moment of reflection today.",
        whatIRealized: "Taking time to pause and reflect brings clarity and inner peace.",
        nextStep: "Carry this quiet mindfulness forward into tomorrow.",
        emotion: "Reflective",
        categories: ["Personal", "Reflection"],
      });
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Direct Save to Firestore Journal
  const handleConfirmSaveToJournal = async () => {
    if (!user || !reflectionDraft) return;

    const newJournalEntry: JournalEntry = {
      id: `journal-from-ayra-${Date.now()}`,
      userId: user.uid,
      title: reflectionDraft.title || "Reflection with AYRA 💜",
      content: `### Main Thoughts\n${reflectionDraft.mainThoughts}\n\n### What I Realized\n${reflectionDraft.whatIRealized}\n\n### Next Step\n${reflectionDraft.nextStep}`,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mood: "Calm",
      moodEmoji: "💜",
      weather: "🌤️ Clear",
      categories: reflectionDraft.categories || ["Personal", "Reflection"],
      tags: ["AYRA", "Reflection", reflectionDraft.emotion].filter(Boolean),
      wordCount: (reflectionDraft.mainThoughts + reflectionDraft.whatIRealized + reflectionDraft.nextStep).split(/\s+/)
        .length,
      stickers: [
        { id: "st-ayra-1", emoji: "💜", x: 88, y: 15, scale: 1.3, rotation: 8 },
        { id: "st-ayra-2", emoji: "✨", x: 85, y: 80, scale: 1.1, rotation: -6 },
      ],
      isFavorite: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveJournalEntryDoc(user.uid, newJournalEntry);
    setSaveSuccessNotice("Saved to your private SoulSelf journal 🌸");
    setTimeout(() => {
      setShowSaveJournalModal(false);
      setSaveSuccessNotice(null);
    }, 1800);
  };

  // Open Draft in Full Diary Writer (for stickers, custom styles, photos)
  const handleOpenDraftInWriter = () => {
    if (!reflectionDraft) return;
    setShowSaveJournalModal(false);

    if (onOpenJournalInWriter) {
      onOpenJournalInWriter({
        title: reflectionDraft.title || "Reflection with AYRA 💜",
        content: `### Main Thoughts\n${reflectionDraft.mainThoughts}\n\n### What I Realized\n${reflectionDraft.whatIRealized}\n\n### Next Step\n${reflectionDraft.nextStep}`,
        mood: "Calm",
        moodEmoji: "💜",
        categories: reflectionDraft.categories || ["Personal", "Reflection"],
        tags: ["AYRA", "Reflection", reflectionDraft.emotion],
      });
    }
  };

  const activeModeObj = CONVERSATION_MODES.find((m) => m.id === currentMode) || CONVERSATION_MODES[0];
  const currentSparks = MODE_PROMPT_SPARKS[currentMode] || MODE_PROMPT_SPARKS["just-talk"];
  const isOnlyWelcomeMessage = messages.length === 1 && messages[0].id === "ayra-welcome";

  // Filtered conversations for history drawer
  const filteredConversations = savedConversations.filter((c) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  // isTyping is explicitly controlled: true when waiting for first chunk, false once streaming starts
  const isPendingAyraFirstChunk = isTyping;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-gradient-to-b from-[#FFF5F8]/70 via-[#FAF7F9] to-[#F5F0F8]/80 rounded-[36px] border border-pink-200/70 shadow-sm overflow-hidden relative">
      {/* 1. Header Toolbar */}
      <header className="px-4 sm:px-6 py-3.5 bg-white/85 backdrop-blur-md border-b border-pink-100 flex items-center justify-between gap-3 shrink-0 z-10">
        {/* Left Identity info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-400 text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
              💜
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold text-purple-950 tracking-tight flex items-center gap-1.5">
                <span>AYRA</span>
                <span className="text-[10px] uppercase font-sans font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100/80 text-purple-800 border border-purple-200/50">
                  AI Companion
                </span>
              </h2>
            </div>
            <p className="text-xs text-purple-900/60 font-serif italic line-clamp-1">
              {isCrisisActive
                ? "Here with you • Compassionate & Safe Support"
                : activeModeObj.tagline}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Reflect Using My Journal Context Toggle */}
          <button
            id="ayra-toggle-journal-memory-btn"
            onClick={() => setIncludeJournalMemory(!includeJournalMemory)}
            title={
              includeJournalMemory
                ? "Reflecting using your private journal memory (Active)"
                : "Allow AYRA to reflect using recent journal topics"
            }
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              includeJournalMemory
                ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs font-bold"
                : "bg-white/80 hover:bg-pink-50 text-purple-900/70 border border-pink-200/60"
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden md:inline">
              {includeJournalMemory ? "Journal Memory On ✨" : "Journal Memory"}
            </span>
          </button>

          {/* Save to Journal Button (Active when user has had a conversation) */}
          {messages.length > 2 && (
            <button
              id="ayra-save-to-journal-cta-btn"
              onClick={handleOpenSaveJournalModal}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-pink-50 text-purple-950 border border-pink-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer hover:border-pink-400"
            >
              <BookOpen className="w-3.5 h-3.5 text-pink-600" />
              <span className="hidden sm:inline">Save as Journal</span>
            </button>
          )}

          {/* New Chat Button */}
          <button
            id="ayra-new-chat-btn"
            onClick={() => handleStartNewChat()}
            title="Start a new conversation with AYRA"
            className="p-2 rounded-full bg-white hover:bg-pink-50 text-purple-900/80 border border-pink-200 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-700" />
          </button>

          {/* History Drawer Toggle Button */}
          <button
            id="ayra-history-drawer-btn"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            title="View saved conversations"
            className="p-2 rounded-full bg-white hover:bg-pink-50 text-purple-900/80 border border-pink-200 transition-colors cursor-pointer relative"
          >
            <Clock className="w-4 h-4 text-purple-700" />
            {savedConversations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">
                {savedConversations.length}
              </span>
            )}
          </button>

          {/* Close/Back Button */}
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              title="Return to Dashboard"
              className="p-2 rounded-full text-purple-400 hover:text-purple-950 hover:bg-pink-100/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Conversation Mode Strip */}
      {!isCrisisActive && (
        <div className="px-4 sm:px-6 py-2.5 bg-[#FFF9FB]/90 border-b border-pink-100/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 z-0">
          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-900/50 mr-1 hidden sm:inline">
            Mode:
          </span>
          {CONVERSATION_MODES.map((mode) => {
            const isSelected = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setCurrentMode(mode.id)}
                title={mode.description}
                className={`px-3 py-1.5 rounded-full text-xs font-serif font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white shadow-xs scale-102"
                    : "bg-white/80 hover:bg-pink-100/60 text-purple-900/80 border border-pink-200/50"
                }`}
              >
                <span>{mode.emoji}</span>
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Safety Notice Bar during Active Crisis Support */}
      {isCrisisActive && (
        <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-purple-100 via-pink-50 to-purple-100 border-b border-pink-300 text-purple-950 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 font-serif">
            <Heart className="w-4 h-4 text-pink-600 fill-pink-500 shrink-0" />
            <span>
              <strong>Tele-MANAS Support Active:</strong> Free, confidential 24×7 help is available anytime.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:14416"
              className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Call 14416</span>
            </a>
            <a
              href="tel:112"
              className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Emergency 112</span>
            </a>
          </div>
        </div>
      )}

      {/* 4. Chat Messages Scroll Area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="AYRA conversation history"
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scrollbar-thin"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-in fade-in duration-200`}
            >
              <div className={`flex gap-2.5 max-w-[90%] sm:max-w-[82%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar Icon */}
                {!isUser ? (
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-400 text-white flex items-center justify-center text-sm shadow-xs shrink-0 mt-1">
                    💜
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-2xl bg-pink-600 text-white flex items-center justify-center text-xs font-serif font-bold shadow-xs shrink-0 mt-1">
                    {userName.charAt(0) || "U"}
                  </div>
                )}

                {/* Message Bubble Content */}
                <div
                  className={`rounded-3xl p-4 sm:p-5 shadow-sm text-sm sm:text-base leading-relaxed ${
                    isUser
                      ? "bg-pink-600 text-white rounded-tr-xs"
                      : message.isSafetyResponse
                      ? "bg-gradient-to-br from-[#FFF5F8] via-white to-purple-50/80 border border-pink-300 text-purple-950 rounded-tl-xs ring-1 ring-pink-200"
                      : "bg-white/95 border border-pink-200/80 text-purple-950 rounded-tl-xs"
                  }`}
                >
                  {/* Sender Name & Timestamp */}
                  <div className="flex items-center justify-between gap-4 mb-1.5 text-[11px] opacity-70 font-serif">
                    <span className="font-bold">{isUser ? "You" : "AYRA 💜"}</span>
                    <span>{message.timestamp}</span>
                  </div>

                  {/* Body Text */}
                  <div className="whitespace-pre-wrap font-serif text-[14px] sm:text-[15px] text-inherit leading-relaxed">
                    {message.content}
                  </div>

                  {/* Dedicated Crisis / Safety Resource Box */}
                  {message.isSafetyResponse && message.crisisResource && (
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-tr from-purple-50 via-pink-50 to-rose-50 border border-pink-200 text-purple-950 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🇮🇳</span>
                          <div>
                            <div className="font-serif font-bold text-sm text-purple-950">
                              {message.crisisResource.primaryServiceName}
                            </div>
                            <div className="text-[11px] text-purple-900/60 font-serif">
                              {message.crisisResource.organization}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-200/80 text-pink-800 px-2 py-0.5 rounded-full">
                          24×7 Free Support
                        </span>
                      </div>

                      <p className="text-xs text-purple-900/80 font-serif leading-normal">
                        {message.crisisResource.description}
                      </p>

                      {/* Primary Phone Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {message.crisisResource.phoneNumbers.map((phone) => (
                          <a
                            key={phone}
                            href={`tel:${phone.replace(/[^0-9]/g, "")}`}
                            className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call {phone}</span>
                          </a>
                        ))}

                        <a
                          href={`tel:${message.crisisResource.emergencyNumber}`}
                          className="px-3.5 py-2 rounded-xl bg-pink-700 hover:bg-pink-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Emergency ({message.crisisResource.emergencyNumber})</span>
                        </a>
                      </div>

                      {/* Safety Question Prompt */}
                      {message.safetyQuestion && (
                        <div className="pt-2 border-t border-pink-200/70 text-xs font-serif italic text-purple-900">
                          {message.safetyQuestion}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Quick Action Response Chips */}
                  {message.actionOptions && message.actionOptions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-pink-100">
                      {message.actionOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleSendMessage(opt)}
                          className="px-3 py-1.5 rounded-full text-xs font-serif bg-pink-50 hover:bg-pink-100 text-purple-950 border border-pink-200 transition-colors cursor-pointer hover:border-pink-300 font-medium"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Real Typing Indicator (Shown while waiting for stream or first token) */}
        {isPendingAyraFirstChunk && (
          <div className="flex items-center gap-2.5 animate-in fade-in text-purple-900/60 text-xs font-serif italic pl-2">
            <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center text-xs">
              💜
            </div>
            <div className="flex items-center gap-1.5 bg-white px-4 py-2.5 rounded-full border border-pink-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.45s]" />
              <span className="ml-1 text-purple-950 font-sans text-xs font-medium">AYRA is thinking...</span>
            </div>
          </div>
        )}

        {/* Mode Conversation Sparks (Shown when chat is new) */}
        {isOnlyWelcomeMessage && (
          <div className="pt-4 pb-2 px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-[11px] font-bold font-serif uppercase tracking-wider text-purple-900/50 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-pink-500" />
              <span>Suggested prompts for {activeModeObj.label}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentSparks.map((spark, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(spark)}
                  className="px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-pink-100/70 text-purple-950 text-xs font-serif border border-pink-200/80 shadow-2xs hover:border-pink-300 transition-all hover:scale-101 cursor-pointer text-left"
                >
                  {spark}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Input Textarea Area */}
      <footer className="p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-pink-200/70 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative flex items-end gap-2 bg-pink-50/50 rounded-2xl sm:rounded-3xl border border-pink-200 p-2 focus-within:ring-2 focus-within:ring-pink-300/60 focus-within:border-pink-300 transition-all bg-white">
            <textarea
              ref={textareaRef}
              id="ayra-message-input"
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isCrisisActive
                  ? "Talk to AYRA, or tap any support button above..."
                  : `Talk to AYRA (${activeModeObj.label})... (Shift+Enter for newline)`
              }
              aria-label="Talk to AYRA"
              className="flex-1 bg-transparent border-0 outline-none resize-none px-3 py-1.5 text-sm sm:text-base font-serif text-purple-950 placeholder:text-purple-900/40 min-h-[38px] max-h-[140px]"
            />

            <button
              type="submit"
              id="ayra-send-btn"
              disabled={!inputText.trim() || isSending}
              aria-label="Send message to AYRA"
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 ${
                inputText.trim() && !isSending
                  ? "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white hover:scale-102 active:scale-98"
                  : "bg-pink-100 text-pink-400 cursor-not-allowed opacity-60"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-purple-900/50 px-2 font-serif">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-pink-500" />
              <span>Private & confidential to your account • Non-clinical AI companion</span>
            </span>

            {isCrisisActive && (
              <span className="text-pink-600 font-bold">
                In distress? Call Tele-MANAS (14416)
              </span>
            )}
          </div>
        </form>
      </footer>

      {/* 6. Saved Conversations History Drawer */}
      {showHistoryDrawer && (
        <div className="absolute inset-0 bg-pink-950/20 backdrop-blur-xs z-30 flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-5 flex flex-col border-l border-pink-200 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="font-serif font-bold text-base text-purple-950">
                  Saved Conversations
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 rounded-full text-purple-400 hover:text-purple-900 hover:bg-pink-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter for past conversations */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-pink-200 font-serif text-xs text-purple-950 placeholder:text-purple-400 focus:outline-pink-400"
              />
            </div>

            <button
              onClick={() => handleStartNewChat()}
              className="w-full py-2.5 mb-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start New Conversation</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-xs text-purple-900/50 font-serif italic">
                  {historySearchQuery
                    ? "No matching conversations found."
                    : "No saved conversations yet. Your talks with AYRA will appear here."}
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const isCurrent = convo.id === activeConversationId;
                  const modeObj = CONVERSATION_MODES.find((m) => m.id === convo.mode);

                  return (
                    <div
                      key={convo.id}
                      onClick={() => handleLoadConversation(convo)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer group flex items-center justify-between ${
                        isCurrent
                          ? "bg-pink-100/70 border-pink-400 ring-1 ring-pink-300"
                          : "bg-pink-50/40 border-pink-100 hover:bg-pink-50 hover:border-pink-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-serif font-bold text-xs text-purple-950 truncate flex items-center gap-1.5">
                          <span>{modeObj?.emoji || "💜"}</span>
                          <span className="truncate">{convo.title}</span>
                        </div>
                        <div className="text-[10px] text-purple-900/60 font-serif flex items-center gap-2 mt-0.5">
                          <span>{new Date(convo.updatedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{convo.messages.length} messages</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteConversation(convo.id, e)}
                        title="Delete conversation"
                        className="p-1.5 rounded-full text-purple-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Save as Journal Modal / Reflection Review */}
      {showSaveJournalModal && (
        <div className="absolute inset-0 bg-pink-950/30 backdrop-blur-xs z-40 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pink-200 max-h-[90vh] overflow-y-auto flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-purple-950">
                    Save as Journal Entry
                  </h3>
                  <p className="text-xs text-purple-900/60 font-serif">
                    Review and edit your reflection before saving
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSaveJournalModal(false)}
                className="p-1.5 rounded-full text-purple-400 hover:text-purple-900 hover:bg-pink-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isGeneratingDraft ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                <p className="font-serif text-sm text-purple-950 font-bold">
                  AYRA is crafting your reflection summary...
                </p>
                <p className="text-xs text-purple-900/60 font-serif italic">
                  Distilling insights, realizations, and next steps 🌸
                </p>
              </div>
            ) : reflectionDraft ? (
              <div className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/70 mb-1">
                    Journal Title
                  </label>
                  <input
                    type="text"
                    value={reflectionDraft.title}
                    onChange={(e) =>
                      setReflectionDraft({ ...reflectionDraft, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-serif font-bold text-sm text-purple-950 focus:outline-pink-400"
                  />
                </div>

                {/* Main Thoughts */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/70 mb-1">
                    Main Thoughts
                  </label>
                  <textarea
                    rows={3}
                    value={reflectionDraft.mainThoughts}
                    onChange={(e) =>
                      setReflectionDraft({ ...reflectionDraft, mainThoughts: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-serif text-xs sm:text-sm text-purple-950 focus:outline-pink-400"
                  />
                </div>

                {/* What I Realized */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/70 mb-1">
                    What I Realized
                  </label>
                  <textarea
                    rows={2}
                    value={reflectionDraft.whatIRealized}
                    onChange={(e) =>
                      setReflectionDraft({ ...reflectionDraft, whatIRealized: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-serif text-xs sm:text-sm text-purple-950 focus:outline-pink-400"
                  />
                </div>

                {/* Next Step */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/70 mb-1">
                    Next Step
                  </label>
                  <input
                    type="text"
                    value={reflectionDraft.nextStep}
                    onChange={(e) =>
                      setReflectionDraft({ ...reflectionDraft, nextStep: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-serif text-xs sm:text-sm text-purple-950 focus:outline-pink-400"
                  />
                </div>

                {/* Emotion & Categories */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/70 mb-1">
                      Emotion Tone
                    </label>
                    <input
                      type="text"
                      value={reflectionDraft.emotion}
                      onChange={(e) =>
                        setReflectionDraft({ ...reflectionDraft, emotion: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-pink-200 font-serif text-xs text-purple-950 focus:outline-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/70 mb-1">
                      Categories
                    </label>
                    <input
                      type="text"
                      value={reflectionDraft.categories.join(", ")}
                      onChange={(e) =>
                        setReflectionDraft({
                          ...reflectionDraft,
                          categories: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-pink-200 font-serif text-xs text-purple-950 focus:outline-pink-400"
                    />
                  </div>
                </div>

                {/* Success Banner */}
                {saveSuccessNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{saveSuccessNotice}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handleConfirmSaveToJournal}
                    className="flex-1 py-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Save to Private Journal</span>
                  </button>

                  {onOpenJournalInWriter && (
                    <button
                      onClick={handleOpenDraftInWriter}
                      className="py-2.5 px-4 rounded-full bg-pink-100 hover:bg-pink-200 text-purple-950 font-bold text-xs flex items-center justify-center gap-1.5 border border-pink-300 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-pink-700" />
                      <span>Open in Diary Writer</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
