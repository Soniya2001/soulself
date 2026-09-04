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
  Music,
} from "lucide-react";
import { JournalEntry, StickerPlacement, MoodType, JournalMedia, JournalLocation, JournalMusicTrack } from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { StickerDrawer } from "./StickerDrawer";
import { MusicSearchModal } from "./MusicSearchModal";
import { MusicStickerCard } from "./MusicStickerCard";
import { JournalPageLayout } from "./JournalPageLayout";
import { audioManager } from "../utils/audio";
import { POPULAR_LOCATIONS } from "../data/initialData";
import {
  resolveLocationFromName,
  detectCurrentLocation,
  savePreferredLocation,
  geocodeLocation,
  searchLocationsDynamic,
  LocationSearchResult,
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
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isMusicSearchOpen, setIsMusicSearchOpen] = useState(false);

  // Requirement 3, 4, 12: Real-time debounced location search autocomplete
  useEffect(() => {
    if (customLocationText.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      const results = await searchLocationsDynamic(customLocationText.trim());
      setSearchResults(results);
      setIsSearchingLocation(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [customLocationText]);

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    const resolved: JournalLocation = {
      name: result.displayName,
      country: result.country || "Earth",
      latitude: result.latitude,
      longitude: result.longitude,
    };
    const next = { ...formData, location: resolved };
    setFormData(next);
    savePreferredLocation(resolved);
    setCustomLocationText("");
    setSearchResults([]);
    setIsLocationPopoverOpen(false);
    audioManager.playGentleTap();
    if (!isEditing) {
      onSave(next);
    }
    showToast(`Location updated to ${result.displayName} 📍`);
  };

  // Music handlers
  const handleSelectMusicTrack = (track: JournalMusicTrack) => {
    const updated = { ...formData, music: track };
    setFormData(updated);
    if (!isEditing) {
      onSave(updated);
    }
    audioManager.playGentleTap();
    showToast(`Music attached: "${track.title}" 🎵`);
  };

  const handleRemoveMusic = () => {
    const updated = { ...formData, music: null };
    setFormData(updated);
    if (!isEditing) {
      onSave(updated);
    }
    audioManager.playGentleTap();
    showToast("Music attachment removed 🌸");
  };

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
    <>
      <JournalPageLayout
        entry={entry}
        isEditing={isEditing}
        pageNumber={pageNumber}
        title={formData.title || ""}
        content={formData.content || ""}
        date={formData.date || ""}
        time={formData.time || ""}
        mood={formData.mood || "Happy"}
        moodEmoji={formData.moodEmoji || "😊"}
        weather={formData.weather}
        categories={formData.categories || []}
        location={formData.location}
        music={formData.music}
        media={formData.media || []}
        stickers={formData.stickers || []}
        summary={formData.summary}
        isFavorite={formData.isFavorite}
        onTitleChange={(t) => setFormData((prev) => ({ ...prev, title: t }))}
        onContentChange={(c) => setFormData((prev) => ({ ...prev, content: c }))}
        onDateChange={(d) => setFormData((prev) => ({ ...prev, date: d }))}
        onTimeChange={(tm) => setFormData((prev) => ({ ...prev, time: tm }))}
        onMoodChange={(m, emoji) =>
          setFormData((prev) => ({ ...prev, mood: m, moodEmoji: emoji }))
        }
        onWeatherChange={(w) => setFormData((prev) => ({ ...prev, weather: w }))}
        onLocationClick={() =>
          isEditing && setIsLocationPopoverOpen(!isLocationPopoverOpen)
        }
        onOpenMusicSearch={() => setIsMusicSearchOpen(true)}
        onRemoveMusic={handleRemoveMusic}
        onRemovePhoto={(photoId) => handleRemovePhoto(photoId, true)}
        onPhotoCaptionChange={(photoId, caption) => {
          const updatedMedia = (formData.media || []).map((m) =>
            m.id === photoId ? { ...m, caption } : m
          );
          setFormData({ ...formData, media: updatedMedia });
        }}
        onUpdateSticker={handleUpdateSticker}
        onRemoveSticker={handleRemoveSticker}
        toastMessage={toastMessage}
        onDismissToast={() => setToastMessage(null)}
        headerActions={
          isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsStickerDrawerOpen(true)}
                className="px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                title="Add Stickers to this page"
              >
                <Smile className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sticker</span>
              </button>

              <label className="px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                <span className="hidden sm:inline">+ Photo</span>
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

              <button
                type="button"
                onClick={() => setIsMusicSearchOpen(true)}
                className="px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                title="Attach music to this page"
              >
                <Music className="w-3.5 h-3.5 text-pink-500" />
                <span className="hidden sm:inline">
                  {formData.music ? "Change Music" : "+ Music"}
                </span>
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
            </>
          ) : (
            <>
              <button
                type="button"
                id={`edit-journal-page-${pageNumber}-btn`}
                onClick={handleStartEdit}
                className="px-4 py-1.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-pink-300" />
                <span>Edit ✎</span>
              </button>

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
          )
        }
      />

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
      {/* High Z-Index Location Selector Modal at Top Level */}
      {isLocationPopoverOpen && (
        <div className="fixed inset-0 z-[99999] bg-pink-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-purple-950">
          <div
            className="relative w-full max-w-md bg-white opacity-100 rounded-3xl p-6 shadow-2xl border-2 border-pink-300 z-[100000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-100">
              <div className="text-base font-bold font-serif text-purple-950 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-pink-500" />
                <span>Edit Page Location</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationPopoverOpen(false)}
                className="text-purple-400 hover:text-purple-700 p-1 rounded-full hover:bg-pink-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Confirmation Badge for Selected Location */}
            {formData.location && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-serif shadow-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formData.location.name}</span>
                </div>
                {typeof formData.location.latitude === "number" && typeof formData.location.longitude === "number" && (
                  <div className="text-xs font-mono text-emerald-800/90">
                    Latitude: {formData.location.latitude.toFixed(4)}° · Longitude: {formData.location.longitude.toFixed(4)}°
                  </div>
                )}
              </div>
            )}

            {/* GPS Detection */}
            <button
              type="button"
              onClick={handleDetectPageLocation}
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

            {/* Custom Location Search */}
            <form onSubmit={handleCustomLocationSubmit} className="mb-3.5">
              <label className="text-[11px] uppercase font-bold text-purple-900/60 block mb-1">
                Type any city or place name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLocationText}
                  onChange={(e) => setCustomLocationText(e.target.value)}
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

            {/* Real-Time Dynamic Search Autocomplete Candidates */}
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

            {/* Worldwide Quick Suggestions */}
            <div className="text-[11px] uppercase font-bold text-purple-900/60 mb-1.5">
              Quick Worldwide Suggestions:
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto mb-3.5 pr-1 custom-scrollbar">
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
                className="w-full pt-3 border-t border-pink-100 text-center text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
              >
                ✕ Remove Location from this Page
              </button>
            )}
          </div>
        </div>
      )}

      {/* Music Search Modal */}
      <MusicSearchModal
        isOpen={isMusicSearchOpen}
        onClose={() => setIsMusicSearchOpen(false)}
        onSelectTrack={handleSelectMusicTrack}
        currentTrack={formData.music}
      />
    </>
  );
};
