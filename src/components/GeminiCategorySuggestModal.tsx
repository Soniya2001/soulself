import React, { useState } from "react";
import { Sparkles, Check, X, Tag } from "lucide-react";

interface GeminiCategorySuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedCategories: string[];
  reasoning: string;
  onApplyCategories: (categories: string[]) => void;
}

export const GeminiCategorySuggestModal: React.FC<GeminiCategorySuggestModalProps> = ({
  isOpen,
  onClose,
  suggestedCategories,
  reasoning,
  onApplyCategories,
}) => {
  const [selected, setSelected] = useState<string[]>(suggestedCategories);

  // Sync state when suggestions change
  React.useEffect(() => {
    setSelected(suggestedCategories);
  }, [suggestedCategories]);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selected.includes(cat)) {
      setSelected(selected.filter((c) => c !== cat));
    } else {
      setSelected([...selected, cat]);
    }
  };

  const handleApply = () => {
    onApplyCategories(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl border border-pink-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pink-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-purple-950">
                Gemini Category Suggestions
              </h3>
              <p className="text-[11px] text-purple-900/60 font-serif">
                Review and select which categories you'd like to apply
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

        {/* Reasoning quote */}
        {reasoning && (
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-purple-950 font-serif italic mb-4">
            "{reasoning}"
          </div>
        )}

        {/* Suggestions Checkboxes */}
        <div className="space-y-2 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900/50 mb-2">
            Suggested Tags (Check to add):
          </div>

          {suggestedCategories.length === 0 ? (
            <p className="text-xs text-purple-900/60 font-serif italic">
              No categories identified. Feel free to pick manually!
            </p>
          ) : (
            suggestedCategories.map((cat) => {
              const isChecked = selected.includes(cat);
              return (
                <div
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isChecked
                      ? "bg-pink-50 border-pink-300 shadow-2xs"
                      : "bg-white border-pink-100 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Tag className="w-3.5 h-3.5 text-pink-500" />
                    <span className="text-xs font-serif font-bold text-purple-950">
                      {cat}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isChecked ? "bg-pink-500 text-white" : "border border-gray-300"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-purple-900/60 hover:text-purple-950 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selected.length === 0}
            className="px-5 py-2 rounded-full bg-purple-950 hover:bg-purple-900 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            Apply ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
};
