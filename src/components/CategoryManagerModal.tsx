import React, { useState } from "react";
import { Tag, Plus, Trash2, Check, Sparkles, X } from "lucide-react";
import { DEFAULT_CATEGORIES } from "../data/initialData";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCategories: string[];
  onAddCustomCategory: (name: string) => void;
  onRemoveCustomCategory: (name: string) => void;
}

const EMOJI_OPTIONS = ["🌱", "💼", "✈️", "📚", "💡", "🎉", "💕", "🏡", "🧘", "🎨", "🍵", "🌸", "⭐", "🌙", "🌊", "🔮", "🎵", "✍️"];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  customCategories,
  onAddCustomCategory,
  onRemoveCustomCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🌸");

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const formattedName = `${selectedEmoji} ${newCategoryName.trim()}`;
    onAddCustomCategory(formattedName);
    setNewCategoryName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl border border-pink-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-purple-950">
                Journal Categories
              </h3>
              <p className="text-xs text-purple-900/60 font-serif">
                Organize your diary entries by life themes and topics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-pink-50 text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Category Form */}
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-2xl bg-pink-50/50 border border-pink-100">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-950 mb-2">
            Create Custom Category
          </div>

          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            {EMOJI_OPTIONS.map((em) => (
              <button
                type="button"
                key={em}
                onClick={() => setSelectedEmoji(em)}
                className={`p-1.5 rounded-xl text-base transition-all ${
                  selectedEmoji === em
                    ? "bg-pink-500 text-white scale-110 shadow-xs"
                    : "bg-white hover:bg-pink-100 border border-pink-200/60"
                }`}
              >
                {em}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g. Cooking, Morning Routine)"
              className="flex-1 px-3.5 py-2 rounded-full bg-white border border-pink-200 text-xs text-purple-950 placeholder:text-purple-400/60 focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 rounded-full bg-purple-950 hover:bg-purple-900 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Categories List */}
        <div className="space-y-4">
          {/* Default Categories */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900/50 mb-2">
              Default Categories (Built-in)
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className="px-3 py-1.5 rounded-full bg-white border border-pink-100 text-xs font-serif text-purple-950 flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{cat.emoji}</span>
                  <span className="font-semibold">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Categories */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900/50 mb-2">
              Your Custom Categories ({customCategories.length})
            </div>
            {customCategories.length === 0 ? (
              <p className="text-xs text-purple-900/50 font-serif italic">
                No custom categories created yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customCategories.map((cName) => (
                  <div
                    key={cName}
                    className="px-3 py-1.5 rounded-full bg-pink-100 text-pink-900 border border-pink-200 text-xs font-serif flex items-center gap-2 shadow-2xs group"
                  >
                    <span>{cName}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCustomCategory(cName)}
                      className="text-pink-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-pink-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
