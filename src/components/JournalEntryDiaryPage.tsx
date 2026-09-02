import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Edit3,
  Check,
  X,
  MapPin,
  Calendar,
  Clock,
  CloudSun,
  Smile,
  Heart,
  Tag,
  Trash2,
  Image as ImageIcon,
  RotateCcw,
  BookOpen,
  Plus,
  AlertTriangle,
  Navigation,
  Loader2,
} from "lucide-react";
import { JournalEntry, StickerPlacement, MoodType, JournalMedia, JournalLocation } from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { StickerDrawer } from "./StickerDrawer";
import { audioManager } from "../utils/audio";
import { POPULAR_LOCATIONS } from "../data/initialData";
import {
  resolveLocationFromName,
  detectCurrentLocation,
  savePreferredLocation,
  geocodeLocation,
} from "../utils/location";

interface JournalEntryDiaryPageProps {
  entry: JournalEntry;
  onSave: (updatedEntry: JournalEntry) => Promise<void> | void;
  onDelete?: (entryId: string) => Promise<void> | void;
  pageNumber: number;
}

const MOOD_OPTIONS: { mood: MoodType; emoji: string; label: string }[] = [
  { mood: "Calm", emoji: "🌸", label: "Calm" },
  { mood: "Happy", emoji: "✨", label: "Happy" },
  { mood: "Excited", emoji: "🎉", label: "Excited" },
  { mood: "Worried", emoji: "🌧️", label: "Worried" },
  { mood: "Sad", emoji: "💧", label: "Sad" },
  { mood: "Frustrated", emoji: "⚡", label: "Frustrated" },
  { mood: "Tired", emoji: "🌙", label: "Tired" },
  { mood: "Neutral", emoji: "🌱", label: "Neutral" },
];

