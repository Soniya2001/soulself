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
  JournalMusicTrack,
} from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { StickerDrawer } from "./StickerDrawer";
import { GeminiReflectModal } from "./GeminiReflectModal";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { GeminiCategorySuggestModal } from "./GeminiCategorySuggestModal";
import { MusicSearchModal } from "./MusicSearchModal";
import { MusicStickerCard } from "./MusicStickerCard";
import { JournalPageLayout } from "./JournalPageLayout";
import { Music } from "lucide-react";
import { DEFAULT_CATEGORIES, POPULAR_LOCATIONS } from "../data/initialData";
import {
  resolveLocationFromName,
  detectCurrentLocation,
  getSavedPreferredLocation,
  savePreferredLocation,
  geocodeLocation,
  searchLocationsDynamic,
  LocationSearchResult,
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
  const [music, setMusic] = useState<JournalMusicTrack | null>(
    initialEntry?.music || null
  );
  const [isMusicModalOpen, setIsMusicModalOpen] = useState<boolean>(false);

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
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Requirement 3, 4, 12: Real-time debounced location search autocomplete
  useEffect(() => {
    if (customLocationName.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      const results = await searchLocationsDynamic(customLocationName.trim());
      setSearchResults(results);
      setIsSearchingLocation(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [customLocationName]);

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    const newLoc: JournalLocation = {
      name: result.displayName,
      country: result.country || "Earth",
      latitude: result.latitude,
      longitude: result.longitude,
    };
    setLocation(newLoc);
    savePreferredLocation(newLoc);
    setCustomLocationName("");
    setSearchResults([]);
    setIsLocationSelectorOpen(false);
    triggerAutosave();
    audioManager.playGentleTap();
    showToast(`Location set to ${result.displayName} 📍`);
  };
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
        music,
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

  const handleSelectMusicTrack = (track: JournalMusicTrack) => {
    setMusic(track);
    triggerAutosave();
    showToast(`Music attached: "${track.title}" 🎵`);
  };

  const handleRemoveMusic = () => {
    setMusic(null);
    triggerAutosave();
    showToast("Music attachment removed 🌸");
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

  const handleCustomLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLocationName.trim()) return;

    setIsDetectingLocation(true);
    try {
      const newLoc = await geocodeLocation(customLocationName.trim());
      setLocation(newLoc);
      savePreferredLocation(newLoc);
      setCustomLocationName("");
      setIsLocationSelectorOpen(false);
      triggerAutosave();
      audioManager.playGentleTap();
      showToast(`Location set to ${newLoc.name} 🌍`);
    } catch (err: any) {
      showToast(err.message || "Couldn't find this location. Please choose a valid place.");
    } finally {
      setIsDetectingLocation(false);
    }
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
      music,
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
            onClick={() => {
              handleManualSave();
              onBackToDashboard();
            }}
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

            {/* Music Soundtrack Button in Action Bar */}
            <button
              type="button"
              id="action-bar-add-music-btn"
              onClick={() => setIsMusicModalOpen(true)}
              title={music ? `Track: ${music.title}` : "Attach Music Track"}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-2xs transition-all cursor-pointer ${
                music
                  ? "bg-pink-600 text-white border-pink-700 shadow-xs"
                  : "bg-pink-100/90 hover:bg-pink-200/90 text-pink-800 border-pink-300/80"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{music ? "🎵 Music Attached" : "🎵 Add Music"}</span>
            </button>

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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
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

          {/* Realistic Diary Paper Page Layout */}
          <JournalPageLayout
            entry={{
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
              music,
              stickers,
              summary,
              isFavorite,
              isPinned,
              createdAt: initialEntry?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            isEditing={true}
            title={title}
            content={content}
            date={date}
            time={time}
            mood={mood}
            moodEmoji={moodEmoji}
            weather={weather}
            categories={categories}
            location={location}
            music={music}
            media={media}
            stickers={stickers}
            summary={summary}
            isFavorite={isFavorite}
            onTitleChange={(val) => {
              setTitle(val);
              triggerAutosave();
            }}
            onContentChange={(val) => {
              setContent(val);
              triggerAutosave();
            }}
            onDateChange={(val) => {
              setDate(val);
              triggerAutosave();
            }}
            onTimeChange={(val) => {
              setTime(val);
              triggerAutosave();
            }}
            onMoodChange={(m, emoji) => {
              setMood(m);
              setMoodEmoji(emoji);
              triggerAutosave();
            }}
            onWeatherChange={(w) => {
              setWeather(w);
              triggerAutosave();
            }}
            onLocationClick={() => setIsLocationSelectorOpen(true)}
            onOpenMusicSearch={() => setIsMusicModalOpen(true)}
            onRemoveMusic={handleRemoveMusic}
            onRemovePhoto={handleRemoveMedia}
            onAddPhoto={handleAddMedia}
            onUpdateSticker={handleUpdateSticker}
            onRemoveSticker={handleRemoveSticker}
            onToggleFavorite={() => {
              setIsFavorite(!isFavorite);
              triggerAutosave();
            }}
            onCategoryToggle={toggleCategory}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
            onAskGeminiForCategories={handleAskGeminiForCategories}
            isSuggestingCategories={isSuggestingCategories}
            fontFamily={fontFamily}
            fontSize={fontSize}
            isLinedPaper={isLinedPaper}
            toastMessage={toastMessage}
            onDismissToast={() => setToastMessage(null)}
            headerActions={
              <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-xs p-1 rounded-full border border-pink-200/60">
                <button
                  type="button"
                  onClick={() => setFontFamily("serif")}
                  className={`px-2 py-0.5 rounded-full text-xs font-serif cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded-full text-xs font-handwriting cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded-full text-xs font-sans cursor-pointer ${
                    fontFamily === "sans"
                      ? "bg-pink-500 text-white font-bold"
                      : "text-[#7E6584] hover:text-pink-600"
                  }`}
                  title="Modern Clean Sans Font"
                >
                  Clean
                </button>

                <div className="h-4 w-[1px] bg-pink-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className="px-1 text-xs text-[#7E6584] hover:text-pink-600 font-bold cursor-pointer"
                  title="Smaller text"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(26, s + 2))}
                  className="px-1 text-xs text-[#7E6584] hover:text-pink-600 font-bold cursor-pointer"
                  title="Larger text"
                >
                  A+
                </button>

                <div className="h-4 w-[1px] bg-pink-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setIsLinedPaper(!isLinedPaper)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer ${
                    isLinedPaper ? "text-pink-700 font-semibold" : "text-[#8B6E92]"
                  }`}
                  title="Toggle ruled notebook lines"
                >
                  {isLinedPaper ? "Lines: On" : "Plain"}
                </button>
              </div>
            }
          />
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
      {/* High Z-Index Location Selector Modal at Top Level */}
      {isLocationSelectorOpen && (
        <div className="fixed inset-0 z-[99999] bg-pink-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-purple-950">
          <div
            className="relative w-full max-w-md bg-white opacity-100 rounded-3xl p-6 shadow-2xl border-2 border-pink-300 z-[100000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-100">
              <div className="text-base font-bold font-serif text-purple-950 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-pink-500" />
                <span>Set Memory Location</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationSelectorOpen(false)}
                className="text-purple-400 hover:text-purple-700 p-1 rounded-full hover:bg-pink-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Confirmation Badge for Selected Location */}
            {location && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-serif shadow-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{location.name}</span>
                </div>
                {typeof location.latitude === "number" && typeof location.longitude === "number" && (
                  <div className="text-xs font-mono text-emerald-800/90">
                    Latitude: {location.latitude.toFixed(4)}° · Longitude: {location.longitude.toFixed(4)}°
                  </div>
                )}
              </div>
            )}

            {/* 1. Auto-detect GPS button */}
            <button
              type="button"
              onClick={handleDetectUserLocation}
              disabled={isDetectingLocation}
              className="w-full mb-3.5 py-2.5 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold text-xs border border-pink-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-pink-600" />
                  <span>Detect My Current Location</span>
                </>
              )}
            </button>

            {/* 2. Custom Location Search & Input */}
            <form onSubmit={handleCustomLocationSubmit} className="mb-3.5">
              <label className="text-[11px] uppercase font-bold text-purple-900/60 block mb-1">
                Type any city or place name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="Type Madurai, Tokyo, Paris..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-pink-50/60 border border-pink-200/80 text-xs text-purple-950 placeholder:text-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Search
                </button>
              </div>
            </form>

            {/* 3. Real-Time Dynamic Search Autocomplete Candidates */}
            {isSearchingLocation && (
              <div className="py-2 text-center text-xs font-serif text-pink-600 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-600" />
                <span>Searching global geocoding registry...</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mb-3.5 max-h-48 overflow-y-auto bg-white rounded-2xl border border-pink-200 p-1.5 shadow-md space-y-1 custom-scrollbar">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-purple-900/60">
                  Select your exact location match:
                </div>
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-pink-50 text-purple-950 flex flex-col cursor-pointer transition-colors border border-transparent hover:border-pink-200"
                  >
                    <span className="font-bold text-purple-950">📍 {res.displayName}</span>
                    <span className="text-[10px] font-mono text-purple-900/60">
                      Lat: {res.latitude.toFixed(4)}° · Lon: {res.longitude.toFixed(4)}°
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 4. Popular / Global Quick Picks */}
            <div className="text-[11px] uppercase font-bold text-purple-900/60 mb-1.5">
              Quick Worldwide Suggestions:
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto mb-3.5 pr-1 custom-scrollbar">
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectPopularLocation(loc)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif flex items-center justify-between transition-colors cursor-pointer ${
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

            {/* 5. Remove / Clear location option */}
            {location && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="w-full pt-3 border-t border-pink-100 text-center text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
              >
                ✕ Remove Location from this Entry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Music Search Modal */}
      <MusicSearchModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        onSelectTrack={handleSelectMusicTrack}
        currentTrack={music}
      />
    </div>
  );
};
