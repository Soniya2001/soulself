import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Palette, Check, Sparkles, Loader2 } from "lucide-react";
import { TrackerDoc, TrackerLegendItem } from "../../types";

// Curated SoulSelf Color Palette
export const SOULSELF_CURATED_PALETTE = [
  { hex: "#FDE047", name: "Soft Yellow" },
  { hex: "#FB923C", name: "Warm Orange" },
  { hex: "#FB7185", name: "Coral" },
  { hex: "#F472B6", name: "Soft Pink" },
  { hex: "#C084FC", name: "Lavender" },
  { hex: "#A855F7", name: "Purple" },
  { hex: "#38BDF8", name: "Light Blue" },
  { hex: "#2DD4BF", name: "Teal" },
  { hex: "#4ADE80", name: "Soft Green" },
  { hex: "#9CA3AF", name: "Muted Gray" },
];

interface CreateTrackerModalProps {
  isOpen: boolean;
  initialTracker?: TrackerDoc;
  onClose: () => void;
  onSave: (tracker: Partial<TrackerDoc>) => Promise<void> | void;
  onDeleteLegendRequest?: (item: TrackerLegendItem) => void;
}

export const CreateTrackerModal: React.FC<CreateTrackerModalProps> = ({
  isOpen,
  initialTracker,
  onClose,
  onSave,
  onDeleteLegendRequest,
}) => {
  const isEditing = !!initialTracker;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getOneYearLaterStr = (start: string) => {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const [name, setName] = useState<string>(initialTracker?.name || "");
  const [description, setDescription] = useState<string>(
    initialTracker?.description || ""
  );
  const [startDate, setStartDate] = useState<string>(
    initialTracker?.startDate || getTodayStr()
  );
  const [endDate, setEndDate] = useState<string>(
    initialTracker?.endDate || getOneYearLaterStr(initialTracker?.startDate || getTodayStr())
  );

  const defaultLegend: TrackerLegendItem[] = [
    { id: "leg-1", color: "#FDE047", label: "" },
  ];

  const [legendItems, setLegendItems] = useState<TrackerLegendItem[]>(
    initialTracker?.legend && initialTracker.legend.length > 0
      ? initialTracker.legend
      : defaultLegend
  );

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  const legendListRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) return null;

  const scrollLegendToBottomAndFocus = (targetIdx: number) => {
    setTimeout(() => {
      if (legendListRef.current) {
        legendListRef.current.scrollTo({
          top: legendListRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
      if (inputRefs.current[targetIdx]) {
        inputRefs.current[targetIdx]?.focus();
      }
    }, 60);
  };

  const handleAddLegendItem = (customColor?: string, customLabel?: string) => {
    const unusedColor =
      customColor ||
      SOULSELF_CURATED_PALETTE.find(
        (p) => !legendItems.some((l) => l.color.toLowerCase() === p.hex.toLowerCase())
      )?.hex ||
      SOULSELF_CURATED_PALETTE[legendItems.length % SOULSELF_CURATED_PALETTE.length].hex;

    const newItem: TrackerLegendItem = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      color: unusedColor,
      label: customLabel || "",
    };

    const newIndex = legendItems.length;
    setLegendItems((prev) => [...prev, newItem]);
    setActiveItemIndex(newIndex);
    scrollLegendToBottomAndFocus(newIndex);
  };

  const handleUpdateLegendItem = (index: number, updates: Partial<TrackerLegendItem>) => {
    setLegendItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const handleDeleteLegendItem = (index: number) => {
    setLegendItems((prev) => prev.filter((_, i) => i !== index));
    if (activeItemIndex === index) {
      setActiveItemIndex(null);
    } else if (activeItemIndex !== null && activeItemIndex > index) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  const handleSwatchClick = (hex: string, name: string) => {
    if (activeItemIndex !== null && activeItemIndex < legendItems.length) {
      handleUpdateLegendItem(activeItemIndex, { color: hex });
    } else {
      handleAddLegendItem(hex, name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trackerTitle = name.trim() || "My Year in Colors";

    if (legendItems.length === 0) {
      alert("Please add at least one color meaning to your legend.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialTracker?.id || `tracker-${Date.now()}`,
        name: trackerTitle,
        description: description.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        legend: legendItems,
      });
    } catch (err: any) {
      console.error("Tracker save submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-pink-100 space-y-6 my-8 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-100/70 border border-pink-200 text-pink-600 flex items-center justify-center text-xl">
              🌸
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-purple-950">
                {isEditing ? "Edit Tracker" : "Create New Tracker"}
              </h2>
              <p className="text-xs text-purple-900/60 font-serif italic">
                Define your title, dates, and custom color meanings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-purple-900/40 hover:text-purple-950 text-sm cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tracker Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider font-extrabold text-purple-950">
              Tracker Name <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Year in Colors, Reading Journey, Fitness Diary"
              className="w-full px-4 py-3 rounded-2xl bg-pink-50/40 border border-pink-200 text-sm text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 font-serif font-semibold"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider font-extrabold text-purple-900/70">
              Description <span className="text-[10px] text-purple-900/40 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A colorful way to track my days and memories throughout the year."
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl bg-pink-50/40 border border-pink-200 text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
          </div>

          {/* Start and End Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-extrabold text-purple-950">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-pink-50/40 border border-pink-200 text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-extrabold text-purple-900/70">
                End Date <span className="text-[10px] text-purple-900/40 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-pink-50/40 border border-pink-200 text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>

          {/* Legend Builder Header */}
          <div className="space-y-3 pt-2 border-t border-pink-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-600" />
                <h3 className="font-serif text-base font-bold text-purple-950">
                  Create Your Legend
                </h3>
              </div>
              <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
                {legendItems.length} colors
              </span>
            </div>

            {/* Legend Items Scrollable Container */}
            <div
              ref={legendListRef}
              className="space-y-2.5 max-h-64 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-pink-200"
            >
              {legendItems.map((item, idx) => {
                const isActive = activeItemIndex === idx;
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setActiveItemIndex(idx)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-pink-50 border-pink-400 ring-2 ring-pink-200 shadow-2xs"
                        : "bg-pink-50/40 border-pink-200/80 hover:bg-pink-50/70"
                    }`}
                  >
                    {/* Visual Color Picker Swatch */}
                    <div className="relative shrink-0" title="Click to change color">
                      <input
                        type="color"
                        value={item.color}
                        onChange={(e) => handleUpdateLegendItem(idx, { color: e.target.value })}
                        className="w-9 h-9 rounded-full border-2 border-white shadow-xs cursor-pointer opacity-0 absolute inset-0 z-10"
                      />
                      <div
                        className="w-9 h-9 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>

                    {/* Meaning Label Text Input */}
                    <input
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      required
                      value={item.label}
                      onFocus={() => setActiveItemIndex(idx)}
                      onChange={(e) => handleUpdateLegendItem(idx, { label: e.target.value })}
                      placeholder="e.g. Productive, Rainy, Summer"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-pink-200 text-xs font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-2xs"
                    />

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLegendItem(idx);
                      }}
                      className="p-2 rounded-xl text-pink-700/60 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Delete Legend Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Curated SoulSelf Color Palette Swatch Strip */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-purple-900/60 block mb-2">
                Click Swatch to Add or Change Selected Color:
              </span>
              <div className="flex flex-wrap gap-2">
                {SOULSELF_CURATED_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={`Set color ${c.name} (${c.hex})`}
                    onClick={() => handleSwatchClick(c.hex, c.name)}
                    className="w-7 h-7 rounded-full border-2 border-white shadow-2xs hover:scale-125 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Add Color Button */}
            <button
              type="button"
              onClick={() => handleAddLegendItem()}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-pink-400 bg-pink-50/60 hover:bg-pink-100/70 text-pink-700 text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4 text-pink-600" />
              <span>+ Add Color</span>
            </button>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-pink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-pink-200 text-xs font-semibold text-purple-900 hover:bg-pink-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-pink-100" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? "Save Changes" : "Create Tracker"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
