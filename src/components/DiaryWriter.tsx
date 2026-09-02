import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Sparkles,
  Save,
  Smile,
  Calendar,
  Clock,
  CloudSun,
  Palette,
  Type,
  AlignLeft,
  Check,
  Heart,
  History,
  Trash2,
  Share2,
  BookHeart,
  MapPin,
  Tag,
  Pin,
  Image as ImageIcon,
  Plus,
  Compass,
  RotateCcw,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  JournalEntry,
  MoodType,
  StickerPlacement,
  StructuredSummary,
  JournalLocation,
  JournalMedia,
} from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { StickerDrawer } from "./StickerDrawer";
import { GeminiReflectModal } from "./GeminiReflectModal";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { GeminiCategorySuggestModal } from "./GeminiCategorySuggestModal";
import { DEFAULT_CATEGORIES, POPULAR_LOCATIONS } from "../data/initialData";
import {
  resolveLocationFromName,
  detectCurrentLocation,
  getSavedPreferredLocation,
  savePreferredLocation,
} from "../utils/location";
import { suggestJournalCategories } from "../services/geminiClient";
import { audioManager } from "../utils/audio";
import { AmbientSoundControl } from "./AmbientSoundControl";
import { Loader2, Navigation } from "lucide-react";
import { ambientEngine } from "../utils/ambientAudio";

interface DiaryWriterProps {
  initialEntry?: JournalEntry | null;
  userName: string;
  allEntries: JournalEntry[];
  onSaveEntry: (entry: JournalEntry) => void;
  onBackToDashboard: () => void;
  onSelectOtherEntry: (entry: JournalEntry) => void;
}

const MOODS: { type: MoodType; emoji: string; label: string }[] = [
  { type: "Happy", emoji: "😊", label: "Happy" },
  { type: "Calm", emoji: "🌿", label: "Calm" },
  { type: "Excited", emoji: "✨", label: "Excited" },
  { type: "Neutral", emoji: "💭", label: "Neutral" },
  { type: "Tired", emoji: "💤", label: "Tired" },
  { type: "Worried", emoji: "🌧️", label: "Worried" },
  { type: "Sad", emoji: "💧", label: "Sad" },
  { type: "Frustrated", emoji: "⚡", label: "Frustrated" },
];

const WEATHERS = ["🌤️ Mild Sun", "☀️ Warm", "🍃 Breezy", "🌧️ Rain", "🌙 Night", "☁️ Overcast"];

