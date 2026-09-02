import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Edit3,
  Check,
  X,
  Heart,
  Plus,
  Trash2,
  Camera,
  Smile,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { AboutMeData, StickerPlacement } from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { StickerDrawer } from "./StickerDrawer";
import { audioManager } from "../utils/audio";

interface AboutMeDiaryPageProps {
  data: AboutMeData;
  onSave: (updatedData: AboutMeData) => Promise<void> | void;
  pageNumber: number;
}

export const AboutMeDiaryPage: React.FC<AboutMeDiaryPageProps> = ({
  data,
  onSave,
  pageNumber = 1,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AboutMeData>(data);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Undo and toast states
  const [stickerHistory, setStickerHistory] = useState<StickerPlacement[][]>([]);
  const [lastDeletedPhoto, setLastDeletedPhoto] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; onUndo?: () => void } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setFormData(data);
    }
  }, [data, isEditing]);

  const showToast = (text: string, onUndo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, onUndo });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleStartEdit = () => {
    setFormData(data);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(data);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
      audioManager.playSaveChime();
      showToast("About Me saved ✨");
    } catch (err) {
      console.error("Failed to save About Me:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof AboutMeData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCustomFavorite = () => {
    const nextCustom = [
      ...(formData.customFavorites || []),
      { label: "My Favorite Thing", value: "" },
    ];
    setFormData((prev) => ({ ...prev, customFavorites: nextCustom }));
  };

  const handleCustomFavoriteChange = (index: number, field: "label" | "value", text: string) => {
    const nextCustom = [...(formData.customFavorites || [])];
    if (nextCustom[index]) {
      nextCustom[index] = { ...nextCustom[index], [field]: text };
      setFormData((prev) => ({ ...prev, customFavorites: nextCustom }));
    }
  };

  const handleRemoveCustomFavorite = (index: number) => {
    const currentCustom = formData.customFavorites || [];
    const removedItem = currentCustom[index];
    const nextCustom = currentCustom.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, customFavorites: nextCustom }));

    showToast(`Removed "${removedItem?.label || "Favorite"}"`, () => {
      const restored = [...nextCustom];
      restored.splice(index, 0, removedItem);
      setFormData((prev) => ({ ...prev, customFavorites: restored }));
      if (!isEditing) onSave({ ...formData, customFavorites: restored });
    });
  };

  // Sticker actions with Undo
  const handleAddSticker = (emoji: string) => {
    const currentStickers = formData.stickers || [];
    setStickerHistory((prev) => [...prev, currentStickers]);

    const newSticker: StickerPlacement = {
      id: `st-ab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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

    const nextStickers = currentStickers.map((s) =>
      s.id === updated.id ? updated : s
    );
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

  // Polaroid Photo Handlers
  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const url = e.target.result as string;
        const previousPhoto = formData.avatarUrl;
        setFormData((prev) => ({ ...prev, avatarUrl: url }));
        audioManager.playSparkleChime();
        if (!isEditing) {
          onSave({ ...formData, avatarUrl: url });
        }
        showToast("Profile photo updated!", () => {
          setFormData((prev) => ({ ...prev, avatarUrl: previousPhoto }));
          if (!isEditing) onSave({ ...formData, avatarUrl: previousPhoto });
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    const previousPhoto = formData.avatarUrl;
    if (!previousPhoto) return;
    setLastDeletedPhoto(previousPhoto);
    setFormData((prev) => ({ ...prev, avatarUrl: undefined }));
    audioManager.playGentleTap();
    if (!isEditing) {
      onSave({ ...formData, avatarUrl: undefined });
    }
    showToast("Photo removed", () => {
      setFormData((prev) => ({ ...prev, avatarUrl: previousPhoto }));
      if (!isEditing) onSave({ ...formData, avatarUrl: previousPhoto });
    });
  };

  const fieldsList: { key: keyof AboutMeData; label: string; icon: string; placeholder: string }[] = [
    { key: "name", label: "Name", icon: "🌸", placeholder: "What shall this diary call you?" },
    { key: "age", label: "Age", icon: "🎂", placeholder: "e.g. 24" },
    { key: "dateOfBirth", label: "Date of Birth", icon: "📅", placeholder: "YYYY-MM-DD" },
    { key: "favoriteFood", label: "Favorite Food", icon: "🍵", placeholder: "Matcha, croissants, warm ramen..." },
    { key: "favoriteMovie", label: "Favorite Movie", icon: "🎬", placeholder: "Movies that comfort your heart..." },
    { key: "favoriteActor", label: "Favorite Actor", icon: "✨", placeholder: "Actors who inspire you..." },
    { key: "favoriteMusic", label: "Favorite Music", icon: "🎶", placeholder: "Songs, bands, lo-fi genres..." },
    { key: "favoriteBook", label: "Favorite Book", icon: "📖", placeholder: "Books you cherish rereading..." },
    { key: "favoriteColor", label: "Favorite Color", icon: "🎨", placeholder: "Soft lilac, sage green, blush..." },
    { key: "favoritePlace", label: "Favorite Place", icon: "📍", placeholder: "Quiet cafe, Kyoto garden, home..." },
    { key: "myBias", label: "My Bias", icon: "💜", placeholder: "Your favorite artist, idol, or idol group..." },
    { key: "otherFavorites", label: "Other Favorites", icon: "🎀", placeholder: "Scented candles, rain, stationery..." },
  ];

  return (
    <div
      ref={pageRef}
      id="diary-page-about-me"
      className="relative w-full min-h-[640px] sm:min-h-[720px] bg-[#FFFDFB] diary-paper-lined rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-inner flex flex-col justify-between overflow-hidden select-text transition-all"
    >
      {/* Decorative Washi Tape Accent on Top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-28 h-5 bg-pink-200/75 backdrop-blur-xs opacity-90 rotate-1 rounded-xs pointer-events-none shadow-2xs z-10 border border-pink-300/40" />

      {/* Ribbon Bookmark visual in corner */}
      <div className="absolute top-0 right-10 w-5 h-12 bg-gradient-to-b from-pink-400 to-rose-400 rounded-b-md shadow-sm pointer-events-none z-10 opacity-85" />

      {/* Red margin guideline on lined paper */}
      <div className="absolute left-8 sm:left-12 top-0 bottom-0 w-[1.5px] bg-rose-300/40 pointer-events-none" />

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

      {/* Main Content Area */}
      <div className="relative z-20 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pink-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100/90 text-pink-700 flex items-center justify-center text-xl shadow-2xs">
              <span>✨</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-pink-700 font-sans-ui block">
                Introductory Page • SoulSelf Diary
              </span>
              <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-purple-950 flex items-center gap-2">
                ✨ About Me
              </h2>
            </div>
          </div>

          {/* Edit / Save / Sticker Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsStickerDrawerOpen(true)}
              className="px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              title="Place Stickers"
            >
              <Smile className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sticker</span>
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
              <button
                type="button"
                id="edit-about-me-btn"
                onClick={handleStartEdit}
                className="px-4 py-1.5 rounded-full bg-purple-950 hover:bg-purple-900 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-pink-300" />
                <span>Edit ✎</span>
              </button>
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
                  id="save-about-me-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Page 🌸"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Intro Banner with Polaroid Photo & Motto */}
        <div className="bg-pink-50/60 rounded-2xl p-4 border border-pink-100/90 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Polaroid Picture Frame */}
          <div className="relative group shrink-0 bg-white p-2 pb-3 rounded-xl shadow-md border border-pink-200/80 -rotate-2 hover:rotate-0 transition-transform">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-pink-200/80 rounded-xs pointer-events-none" />
            
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-pink-100 flex items-center justify-center relative">
              {formData.avatarUrl ? (
                <>
                  <img
                    src={formData.avatarUrl}
                    alt={formData.name || "My Portrait"}
                    className="w-full h-full object-cover"
                  />
                  {/* Delete Photo Button */}
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Remove Photo"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center opacity-90 group-hover:opacity-100 shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center gap-1 text-pink-400 hover:text-pink-600 cursor-pointer p-2 text-center">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-serif font-bold">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePhotoUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <p className="text-[10px] font-handwriting text-purple-900 text-center mt-1 truncate max-w-[110px]">
              {formData.name || "Me"}
            </p>
          </div>

          <div className="flex-1 w-full">
            <p className="font-serif italic text-xs sm:text-sm text-purple-900/80 leading-relaxed">
              {formData.dreamQuote ||
                "“To know yourself is the beginning of all wisdom. Welcome to the gentle sanctuary of your thoughts.”"}
            </p>
            {isEditing && (
              <div className="mt-2">
                <label className="text-[10px] uppercase font-bold text-pink-700 block mb-0.5">
                  Dream Quote / Personal Motto:
                </label>
                <input
                  type="text"
                  value={formData.dreamQuote || ""}
                  onChange={(e) => handleFieldChange("dreamQuote", e.target.value)}
                  placeholder="Enter a quote or intention that guides your days..."
                  className="w-full text-xs font-serif bg-white/90 border border-pink-200 rounded-xl px-3 py-1.5 text-purple-950 focus:outline-none focus:ring-1 focus:ring-pink-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* About Me Diary Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-1">
          {fieldsList.map((item) => {
            const val = formData[item.key] as string;
            return (
              <div
                key={item.key}
                className="bg-white/85 rounded-2xl p-3.5 border border-pink-100 shadow-2xs hover:border-pink-200 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900/80 mb-1 font-serif">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {!isEditing ? (
                  <p className="text-xs sm:text-sm font-handwriting text-purple-950 text-base sm:text-lg min-h-[22px] break-words">
                    {val ? val : <span className="text-purple-300 font-sans text-xs italic">Not written yet</span>}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={val || ""}
                    onChange={(e) => handleFieldChange(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full text-xs sm:text-sm font-serif bg-pink-50/50 border border-pink-200/80 rounded-xl px-3 py-1.5 text-purple-950 placeholder:text-purple-300 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Hobbies / Freeform Favorites Section */}
        <div className="bg-white/85 rounded-2xl p-4 border border-pink-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-serif text-purple-900/90 flex items-center gap-1.5">
              <span>🎨</span> Hobbies & Passions:
            </span>
          </div>
          {!isEditing ? (
            <p className="text-xs sm:text-sm font-serif text-purple-900/90 leading-relaxed min-h-[24px]">
              {formData.hobbies || <span className="text-purple-300 italic text-xs">Nothing noted yet.</span>}
            </p>
          ) : (
            <textarea
              value={formData.hobbies || ""}
              onChange={(e) => handleFieldChange("hobbies", e.target.value)}
              placeholder="Watercolor painting, cafe hopping, photography, cozy rainy afternoon reading..."
              rows={2}
              className="w-full text-xs font-serif bg-pink-50/50 border border-pink-200/80 rounded-xl p-2.5 text-purple-950 focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          )}
        </div>

        {/* Custom Favorites Additions */}
        {((formData.customFavorites && formData.customFavorites.length > 0) || isEditing) && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold font-serif text-purple-900">
              <span className="flex items-center gap-1.5">
                <span>✨</span> Additional Favorites:
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddCustomFavorite}
                  className="px-2.5 py-1 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Favorite Item</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(formData.customFavorites || []).map((fav, index) => (
                <div
                  key={index}
                  className="bg-white/90 rounded-2xl p-3 border border-pink-100 shadow-2xs relative group"
                >
                  {!isEditing ? (
                    <div>
                      <span className="text-[11px] font-bold text-pink-700 font-serif block mb-0.5">
                        {fav.label || "Favorite"}:
                      </span>
                      <p className="text-xs sm:text-sm font-handwriting text-purple-950 text-base">
                        {fav.value || <span className="text-purple-300 font-sans text-xs italic">Unspecified</span>}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <input
                          type="text"
                          value={fav.label}
                          onChange={(e) => handleCustomFavoriteChange(index, "label", e.target.value)}
                          placeholder="Label (e.g. Dream Destination)"
                          className="w-full text-xs font-bold text-pink-700 bg-pink-50/60 rounded-lg px-2 py-1 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomFavorite(index)}
                          className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={fav.value}
                        onChange={(e) => handleCustomFavoriteChange(index, "value", e.target.value)}
                        placeholder="Value..."
                        className="w-full text-xs font-serif bg-pink-50/30 rounded-lg px-2 py-1 text-purple-950 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diary Page Footer & Subtle Page Number */}
      <div className="relative z-20 pt-6 mt-6 border-t border-pink-100/80 flex items-center justify-between text-xs text-purple-900/60 font-serif">
        <div className="flex items-center gap-1.5 text-pink-600/80 italic">
          <Heart className="w-3.5 h-3.5 fill-pink-300 text-pink-400" />
          <span>SoulSelf Sanctuary • Page 1</span>
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
    </div>
  );
};
