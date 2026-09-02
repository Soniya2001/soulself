import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Smile,
  CheckCircle2,
  Circle,
  Flame,
  Award,
  RotateCcw,
} from "lucide-react";
import { BucketListData, BucketListItem, StickerPlacement } from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { StickerDrawer } from "./StickerDrawer";
import { audioManager } from "../utils/audio";

interface BucketListDiaryPageProps {
  data: BucketListData;
  onSave: (updatedData: BucketListData) => Promise<void> | void;
  pageNumber: number;
}

export const BucketListDiaryPage: React.FC<BucketListDiaryPageProps> = ({
  data,
  onSave,
  pageNumber = 2,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [listData, setListData] = useState<BucketListData>(data);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [newItemEmoji, setNewItemEmoji] = useState("✨");
  const [newItemCategory, setNewItemCategory] = useState("Dream");

  // Undo and toast states
  const [stickerHistory, setStickerHistory] = useState<StickerPlacement[][]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; onUndo?: () => void } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setListData(data);
    }
  }, [data, isEditing]);

  const showToast = (text: string, onUndo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, onUndo });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleToggleComplete = async (itemId: string) => {
    const updatedItems = (listData.items || []).map((item) => {
      if (item.id === itemId) {
        const nextCompleted = !item.isCompleted;
        if (nextCompleted) {
          audioManager.playSparkleChime();
        }
        return {
          ...item,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString().split("T")[0] : undefined,
        };
      }
      return item;
    });

    const nextData = { ...listData, items: updatedItems };
    setListData(nextData);
    await onSave(nextData);
  };

  const handleStartEdit = () => {
    setListData(data);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setListData(data);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(listData);
      setIsEditing(false);
      audioManager.playSaveChime();
      showToast("Bucket List saved ✨");
    } catch (err) {
      console.error("Failed to save Bucket List:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem: BucketListItem = {
      id: `bl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: newItemText.trim(),
      isCompleted: false,
      emoji: newItemEmoji,
      category: newItemCategory,
    };
    const nextItems = [...(listData.items || []), newItem];
    const nextData = { ...listData, items: nextItems };
    setListData(nextData);
    setNewItemText("");
    audioManager.playSparkleChime();

    showToast(`Added wish: ${newItem.text}`, () => {
      const filtered = nextItems.filter((i) => i.id !== newItem.id);
      const revertedData = { ...listData, items: filtered };
      setListData(revertedData);
      if (!isEditing) onSave(revertedData);
    });
  };

  const handleDeleteItem = (id: string) => {
    const currentItems = listData.items || [];
    const itemToDelete = currentItems.find((i) => i.id === id);
    const itemIndex = currentItems.findIndex((i) => i.id === id);
    const nextItems = currentItems.filter((i) => i.id !== id);

    const nextData = { ...listData, items: nextItems };
    setListData(nextData);
    audioManager.playGentleTap();

    showToast(`Deleted wish "${itemToDelete?.text || ""}"`, () => {
      if (itemToDelete) {
        const restored = [...nextItems];
        restored.splice(itemIndex >= 0 ? itemIndex : 0, 0, itemToDelete);
        const restoredData = { ...listData, items: restored };
        setListData(restoredData);
        if (!isEditing) onSave(restoredData);
      }
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextItems = [...(listData.items || [])];
    const temp = nextItems[index - 1];
    nextItems[index - 1] = nextItems[index];
    nextItems[index] = temp;
    setListData({ ...listData, items: nextItems });
  };

  const handleMoveDown = (index: number) => {
    if (index >= (listData.items || []).length - 1) return;
    const nextItems = [...(listData.items || [])];
    const temp = nextItems[index + 1];
    nextItems[index + 1] = nextItems[index];
    nextItems[index] = temp;
    setListData({ ...listData, items: nextItems });
  };

  const handleItemTextChange = (id: string, text: string) => {
    const nextItems = (listData.items || []).map((item) =>
      item.id === id ? { ...item, text } : item
    );
    setListData({ ...listData, items: nextItems });
  };

  // Sticker actions with Undo
  const handleAddSticker = (emoji: string) => {
    const currentStickers = listData.stickers || [];
    setStickerHistory((prev) => [...prev, currentStickers]);

    const newSticker: StickerPlacement = {
      id: `st-bl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      emoji,
      x: 75 + Math.random() * 15,
      y: 15 + Math.random() * 40,
      scale: 1.2,
      rotation: Math.round(Math.random() * 30 - 15),
    };
    const nextStickers = [...currentStickers, newSticker];
    setListData((prev) => ({ ...prev, stickers: nextStickers }));
    audioManager.playSparkleChime();
    if (!isEditing) {
      onSave({ ...listData, stickers: nextStickers });
    }
    showToast("Sticker placed!", () => handleUndoSticker());
  };

  const handleUpdateSticker = (updated: StickerPlacement) => {
    const currentStickers = listData.stickers || [];
    setStickerHistory((prev) => [...prev, currentStickers]);

    const nextStickers = currentStickers.map((s) =>
      s.id === updated.id ? updated : s
    );
    setListData((prev) => ({ ...prev, stickers: nextStickers }));
    if (!isEditing) {
      onSave({ ...listData, stickers: nextStickers });
    }
  };

  const handleRemoveSticker = (stickerId: string) => {
    const currentStickers = listData.stickers || [];
    const removedItem = currentStickers.find((s) => s.id === stickerId);
    setStickerHistory((prev) => [...prev, currentStickers]);

    const nextStickers = currentStickers.filter((s) => s.id !== stickerId);
    setListData((prev) => ({ ...prev, stickers: nextStickers }));
    if (!isEditing) {
      onSave({ ...listData, stickers: nextStickers });
    }
    showToast(`Sticker ${removedItem?.emoji || ""} removed`, () => {
      if (removedItem) {
        const restored = [...nextStickers, removedItem];
        setListData((prev) => ({ ...prev, stickers: restored }));
        if (!isEditing) onSave({ ...listData, stickers: restored });
      }
    });
  };

  const handleUndoSticker = () => {
    if (stickerHistory.length === 0) return;
    const previousState = stickerHistory[stickerHistory.length - 1];
    setStickerHistory((prev) => prev.slice(0, -1));
    setListData((prev) => ({ ...prev, stickers: previousState }));
    if (!isEditing) {
      onSave({ ...listData, stickers: previousState });
    }
    audioManager.playGentleTap();
    showToast("Sticker action undone ↺");
  };

  const handleClearAllStickers = () => {
    const currentStickers = listData.stickers || [];
    if (currentStickers.length === 0) return;
    setStickerHistory((prev) => [...prev, currentStickers]);
    setListData((prev) => ({ ...prev, stickers: [] }));
    if (!isEditing) {
      onSave({ ...listData, stickers: [] });
    }
    audioManager.playGentleTap();
    showToast("All stickers cleared", () => {
      setListData((prev) => ({ ...prev, stickers: currentStickers }));
      if (!isEditing) onSave({ ...listData, stickers: currentStickers });
    });
  };

  const completedCount = (listData.items || []).filter((i) => i.isCompleted).length;
  const totalCount = (listData.items || []).length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const quickEmojis = ["🌸", "✈️", "🌌", "💻", "🎹", "📖", "🌿", "☕", "🏔️", "🎨", "✨", "🎀"];

  return (
    <div
      ref={pageRef}
      id="diary-page-bucket-list"
      className="relative w-full min-h-[640px] sm:min-h-[720px] bg-[#FFFDFB] diary-paper-lined rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-inner flex flex-col justify-between overflow-hidden select-text transition-all"
    >
      {/* Decorative Washi Tape Accent */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-32 h-5 bg-purple-200/70 backdrop-blur-xs opacity-90 -rotate-1 rounded-xs pointer-events-none shadow-2xs z-10 border border-purple-300/40" />

      {/* Ribbon Bookmark visual in corner */}
      <div className="absolute top-0 right-10 w-5 h-12 bg-gradient-to-b from-purple-400 to-indigo-400 rounded-b-md shadow-sm pointer-events-none z-10 opacity-85" />

      {/* Red margin guideline on lined paper */}
      <div className="absolute left-8 sm:left-12 top-0 bottom-0 w-[1.5px] bg-rose-300/40 pointer-events-none" />

      {/* Interactive Placed Stickers */}
      {(listData.stickers || []).map((st) => (
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

      {/* Main Content */}
      <div className="relative z-20 space-y-5">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pink-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100/90 text-purple-700 flex items-center justify-center text-xl shadow-2xs">
              <span>🌟</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-purple-700 font-sans-ui block">
                Introductory Page • SoulSelf Diary
              </span>
              <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-purple-950 flex items-center gap-2">
                ✨ My Bucket List
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

            {(listData.stickers || []).length > 0 && (
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
                id="edit-bucket-list-btn"
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
                  id="save-bucket-list-btn"
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

        {/* Progress Tracker Card */}
        <div className="bg-gradient-to-r from-pink-50/80 to-purple-50/80 rounded-2xl p-4 border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-purple-700 flex items-center justify-center font-bold text-sm shadow-2xs border border-pink-100">
              {completionPercent}%
            </div>
            <div>
              <p className="font-serif font-bold text-purple-950 text-sm">
                Dream Milestones Achieved
              </p>
              <p className="text-xs text-purple-900/70">
                {completedCount} of {totalCount} wishes fulfilled in this lifetime 🌸
              </p>
            </div>
          </div>

          <div className="w-full sm:w-44 bg-white rounded-full h-2.5 overflow-hidden p-0.5 border border-pink-100">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Add Item Form (Only when in Edit Mode) */}
        {isEditing && (
          <div className="bg-white/95 rounded-2xl p-4 border border-purple-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-serif text-purple-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-pink-600" />
                Add New Bucket List Wish:
              </span>
              <div className="flex items-center gap-1">
                {quickEmojis.slice(0, 6).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewItemEmoji(em)}
                    className={`w-6 h-6 text-xs rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      newItemEmoji === em ? "bg-pink-200 scale-110" : "hover:bg-pink-100"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg">{newItemEmoji}</span>
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                placeholder="e.g. Learn to play Debussy on piano, Visit Kyoto tea gardens..."
                className="flex-1 text-xs sm:text-sm font-serif bg-pink-50/50 border border-pink-200 rounded-xl px-3 py-2 text-purple-950 focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItemText.trim()}
                className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}

        {/* Bucket List Items Diary Render */}
        <div className="space-y-2.5 pt-1">
          {(!listData.items || listData.items.length === 0) && (
            <div className="text-center py-10 text-purple-900/60 font-serif italic text-sm">
              No bucket list dreams yet. Click "Edit ✎" to write your first wish! 🌟
            </div>
          )}

          {(listData.items || []).map((item, index) => {
            return (
              <div
                key={item.id}
                className={`group flex items-start sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                  item.isCompleted
                    ? "bg-pink-50/50 border-pink-200/70 text-purple-900/75 shadow-2xs"
                    : "bg-white/90 border-pink-100/90 text-purple-950 shadow-2xs hover:border-pink-200"
                }`}
              >
                {/* Checkbox and Text */}
                <div className="flex items-start sm:items-center gap-3 flex-1">
                  {/* Interactive Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(item.id)}
                    className="mt-0.5 sm:mt-0 p-1 text-purple-700 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    title={item.isCompleted ? "Mark incomplete" : "Mark completed"}
                  >
                    {item.isCompleted ? (
                      <div className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-pink-300 hover:border-pink-500 bg-white transition-colors" />
                    )}
                  </button>

                  <span className="text-base sm:text-lg select-none">{item.emoji || "✨"}</span>

                  {!isEditing ? (
                    <div className="flex-1">
                      <span
                        className={`text-xs sm:text-sm font-handwriting sm:text-base leading-snug transition-all ${
                          item.isCompleted
                            ? "line-through text-purple-900/50 italic"
                            : "text-purple-950 font-normal"
                        }`}
                      >
                        {item.text}
                      </span>
                      {item.isCompleted && item.completedAt && (
                        <span className="ml-2 text-[10px] text-pink-600/80 font-sans-ui bg-pink-100/70 px-2 py-0.5 rounded-full">
                          Completed {item.completedAt} 🌸
                        </span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleItemTextChange(item.id, e.target.value)}
                      className="flex-1 text-xs sm:text-sm font-serif bg-pink-50/50 border border-pink-200 rounded-lg px-2 py-1 text-purple-950 focus:outline-none"
                    />
                  )}
                </div>

                {/* Edit Controls (Reorder / Delete / Emoji) */}
                {isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-purple-600 hover:text-purple-950 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === (listData.items || []).length - 1}
                      className="p-1 text-purple-600 hover:text-purple-950 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                      title="Delete Wish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Diary Page Footer & Subtle Page Number */}
      <div className="relative z-20 pt-6 mt-6 border-t border-pink-100/80 flex items-center justify-between text-xs text-purple-900/60 font-serif">
        <div className="flex items-center gap-1.5 text-purple-600/80 italic">
          <Award className="w-3.5 h-3.5 text-purple-500" />
          <span>SoulSelf Sanctuary • Page 2</span>
        </div>

        {/* Deterministic Page Number in Corner */}
        <div className="font-serif-title text-base sm:text-lg font-bold text-purple-900/70 tracking-widest px-3 py-1 rounded-full bg-purple-50/80 border border-purple-100">
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
