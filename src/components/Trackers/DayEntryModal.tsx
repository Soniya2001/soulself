import React, { useState, useEffect } from "react";
import { X, Check, Trash2, FileText, Calendar, Lock, ShieldAlert } from "lucide-react";
import { TrackerLegendItem, TrackerEntryDoc } from "../../types";

interface DayEntryModalProps {
  isOpen: boolean;
  dateStr: string; // YYYY-MM-DD
  formattedDateStr: string; // e.g. "September 5, 2026"
  legendItems: TrackerLegendItem[];
  existingEntry?: TrackerEntryDoc;
  onClose: () => void;
  onSave: (legendId: string, note?: string) => void;
  onClear: () => void;
}

export const DayEntryModal: React.FC<DayEntryModalProps> = ({
  isOpen,
  dateStr,
  formattedDateStr,
  legendItems,
  existingEntry,
  onClose,
  onSave,
  onClear,
}) => {
  const [selectedLegendId, setSelectedLegendId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const isFuture = dateStr > todayStr;
  const isEditable = isToday; // Only today's date can be edited

  useEffect(() => {
    if (existingEntry) {
      setSelectedLegendId(existingEntry.legendId || "");
      setNote(existingEntry.note || "");
    } else {
      setSelectedLegendId("");
      setNote("");
    }
  }, [existingEntry, dateStr, isOpen]);

  if (!isOpen) return null;

  const handleSelectLegend = (legendId: string) => {
    if (!isEditable) return;
    setSelectedLegendId(legendId);
  };

  const handleSave = () => {
    if (!isEditable) return;
    onSave(selectedLegendId, note.trim() || undefined);
  };

  const selectedLegendItem = legendItems.find((l) => l.id === selectedLegendId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-pink-100 space-y-5 animate-scale-up">
        {/* Date Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-pink-600">
              <Calendar className="w-4 h-4" />
              <h3 className="font-serif text-lg font-bold text-purple-950">
                {formattedDateStr}
              </h3>
            </div>
            {isToday ? (
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1 inline-block">
                ✨ Today's Active Entry
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>{isPast ? "Past Date (Uneditable)" : "Future Date (Locked)"}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-purple-900/40 hover:text-purple-950 text-sm cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-Only Banner Notice if Past/Future */}
        {!isEditable && (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Entries are editable for <span className="font-bold">today only</span>. Passed dates are preserved as read-only historical records.
            </p>
          </div>
        )}

        {/* Legend Choice Section */}
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider font-extrabold text-purple-900/60">
            {isEditable ? "Choose Color Meaning" : "Recorded Color Meaning"}
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-none">
            {legendItems.map((item) => {
              const isSelected = selectedLegendId === item.id;
              if (!isEditable && !isSelected) return null; // In read-only mode, only display selected legend item

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => handleSelectLegend(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-pink-50 border-pink-400 ring-2 ring-pink-300 text-purple-950 shadow-2xs"
                      : "bg-white border-pink-100 text-purple-900 hover:bg-pink-50/50 cursor-pointer"
                  } ${!isEditable ? "opacity-100 cursor-default" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full inline-block border border-black/10 shadow-2xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-pink-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}

            {!isEditable && !selectedLegendItem && (
              <div className="p-3 text-center text-xs text-purple-900/50 font-serif italic bg-pink-50/30 rounded-2xl border border-pink-100">
                No color entry was marked for this date.
              </div>
            )}
          </div>
        </div>

        {/* Daily Note Input (Editable for Today, Read-only text for Past/Future) */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-purple-900/70">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-pink-600" />
              <span>Daily Note</span>
            </span>
            {isEditable && (
              <span className="text-[10px] text-purple-900/40 font-normal">Optional 📝</span>
            )}
          </label>

          {isEditable ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Finished my project, had a serene morning walk..."
              rows={3}
              maxLength={300}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-pink-50/40 border border-pink-200 text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
          ) : (
            <div className="p-3.5 rounded-2xl bg-pink-50/30 border border-pink-100 text-xs text-purple-950 font-serif italic min-h-[60px]">
              {note ? `"${note}"` : "No note recorded for this date."}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-pink-100">
          {isEditable ? (
            <>
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-red-600 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-pink-200 text-xs text-purple-900 font-semibold hover:bg-pink-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Entry</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