export const JournalEntryDiaryPage: React.FC<JournalEntryDiaryPageProps> = ({
  entry,
  onSave,
  onDelete,
  pageNumber,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<JournalEntry>(entry);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [customLocationText, setCustomLocationText] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Undo histories
  const [stickerHistory, setStickerHistory] = useState<StickerPlacement[][]>([]);
  const [lastDeletedPhoto, setLastDeletedPhoto] = useState<JournalMedia | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; onUndo?: () => void } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setFormData(entry);
    }
  }, [entry, isEditing]);

  const showToast = (text: string, onUndo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, onUndo });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleStartEdit = () => {
    setFormData(entry);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(entry);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
      audioManager.playSaveChime();
      showToast("Journal entry saved beautifully 🌸");
    } catch (err) {
      console.error("Failed to save journal entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectLocation = (loc: JournalLocation) => {
    const next = { ...formData, location: loc };
    setFormData(next);
    savePreferredLocation(loc);
    setIsLocationPopoverOpen(false);
    audioManager.playGentleTap();
    if (!isEditing) {
      onSave(next);
    }
    showToast(`Location set to ${loc.name} 📍`);
  };

  const handleDetectPageLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const detected = await detectCurrentLocation();
      const next = { ...formData, location: detected };
      setFormData(next);
      savePreferredLocation(detected);
      setIsLocationPopoverOpen(false);
      audioManager.playSparkleChime();
      if (!isEditing) {
        onSave(next);
      }
      showToast(`Location set to ${detected.name} 📍`);
    } catch (err) {
      console.warn("Location detection failed:", err);
      showToast("Could not access GPS. Please type your city name below.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleCustomLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLocationText.trim()) return;

    setIsDetectingLocation(true);
    try {
      const resolved = await geocodeLocation(customLocationText.trim());
      const next = { ...formData, location: resolved };
      setFormData(next);
      savePreferredLocation(resolved);
      setCustomLocationText("");
      setIsLocationPopoverOpen(false);
      audioManager.playGentleTap();
      if (!isEditing) {
        onSave(next);
      }
      showToast(`Location updated to ${resolved.name} 🌍`);
    } catch (err: any) {
      showToast(err.message || "Couldn't find this location. Please choose a valid place.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleClearPageLocation = () => {
    const next = { ...formData, location: undefined };
    setFormData(next);
    setIsLocationPopoverOpen(false);
    audioManager.playGentleTap();
    if (!isEditing) {
      onSave(next);
    }
    showToast("Location cleared from page");
  };

  // Sticker actions with Undo
  const handleAddSticker = (emoji: string) => {
    const currentStickers = formData.stickers || [];
    setStickerHistory((prev) => [...prev, currentStickers]);

    const newSticker: StickerPlacement = {
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      emoji,
      x: 75 + Math.random() * 15,
      y: 15 + Math.random() * 40,
      scale: 1.2,
      rotation: Math.round(Math.random() * 30 - 15),
    };
    const nextStickers = [...currentStickers, newSticker];
    setFormData((prev) => ({ ...prev, stickers: nextStickers }));
    audioManager.playSparkleChime();

    if (!isEditing) {
      onSave({ ...formData, stickers: nextStickers });
    }

    showToast("Sticker placed!", () => handleUndoSticker());
  };

  const handleUpdateSticker = (updated: StickerPlacement) => {
    const currentStickers = formData.stickers || [];
    setStickerHistory((prev) => [...prev, currentStickers]);

    const nextStickers = currentStickers.map((s) => (s.id === updated.id ? updated : s));
    setFormData((prev) => ({ ...prev, stickers: nextStickers }));

    if (!isEditing) {
      onSave({ ...formData, stickers: nextStickers });
    }
  };

  const handleRemoveSticker = (stickerId: string) => {
    const currentStickers = formData.stickers || [];
    const removedItem = currentStickers.find((s) => s.id === stickerId);
    setStickerHistory((prev) => [...prev, currentStickers]);

    const nextStickers = currentStickers.filter((s) => s.id !== stickerId);
    setFormData((prev) => ({ ...prev, stickers: nextStickers }));

    if (!isEditing) {
      onSave({ ...formData, stickers: nextStickers });
    }

    showToast(`Sticker ${removedItem?.emoji || ""} removed`, () => {
      if (removedItem) {
        const restored = [...nextStickers, removedItem];
        setFormData((prev) => ({ ...prev, stickers: restored }));
        if (!isEditing) onSave({ ...formData, stickers: restored });
      }
    });
  };

  const handleUndoSticker = () => {
    if (stickerHistory.length === 0) return;
    const previousState = stickerHistory[stickerHistory.length - 1];
    setStickerHistory((prev) => prev.slice(0, -1));
    setFormData((prev) => ({ ...prev, stickers: previousState }));
    if (!isEditing) {
      onSave({ ...formData, stickers: previousState });
    }
    audioManager.playGentleTap();
    showToast("Sticker action undone ↺");
  };

  const handleClearAllStickers = () => {
    const currentStickers = formData.stickers || [];
    if (currentStickers.length === 0) return;
    setStickerHistory((prev) => [...prev, currentStickers]);
    setFormData((prev) => ({ ...prev, stickers: [] }));
    if (!isEditing) {
      onSave({ ...formData, stickers: [] });
    }
    audioManager.playGentleTap();
    showToast("All stickers cleared", () => {
      setFormData((prev) => ({ ...prev, stickers: currentStickers }));
      if (!isEditing) onSave({ ...formData, stickers: currentStickers });
    });
  };

  // Photo / Media actions with Undo
  const handleAddPhoto = (file: File) => {
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
        const nextMedia = [...(formData.media || []), newMediaItem];
        setFormData((prev) => ({ ...prev, media: nextMedia }));
        audioManager.playSparkleChime();
        if (!isEditing) {
          onSave({ ...formData, media: nextMedia });
        }
        showToast("Photo added to page!", () => {
          handleRemovePhoto(newMediaItem.id, false);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (photoId: string, offerUndo: boolean = true) => {
    const currentMedia = formData.media || [];
    const photoToRemove = currentMedia.find((m) => m.id === photoId);
    if (!photoToRemove) return;

    const nextMedia = currentMedia.filter((m) => m.id !== photoId);
    setFormData((prev) => ({ ...prev, media: nextMedia }));
    setLastDeletedPhoto(photoToRemove);
    audioManager.playGentleTap();

    if (!isEditing) {
      onSave({ ...formData, media: nextMedia });
    }

    if (offerUndo) {
      showToast("Photo removed from diary page", () => {
        const restoredMedia = [...nextMedia, photoToRemove];
        setFormData((prev) => ({ ...prev, media: restoredMedia }));
        if (!isEditing) onSave({ ...formData, media: restoredMedia });
        setLastDeletedPhoto(null);
      });
    }
  };

  // Page Deletion
  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      audioManager.playGentleTap();
      await onDelete(formData.id);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Failed to delete journal entry page:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={pageRef}
      id={`diary-page-entry-${entry.id}`}
      className="relative w-full min-h-[660px] sm:min-h-[740px] h-[660px] sm:h-[740px] bg-[#FFFDFB] diary-paper-lined rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-inner flex flex-col justify-between overflow-hidden select-text transition-all"
    >
      {/* Decorative Washi Tape Accent */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-28 h-5 bg-pink-200/70 backdrop-blur-xs opacity-90 rotate-1 rounded-xs pointer-events-none shadow-2xs z-10 border border-pink-300/40" />

      {/* Interactive Placed Stickers */}
      {(formData.stickers || []).map((st) => (
        <InteractiveSticker
          key={st.id}
          sticker={st}
          containerRef={pageRef}
          onUpdate={handleUpdateSticker}
          onRemove={handleRemoveSticker}
        />
      ))}

      {/* Floating Undo Toast Bar */}
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

      {/* Page Body Content (Scrollable within fixed page boundaries) */}
      <div className="relative z-20 space-y-4 overflow-y-auto max-h-[500px] sm:max-h-[580px] pr-1.5 custom-scrollbar flex-1">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-200/80 pb-3.5">
          {/* Date, Time, Weather, Location */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-purple-900/80 font-serif">
            <div className="flex items-center gap-1.5 font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200/60">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formData.date || "Today"}</span>
            </div>

            <div className="flex items-center gap-1 text-purple-900/70">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{formData.time || "12:00 PM"}</span>
            </div>

            {formData.weather && (
              <div className="flex items-center gap-1 text-purple-900/70">
                <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                <span>{formData.weather}</span>
              </div>
            )}

            {/* Interactive Location Badge & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLocationPopoverOpen(!isLocationPopoverOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-serif font-medium border transition-colors cursor-pointer ${
                  formData.location?.name
                    ? "bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200/70"
                    : "bg-pink-50/50 text-pink-500 hover:bg-pink-100/80 border-dashed border-pink-300"
                }`}
                title="Click to change or add location"
              >
                <MapPin className="w-3.5 h-3.5 text-pink-500" />
                <span>{formData.location?.name ? formData.location.name : "+ Place"}</span>
              </button>

              {isLocationPopoverOpen && (
                <div className="fixed inset-0 z-50 bg-purple-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-purple-950">
                  <div
                    className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-pink-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-100">
                      <div className="text-sm font-bold font-serif text-purple-950 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-pink-500" />
                        <span>Edit Page Location</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLocationPopoverOpen(false)}
                        className="text-purple-400 hover:text-purple-700 p-1 rounded-full hover:bg-pink-50 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* GPS Detection */}
                    <button
                      type="button"
                      onClick={handleDetectPageLocation}
                      disabled={isDetectingLocation}
                      className="w-full mb-3 py-2.5 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold text-xs border border-pink-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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

                    {/* Custom Location input */}
                    <form onSubmit={handleCustomLocationSubmit} className="mb-3">
                      <label className="text-[11px] uppercase font-bold text-purple-900/60 block mb-1">
                        Type any city or place name:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customLocationText}
                          onChange={(e) => setCustomLocationText(e.target.value)}
                          placeholder="e.g. Madurai, Paris, Tokyo..."
                          className="flex-1 px-3.5 py-2 rounded-xl bg-pink-50/60 border border-pink-200/80 text-xs text-purple-950 placeholder:text-purple-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        >
                          Set
                        </button>
                      </div>
                    </form>

                    {/* Worldwide Quick Suggestions */}
                    <div className="text-[11px] uppercase font-bold text-purple-900/60 mb-1.5">
                      Quick Worldwide Suggestions:
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto mb-3 pr-1 custom-scrollbar">
                      {POPULAR_LOCATIONS.map((loc) => (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => handleSelectLocation(loc)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif flex items-center justify-between transition-colors cursor-pointer ${
                            formData.location?.name === loc.name
                              ? "bg-pink-100 text-pink-900 font-bold"
                              : "hover:bg-pink-50 text-purple-950"
                          }`}
                        >
                          <span>📍 {loc.name}</span>
                          <span className="text-[10px] text-purple-400">{loc.country}</span>
                        </button>
                      ))}
                    </div>

                    {/* Clear Location */}
                    {formData.location && (
                      <button
                        type="button"
                        onClick={handleClearPageLocation}
                        className="w-full pt-2.5 border-t border-pink-100 text-center text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        ✕ Remove Location from this Page
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar: Stickers, Undo, Edit, Delete */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Sticker Button */}
            <button
              type="button"
              onClick={() => setIsStickerDrawerOpen(true)}
              className="px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              title="Add Stickers to this page"
            >
              <Smile className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sticker</span>
            </button>

            {/* Sticker Undo Button if history exists */}
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

            {/* Clear All Stickers if page has stickers */}
            {(formData.stickers || []).length > 0 && (
              <button
                type="button"
                onClick={handleClearAllStickers}
                className="p-1.5 rounded-full hover:bg-red-50 text-purple-400 hover:text-red-500 text-xs transition-colors cursor-pointer"
                title="Clear all stickers on this page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {!isEditing ? (
              <>
                <button
                  type="button"
                  id={`edit-journal-page-${pageNumber}-btn`}
                  onClick={handleStartEdit}
                  className="px-4 py-1.5 rounded-full bg-purple-950 hover:bg-purple-900 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-pink-300" />
                  <span>Edit ✎</span>
                </button>

                {/* Delete Page Button */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    title={`Delete Page ${pageNumber}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete 🗑️</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  id={`save-journal-page-${pageNumber}-btn`}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Entry 🌸"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mood & Category Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-900 text-xs font-serif font-semibold border border-purple-100 shadow-2xs">
                <span>{formData.moodEmoji || "🌸"}</span>
                <span>Feeling {formData.mood}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-pink-700 font-serif">Mood:</span>
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.mood}
                    type="button"
                    onClick={() => setFormData({ ...formData, mood: m.mood, moodEmoji: m.emoji })}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-serif transition-all cursor-pointer ${
                      formData.mood === m.mood
                        ? "bg-pink-600 text-white font-bold scale-105"
                        : "bg-pink-50 text-purple-900 hover:bg-pink-100"
                    }`}
                  >
                    <span>{m.emoji}</span> {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Categories */}
            {(formData.categories || []).map((cat) => (
              <span
                key={cat}
                className="px-2.5 py-0.5 rounded-full bg-white/90 border border-pink-200 text-purple-900 text-[11px] font-sans-ui font-medium"
              >
                #{cat}
              </span>
            ))}
          </div>

          {formData.isFavorite && (
            <div className="flex items-center gap-1 text-xs text-rose-500 font-serif font-medium bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
              <Heart className="w-3 h-3 fill-rose-400" />
              <span>Favorited Memory</span>
            </div>
          )}
        </div>

        {/* Title */}
        {!isEditing ? (
          <h2 className="font-serif-title text-2xl sm:text-3xl md:text-4xl font-bold text-purple-950 tracking-tight leading-snug">
            {formData.title || "Untitled Journal"}
          </h2>
        ) : (
          <div>
            <label className="text-[10px] uppercase font-bold text-pink-700 block mb-1">
              Journal Title:
            </label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Title of this page..."
              className="w-full text-xl sm:text-2xl font-serif-title font-bold bg-pink-50/50 border border-pink-200 rounded-xl px-3 py-2 text-purple-950 focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>
        )}

        {/* Attached Photos / Polaroid Media Cards with Easy Delete and Hover Controls */}
        <div className="py-1">
          {formData.media && formData.media.length > 0 && (
            <div className="flex flex-wrap gap-4 py-2">
              {formData.media.map((med) => (
                <div
                  key={med.id}
                  className="relative group bg-white p-2.5 pb-4 rounded-xl shadow-md border border-pink-100 max-w-[260px] rotate-[-1deg] hover:rotate-0 transition-transform"
                >
                  {/* Washi Tape Graphic */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-pink-200/80 rounded-xs pointer-events-none" />
                  
                  {/* Delete Photo Button (always accessible with hover and on mobile) */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(med.id)}
                    title="Delete photo from page"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md border border-white cursor-pointer opacity-90 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <img
                    src={med.url}
                    alt={med.caption || "Journal photo"}
                    className="w-full h-36 object-cover rounded-lg mb-2"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Photo Caption */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={med.caption || ""}
                      onChange={(e) => {
                        const updatedMedia = (formData.media || []).map((m) =>
                          m.id === med.id ? { ...m, caption: e.target.value } : m
                        );
                        setFormData({ ...formData, media: updatedMedia });
                      }}
                      placeholder="Add caption..."
                      className="w-full text-[11px] font-handwriting text-purple-950 text-center bg-pink-50/50 rounded-md px-1 py-0.5 border border-pink-200 focus:outline-none"
                    />
                  ) : med.caption ? (
                    <p className="text-[11px] font-handwriting text-purple-950 italic text-center">
                      {med.caption}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Add Photo Button in Edit Mode */}
          {isEditing && (
            <div className="mt-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200 shadow-2xs transition-colors cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                <span>+ Add Photo / Polaroid</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAddPhoto(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Journal Content (Lined Writing Area) */}
        {!isEditing ? (
          <div className="font-handwriting text-purple-950 text-base sm:text-lg md:text-xl leading-loose sm:leading-[2.2rem] whitespace-pre-line tracking-wide pt-1">
            {formData.content || (
              <span className="text-purple-300 italic font-sans text-sm">
                No entry written on this page yet.
              </span>
            )}
          </div>
        ) : (
          <div>
            <label className="text-[10px] uppercase font-bold text-pink-700 block mb-1">
              Your Thoughts & Reflections:
            </label>
            <textarea
              value={formData.content || ""}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Pour your heart onto the page..."
              rows={12}
              className="w-full text-base sm:text-lg font-serif bg-pink-50/40 border border-pink-200 rounded-2xl p-4 text-purple-950 leading-relaxed focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>
        )}

        {/* Gemini AI Structured Reflection Insight (if available) */}
        {formData.summary && !isEditing && (
          <div className="bg-purple-50/70 rounded-2xl p-4 border border-purple-100 shadow-2xs mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 font-serif">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Gemini Reflection Summary</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-purple-950 font-serif">
              {formData.summary.mainThemes && formData.summary.mainThemes.length > 0 && (
                <div>
                  <span className="font-bold text-pink-700 block mb-0.5">Themes:</span>
                  <p className="text-purple-900/80">{formData.summary.mainThemes.join(" • ")}</p>
                </div>
              )}
              {formData.summary.whatWentWell && formData.summary.whatWentWell.length > 0 && (
                <div>
                  <span className="font-bold text-pink-700 block mb-0.5">What Went Well:</span>
                  <p className="text-purple-900/80">{formData.summary.whatWentWell.join(" ")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diary Page Footer & Subtle Page Number */}
      <div className="relative z-20 pt-6 mt-6 border-t border-pink-100/80 flex items-center justify-between text-xs text-purple-900/60 font-serif">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-pink-600/80 italic">
            <BookOpen className="w-3.5 h-3.5 text-pink-500" />
            <span>SoulSelf Sanctuary • Page {pageNumber}</span>
          </div>

          {onDelete && !isEditing && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-[11px] text-rose-500/80 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Page</span>
            </button>
          )}
        </div>

        {/* Deterministic Page Number in Corner */}
        <div className="font-serif-title text-base sm:text-lg font-bold text-purple-900/70 tracking-widest px-3 py-1 rounded-full bg-pink-50/80 border border-pink-100">
          {pageNumber}
        </div>
      </div>

      {/* Sticker Drawer */}
      <StickerDrawer
        isOpen={isStickerDrawerOpen}
        onClose={() => setIsStickerDrawerOpen(false)}
        onAddSticker={handleAddSticker}
      />

      {/* Delete Page Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-pink-200 animate-scale-in text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto text-xl shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif-title text-xl font-bold text-purple-950">
                Delete Page {pageNumber}?
              </h3>
              <p className="text-xs text-purple-900/70 font-serif leading-relaxed">
                Are you sure you want to tear out and delete{" "}
                <span className="font-bold text-purple-950">
                  "{formData.title || "Untitled Journal"}"
                </span>{" "}
                from your diary?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Keep Page
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete Page"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