export const DiaryWriter: React.FC<DiaryWriterProps> = ({
  initialEntry,
  userName,
  allEntries,
  onSaveEntry,
  onBackToDashboard,
  onSelectOtherEntry,
}) => {
  // Form State
  const [id] = useState(initialEntry?.id || `entry-${Date.now()}`);
  const [title, setTitle] = useState(initialEntry?.title || "");
  const [content, setContent] = useState(initialEntry?.content || "");
  const [date, setDate] = useState(
    initialEntry?.date || new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState(
    initialEntry?.time ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const [mood, setMood] = useState<MoodType>(initialEntry?.mood || "Happy");
  const [moodEmoji, setMoodEmoji] = useState(initialEntry?.moodEmoji || "😊");
  const [weather, setWeather] = useState(initialEntry?.weather || "🌤️ Mild Sun");
  const [categories, setCategories] = useState<string[]>(
    initialEntry?.categories || ["Personal"]
  );
  const [location, setLocation] = useState<JournalLocation | undefined>(
    initialEntry?.location || undefined
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [media, setMedia] = useState<JournalMedia[]>(initialEntry?.media || []);
  const [stickers, setStickers] = useState<StickerPlacement[]>(
    initialEntry?.stickers || []
  );
  const [summary, setSummary] = useState<StructuredSummary | undefined>(
    initialEntry?.summary
  );
  const [isFavorite, setIsFavorite] = useState(initialEntry?.isFavorite || false);
  const [isPinned, setIsPinned] = useState(initialEntry?.isPinned || false);

  // Custom Categories list
  const [customCategories, setCustomCategories] = useState<string[]>(["🌱 Morning Pages", "🍵 Tea Thoughts"]);

  // Stylistic Options
  const [fontFamily, setFontFamily] = useState<"handwriting" | "serif" | "sans">(
    "serif"
  );
  const [fontSize, setFontSize] = useState<number>(18);
  const [isLinedPaper, setIsLinedPaper] = useState<boolean>(true);

  // Modals & Panels
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSuggestCategoryModalOpen, setIsSuggestCategoryModalOpen] = useState(false);
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [geminiSuggestions, setGeminiSuggestions] = useState<string[]>([]);
  const [geminiReasoning, setGeminiReasoning] = useState<string>("");
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [customLocationName, setCustomLocationName] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Sticker undo history & toast notification
  const [stickerHistory, setStickerHistory] = useState<StickerPlacement[][]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; onUndo?: () => void } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (text: string, onUndo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, onUndo });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const paperRef = useRef<HTMLDivElement>(null);
  const autosaveTimeoutRef = useRef<any>(null);

  // Gracefully fade out ambient audio when leaving diary writer (unless persistent playback is enabled)
  useEffect(() => {
    return () => {
      if (!ambientEngine.isPersistentPlayback()) {
        ambientEngine.pause(1.2);
      }
    };
  }, []);

  // Word count calculation
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Autosave mechanism
  const triggerAutosave = () => {
    setSaveStatus("saving");
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(() => {
      const updatedEntry: JournalEntry = {
        id,
        title: title || "Untitled Memory",
        content,
        date,
        time,
        mood,
        moodEmoji,
        weather,
        categories,
        location,
        media,
        stickers,
        tags: ["Diary", mood, ...categories],
        summary,
        wordCount,
        isFavorite,
        isPinned,
        createdAt: initialEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveEntry(updatedEntry);
      setSaveStatus("saved");
    }, 800);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    triggerAutosave();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    triggerAutosave();
  };

  const toggleCategory = (catName: string) => {
    let next: string[];
    if (categories.includes(catName)) {
      next = categories.filter((c) => c !== catName);
    } else {
      next = [...categories, catName];
    }
    setCategories(next);
    triggerAutosave();
  };

  const handleAddCustomCategory = (name: string) => {
    if (!customCategories.includes(name)) {
      setCustomCategories([...customCategories, name]);
    }
    if (!categories.includes(name)) {
      setCategories([...categories, name]);
    }
    triggerAutosave();
  };

  const handleRemoveCustomCategory = (name: string) => {
    setCustomCategories(customCategories.filter((c) => c !== name));
    setCategories(categories.filter((c) => c !== name));
    triggerAutosave();
  };

  const handleAskGeminiForCategories = async () => {
    setIsSuggestingCategories(true);
    try {
      const allAvailable = [
        ...DEFAULT_CATEGORIES.map((c) => c.name),
        ...customCategories,
      ];
      const result = await suggestJournalCategories(
        title,
        content,
        location,
        allAvailable
      );
      setGeminiSuggestions(result.suggestedCategories || []);
      setGeminiReasoning(result.reasoning || "");
      setIsSuggestCategoryModalOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggestingCategories(false);
    }
  };

  const handleAddMedia = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const newMediaItem: JournalMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          url: e.target.result as string,
          type: "image",
          caption: "A special moment",
          importedAt: new Date().toISOString(),
        };
        const nextMedia = [...media, newMediaItem];
        setMedia(nextMedia);
        triggerAutosave();
        audioManager.playSparkleChime();
        showToast("Photo added to page!", () => {
          setMedia(media);
          triggerAutosave();
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (mediaId: string) => {
    const removedItem = media.find((m) => m.id === mediaId);
    const nextMedia = media.filter((m) => m.id !== mediaId);
    setMedia(nextMedia);
    triggerAutosave();
    audioManager.playGentleTap();

    if (removedItem) {
      showToast("Photo removed", () => {
        setMedia([...nextMedia, removedItem]);
        triggerAutosave();
      });
    }
  };

  const handleSelectPopularLocation = (loc: JournalLocation) => {
    setLocation(loc);
    savePreferredLocation(loc);
    setIsLocationSelectorOpen(false);
    triggerAutosave();
    audioManager.playGentleTap();
  };

  const handleDetectUserLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const detected = await detectCurrentLocation();
      setLocation(detected);
      savePreferredLocation(detected);
      setIsLocationSelectorOpen(false);
      triggerAutosave();
      audioManager.playSparkleChime();
      showToast(`Location set to ${detected.name} 📍`);
    } catch (err) {
      console.warn("Could not detect location:", err);
      showToast("Could not access GPS. Please type your city name below.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleCustomLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLocationName.trim()) return;
    const newLoc = resolveLocationFromName(customLocationName.trim());
    setLocation(newLoc);
    savePreferredLocation(newLoc);
    setCustomLocationName("");
    setIsLocationSelectorOpen(false);
    triggerAutosave();
    audioManager.playGentleTap();
    showToast(`Location set to ${newLoc.name} 🌍`);
  };

  const handleClearLocation = () => {
    setLocation(undefined);
    setIsLocationSelectorOpen(false);
    triggerAutosave();
    audioManager.playGentleTap();
    showToast("Location removed from entry");
  };

  const handleAddSticker = (emoji: string) => {
    setStickerHistory((prev) => [...prev, stickers]);
    const newSticker: StickerPlacement = {
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      emoji,
      x: 75 + Math.random() * 15,
      y: 20 + Math.random() * 40,
      scale: 1.2,
      rotation: Math.round(Math.random() * 30 - 15),
    };
    const nextStickers = [...stickers, newSticker];
    setStickers(nextStickers);
    audioManager.playSparkleChime();
    triggerAutosave();
    showToast("Sticker placed!", () => handleUndoSticker());
  };

  const handleUpdateSticker = (updated: StickerPlacement) => {
    setStickerHistory((prev) => [...prev, stickers]);
    const nextStickers = stickers.map((s) => (s.id === updated.id ? updated : s));
    setStickers(nextStickers);
    triggerAutosave();
  };

  const handleRemoveSticker = (stickerId: string) => {
    const removedItem = stickers.find((s) => s.id === stickerId);
    setStickerHistory((prev) => [...prev, stickers]);
    const nextStickers = stickers.filter((s) => s.id !== stickerId);
    setStickers(nextStickers);
    triggerAutosave();
    showToast(`Sticker ${removedItem?.emoji || ""} removed`, () => {
      if (removedItem) {
        setStickers([...nextStickers, removedItem]);
        triggerAutosave();
      }
    });
  };

  const handleUndoSticker = () => {
    if (stickerHistory.length === 0) return;
    const previous = stickerHistory[stickerHistory.length - 1];
    setStickerHistory((prev) => prev.slice(0, -1));
    setStickers(previous);
    triggerAutosave();
    audioManager.playGentleTap();
    showToast("Sticker action undone ↺");
  };

  const handleClearAllStickers = () => {
    if (stickers.length === 0) return;
    const current = [...stickers];
    setStickerHistory((prev) => [...prev, current]);
    setStickers([]);
    triggerAutosave();
    audioManager.playGentleTap();
    showToast("All stickers cleared", () => {
      setStickers(current);
      triggerAutosave();
    });
  };

  const handleManualSave = () => {
    const finalEntry: JournalEntry = {
      id,
      title: title || "Untitled Memory",
      content,
      date,
      time,
      mood,
      moodEmoji,
      weather,
      categories,
      location,
      media,
      stickers,
      tags: ["Diary", mood, ...categories],
      summary,
      wordCount,
      isFavorite,
      isPinned,
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveEntry(finalEntry);
    setSaveStatus("saved");
    audioManager.playSaveChime();

    // Trigger sweet gentle confetti
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#EC4899", "#C084FC", "#F472B6", "#FED7AA"],
    });
  };

  return (
    <div
      id="digital-diary-writing-page"
      className="min-h-screen bg-gradient-to-b from-[#FAF1F6] via-[#FDF5F8] to-[#F5EAF7] pb-24"
    >
      {/* Top Floating Action Bar */}
      <div className="sticky top-0 z-40 glass-panel border-b border-pink-200/80 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back to Home button */}
          <button
            id="writer-back-home-btn"
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-pink-50 text-xs sm:text-sm font-medium text-[#5B3E60] border border-pink-200/70 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home • Dashboard</span>
          </button>

          {/* Center Autosave & Status */}
          <div className="flex items-center gap-2 text-xs text-[#7E6584]">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === "saved"
                  ? "bg-emerald-400"
                  : saveStatus === "saving"
                  ? "bg-amber-400 animate-ping"
                  : "bg-pink-400"
              }`}
            />
            <span className="hidden sm:inline">
              {saveStatus === "saved"
                ? "Autosaved to diary 🌸"
                : saveStatus === "saving"
                ? "Saving thoughts..."
                : "Unsaved changes"}
            </span>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Pin / Unpin Button */}
            <button
              onClick={() => {
                setIsPinned(!isPinned);
                triggerAutosave();
              }}
              title={isPinned ? "Pinned to top" : "Pin to top"}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isPinned
                  ? "bg-amber-100 border-amber-300 text-amber-800"
                  : "bg-white/80 hover:bg-pink-50 text-purple-700 border-pink-200/60"
              }`}
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* History drawer button */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              title="Browse past entries"
              className="p-2 rounded-full bg-white/80 hover:bg-pink-50 text-[#6E5474] border border-pink-200/60 transition-colors"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Ambient Soundscape Control */}
            <AmbientSoundControl />

            {/* Sticker Drawer Button & Undo */}
            <div className="flex items-center gap-1">
              <button
                id="open-sticker-drawer-btn"
                onClick={() => setIsStickerDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-100/90 hover:bg-pink-200/90 text-pink-700 text-xs font-semibold border border-pink-300/60 shadow-2xs transition-all cursor-pointer"
              >
                <span className="text-sm">🎀</span>
                <span className="hidden sm:inline">Stickers</span>
              </button>

              {stickerHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoSticker}
                  className="px-2.5 py-1.5 rounded-full bg-white hover:bg-pink-50 text-purple-900 text-xs font-medium border border-pink-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                  title="Undo Sticker Action"
                >
                  <RotateCcw className="w-3 h-3 text-pink-600" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
              )}
            </div>

            {/* Reflect with Gemini Button */}
            <button
              id="writer-gemini-reflect-btn"
              onClick={() => setIsGeminiModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-200" />
              <span>Reflect with Gemini ✨</span>
            </button>

            {/* Manual Save Button */}
            <button
              id="writer-manual-save-btn"
              onClick={handleManualSave}
              className="p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Physical Journal Container */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8">
        {/* Diary Book Outer Leather/Cloth Edge Casing */}
        <div className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-tr from-[#EBB8CD] via-[#F3C5D8] to-[#E2C3F5] shadow-2xl border-4 border-pink-200/60">
          {/* Decorative book spine stitches on left */}
          <div className="absolute left-6 top-6 bottom-6 w-1 border-r border-dashed border-pink-400/40 pointer-events-none" />

          {/* Realistic Diary Paper Page */}
          <div
            ref={paperRef}
            id="diary-paper-canvas"
            className={`relative rounded-2xl p-6 sm:p-10 transition-colors shadow-inner overflow-hidden min-h-[680px] sm:min-h-[750px] flex flex-col ${
              isLinedPaper ? "diary-paper-lined" : "diary-paper-texture"
            }`}
          >
            {/* Bookmark ribbon visual on top */}
            <div className="absolute top-0 right-10 w-6 h-14 bg-gradient-to-b from-purple-400 via-pink-400 to-pink-500 rounded-b-md shadow-md pointer-events-none z-10 opacity-90" />

            {/* Floating Undo Toast Notification */}
            {toastMessage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-purple-950/95 text-white px-4 py-2 rounded-full shadow-xl border border-pink-300/40 text-xs animate-slide-down">
                <span>{toastMessage.text}</span>
                {toastMessage.onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      toastMessage.onUndo?.();
                      setToastMessage(null);
                    }}
                    className="flex items-center gap-1 font-bold text-pink-300 hover:text-pink-100 underline ml-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-white/60 hover:text-white ml-1 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Interactive Drag & Drop Stickers on the Paper */}
            {stickers.map((st) => (
              <InteractiveSticker
                key={st.id}
                sticker={st}
                containerRef={paperRef}
                onUpdate={handleUpdateSticker}
                onRemove={handleRemoveSticker}
              />
            ))}

            {/* Header: Date, Weather, Location, Typography Controls */}
            <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-pink-200/60">
              {/* Date & Time display / inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-xs font-semibold text-pink-800 border border-pink-200/70 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      triggerAutosave();
                    }}
                    className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 text-xs text-[#7E6584] border border-pink-200/50">
                  <Clock className="w-3 h-3 text-pink-400" />
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      triggerAutosave();
                    }}
                    className="bg-transparent w-16 text-xs focus:outline-none"
                  />
                </div>

                {/* Location Picker (Mapped to 3D Globe) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLocationSelectorOpen(!isLocationSelectorOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs transition-colors cursor-pointer ${
                      location?.name
                        ? "bg-pink-100/90 text-pink-900 border-pink-300"
                        : "bg-pink-50 hover:bg-pink-100 text-pink-800 border-pink-200/70"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-pink-500" />
                    <span>{location?.name ? `${location.name}` : "📍 Add Location"}</span>
                  </button>

                  {isLocationSelectorOpen && (
                    <div className="absolute top-9 left-0 z-50 w-72 bg-white rounded-2xl p-3.5 shadow-2xl border border-pink-200 animate-fade-in text-purple-950">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
                        <div className="text-xs font-bold font-serif text-purple-950 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-pink-500" />
                          <span>Set Memory Location</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsLocationSelectorOpen(false)}
                          className="text-purple-400 hover:text-purple-700 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 1. Auto-detect GPS button */}
                      <button
                        type="button"
                        onClick={handleDetectUserLocation}
                        disabled={isDetectingLocation}
                        className="w-full mb-2.5 py-2 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold text-xs border border-pink-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isDetectingLocation ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-600" />
                            <span>Detecting GPS Location...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3.5 h-3.5 text-pink-600" />
                            <span>Detect My Current Location</span>
                          </>
                        )}
                      </button>

                      {/* 2. Custom Location Input */}
                      <form onSubmit={handleCustomLocationSubmit} className="mb-2.5">
                        <label className="text-[10px] uppercase font-bold text-purple-900/50 block mb-1">
                          Type any city or place name:
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customLocationName}
                            onChange={(e) => setCustomLocationName(e.target.value)}
                            placeholder="e.g. Kyoto, Paris, My Desk..."
                            className="flex-1 px-3 py-1.5 rounded-xl bg-pink-50/60 border border-pink-200/80 text-xs text-purple-950 placeholder:text-purple-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            Set
                          </button>
                        </div>
                      </form>

                      {/* 3. Popular / Global Quick Picks */}
                      <div className="text-[10px] uppercase font-bold text-purple-900/50 mb-1">
                        Quick Worldwide Suggestions:
                      </div>
                      <div className="space-y-0.5 max-h-32 overflow-y-auto mb-2 pr-1 custom-scrollbar">
                        {POPULAR_LOCATIONS.map((loc) => (
                          <button
                            key={loc.name}
                            type="button"
                            onClick={() => handleSelectPopularLocation(loc)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-serif flex items-center justify-between transition-colors ${
                              location?.name === loc.name
                                ? "bg-pink-100 text-pink-900 font-bold"
                                : "hover:bg-pink-50 text-purple-950"
                            }`}
                          >
                            <span>📍 {loc.name}</span>
                            <span className="text-[10px] text-purple-400">{loc.country}</span>
                          </button>
                        ))}
                      </div>

                      {/* 4. Remove / Clear location option */}
                      {location && (
                        <button
                          type="button"
                          onClick={handleClearLocation}
                          className="w-full pt-1.5 border-t border-pink-100 text-center text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                        >
                          ✕ Remove Location from this Entry
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Weather selector */}
                <select
                  value={weather}
                  onChange={(e) => {
                    setWeather(e.target.value);
                    triggerAutosave();
                  }}
                  className="px-2.5 py-1 rounded-full bg-pink-50 text-xs text-[#7E6584] border border-pink-200/50 focus:outline-none cursor-pointer"
                >
                  {WEATHERS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Typography controls & Lined Paper Switch */}
              <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-xs p-1 rounded-full border border-pink-200/60">
                {/* Font selector */}
                <button
                  type="button"
                  onClick={() => setFontFamily("serif")}
                  className={`px-2 py-0.5 rounded-full text-xs font-serif ${
                    fontFamily === "serif"
                      ? "bg-pink-500 text-white font-bold"
                      : "text-[#7E6584] hover:text-pink-600"
                  }`}
                  title="Romantic Serif Font"
                >
                  Serif
                </button>
                <button
                  type="button"
                  onClick={() => setFontFamily("handwriting")}
                  className={`px-2 py-0.5 rounded-full text-xs font-handwriting ${
                    fontFamily === "handwriting"
                      ? "bg-pink-500 text-white font-bold text-sm"
                      : "text-[#7E6584] hover:text-pink-600"
                  }`}
                  title="Handwritten Cursive Font"
                >
                  Handwritten
                </button>
                <button
                  type="button"
                  onClick={() => setFontFamily("sans")}
                  className={`px-2 py-0.5 rounded-full text-xs font-sans ${
                    fontFamily === "sans"
                      ? "bg-pink-500 text-white font-bold"
                      : "text-[#7E6584] hover:text-pink-600"
                  }`}
                  title="Modern Clean Sans Font"
                >
                  Clean
                </button>

                {/* Font size adjustments */}
                <div className="h-4 w-[1px] bg-pink-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className="px-1 text-xs text-[#7E6584] hover:text-pink-600 font-bold"
                  title="Smaller text"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(26, s + 2))}
                  className="px-1 text-xs text-[#7E6584] hover:text-pink-600 font-bold"
                  title="Larger text"
                >
                  A+
                </button>

                {/* Toggle Lined paper */}
                <div className="h-4 w-[1px] bg-pink-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setIsLinedPaper(!isLinedPaper)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    isLinedPaper ? "text-pink-700 font-semibold" : "text-[#8B6E92]"
                  }`}
                  title="Toggle ruled notebook lines"
                >
                  {isLinedPaper ? "Lines: On" : "Plain"}
                </button>
              </div>
            </div>

            {/* Mood Selector Row */}
            <div className="relative z-20 flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
              <span className="text-xs font-medium text-[#7E6584] mr-1 shrink-0">
                Today's Mood:
              </span>
              {MOODS.map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => {
                    setMood(m.type);
                    setMoodEmoji(m.emoji);
                    triggerAutosave();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    mood === m.type
                      ? "bg-pink-500 text-white shadow-xs scale-105"
                      : "bg-white/60 text-[#6E5474] hover:bg-pink-100 border border-pink-200/50"
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Categories Selection Row */}
            <div className="relative z-20 flex flex-wrap items-center gap-1.5 pb-3 mb-4 border-b border-pink-100">
              <span className="text-xs font-medium text-[#7E6584] mr-1 flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3 text-pink-500" />
                Categories:
              </span>

              {/* Default category pills */}
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = categories.includes(cat.name);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`px-2.5 py-0.8 rounded-full text-[11px] font-serif transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-purple-950 text-white shadow-2xs scale-105"
                        : "bg-white/70 text-purple-900 hover:bg-pink-50 border border-pink-100"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}

              {/* Custom categories */}
              {customCategories.map((cName) => {
                const isSelected = categories.includes(cName);
                return (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => toggleCategory(cName)}
                    className={`px-2.5 py-0.8 rounded-full text-[11px] font-serif transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-purple-950 text-white shadow-2xs scale-105"
                        : "bg-pink-100/70 text-pink-900 hover:bg-pink-100 border border-pink-200"
                    }`}
                  >
                    <span>{cName}</span>
                  </button>
                );
              })}

              {/* Gemini AI Category Suggestion Trigger */}
              <button
                type="button"
                onClick={handleAskGeminiForCategories}
                disabled={isSuggestingCategories}
                className="px-2.5 py-0.8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                title="Let Gemini suggest categories based on your text"
              >
                <Sparkles className={`w-3 h-3 text-pink-200 ${isSuggestingCategories ? "animate-spin" : ""}`} />
                <span>{isSuggestingCategories ? "Thinking..." : "AI Suggest ✨"}</span>
              </button>

              {/* Manage / Add Custom Category */}
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="p-1 rounded-full text-purple-600 hover:bg-pink-100 text-xs"
                title="Manage Custom Categories"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title Input */}
            <div className="relative z-20 mb-4">
              <input
                id="diary-entry-title-input"
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Give today's chapter a title..."
                className={`w-full bg-transparent border-b border-pink-200/70 pb-2 text-2xl sm:text-3xl font-bold text-[#3B2C3E] placeholder:text-[#BCA3BF] focus:outline-none focus:border-pink-500 transition-colors ${
                  fontFamily === "serif"
                    ? "font-serif-title"
                    : fontFamily === "handwriting"
                    ? "font-handwriting text-3xl"
                    : "font-sans-ui"
                }`}
              />
            </div>

            {/* Attached Photo Memories Gallery on Paper Page */}
            {media.length > 0 && (
              <div className="relative z-20 mb-4 flex flex-wrap gap-4">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="relative group bg-white p-2.5 pb-4 rounded-xl shadow-md border border-pink-200/80 -rotate-1 hover:rotate-0 transition-transform duration-300 max-w-xs"
                  >
                    {/* Washi tape graphic on top */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-pink-200/80 backdrop-blur-xs opacity-90 rotate-2 pointer-events-none rounded-xs" />

                    <div className="rounded-lg overflow-hidden h-40 w-full bg-pink-50">
                      <img
                        src={item.url}
                        alt="Journal Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="mt-2 text-center text-xs font-handwriting text-purple-900">
                      {item.caption || "A cherished memory"}
                    </div>

                    {/* Delete Photo Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      title="Delete photo"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md border border-white cursor-pointer opacity-90 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Main Writing Area */}
            <div className="relative z-20 flex-1 flex flex-col">
              <textarea
                id="diary-entry-content-textarea"
                value={content}
                onChange={handleContentChange}
                placeholder="Dear SoulSelf... What thoughts, feelings, and moments are filling your heart today? Let your words flow gently without judgment..."
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: isLinedPaper ? "2.2rem" : "1.8",
                }}
                className={`w-full flex-1 min-h-[420px] sm:min-h-[480px] bg-transparent resize-none focus:outline-none text-[#4A3E4E] placeholder:text-[#BCA3BF] ${
                  fontFamily === "serif"
                    ? "font-serif"
                    : fontFamily === "handwriting"
                    ? "font-handwriting text-2xl"
                    : "font-sans"
                }`}
              />
            </div>

            {/* Add Photo Button below content */}
            <div className="relative z-20 my-3 flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50/80 hover:bg-pink-100 text-xs font-semibold text-pink-700 border border-pink-200 shadow-2xs transition-colors cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                <span>+ Paste Photo to Paper</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAddMedia(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            {/* Structured Summary Attached Badge (if present) */}
            {summary && (
              <div className="relative z-20 mt-6 p-4 rounded-2xl bg-purple-50/90 border border-purple-200 shadow-2xs">
                <div className="flex items-center justify-between font-serif font-bold text-purple-900 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    Gemini Reflection Insights
                  </span>
                  <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                    {summary.emotionalTone}
                  </span>
                </div>
                <div className="text-xs text-[#5B4360] space-y-1">
                  <div>
                    <strong>Themes:</strong> {summary.mainThemes.join(", ")}
                  </div>
                  <div>
                    <strong>Thoughts:</strong> {summary.importantThoughts.join(" • ")}
                  </div>
                  <div>
                    <strong>What went well:</strong> {summary.whatWentWell.join(" • ")}
                  </div>
                  <div>
                    <strong>Gentle Next Steps:</strong> {summary.possibleNextSteps.join(" • ")}
                  </div>
                </div>
              </div>
            )}

            {/* Page Footer: Word count, sticker tip */}
            <div className="relative z-20 pt-4 mt-4 border-t border-pink-100/70 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8B6E92]">
              <div className="flex items-center gap-3">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{Math.max(1, Math.ceil(wordCount / 100))} min read</span>
                <span>•</span>
                <span>{stickers.length} stickers placed</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-pink-600 font-medium hidden sm:inline">
                  Click 'Reflect with Gemini ✨' to explore deeper thoughts
                </span>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="flex items-center gap-1 text-pink-500 hover:text-pink-600 cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-pink-500" : ""}`} />
                  <span className="text-xs">{isFavorite ? "Favorited" : "Favorite"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cute Sticker Drawer */}
      <StickerDrawer
        isOpen={isStickerDrawerOpen}
        onClose={() => setIsStickerDrawerOpen(false)}
        onAddSticker={handleAddSticker}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        customCategories={customCategories}
        onAddCustomCategory={handleAddCustomCategory}
        onRemoveCustomCategory={handleRemoveCustomCategory}
      />

      {/* Gemini Category Suggestion Review Modal */}
      <GeminiCategorySuggestModal
        isOpen={isSuggestCategoryModalOpen}
        onClose={() => setIsSuggestCategoryModalOpen(false)}
        suggestedCategories={geminiSuggestions}
        reasoning={geminiReasoning}
        onApplyCategories={(newCats) => {
          setCategories(Array.from(new Set([...categories, ...newCats])));
          triggerAutosave();
        }}
      />

      {/* Gemini Reflection Modal */}
      <GeminiReflectModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        entry={{
          id,
          title,
          content,
          date,
          mood,
          summary,
        }}
        userName={userName}
        onSaveSummary={(newSummary) => {
          setSummary(newSummary);
          triggerAutosave();
        }}
      />

      {/* History Slide-over Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl border-l border-pink-200 p-5 flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2 text-pink-600">
                <BookHeart className="w-5 h-5" />
                <h4 className="font-serif-title text-xl font-bold text-[#4A3E4E]">
                  Past Journal Pages
                </h4>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {allEntries.map((e) => (
                <div
                  key={e.id}
                  onClick={() => {
                    onSelectOtherEntry(e);
                    setIsHistoryOpen(false);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    e.id === id
                      ? "bg-pink-50 border-pink-300 ring-2 ring-pink-400"
                      : "bg-white border-pink-100 hover:bg-pink-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#8B6E92] mb-1">
                    <span>{e.date}</span>
                    <span>{e.moodEmoji}</span>
                  </div>
                  <h5 className="font-serif-title font-bold text-[#3B2C3E] truncate">
                    {e.title || "Untitled Entry"}
                  </h5>
                  <p className="text-xs text-[#6A5370] line-clamp-2 mt-1">
                    {e.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
