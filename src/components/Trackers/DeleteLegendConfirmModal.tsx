import React, { useState } from "react";
import { AlertTriangle, Trash2, RefreshCw, X } from "lucide-react";
import { TrackerLegendItem } from "../../types";

interface DeleteLegendConfirmModalProps {
  isOpen: boolean;
  itemToDelete: TrackerLegendItem;
  remainingLegendItems: TrackerLegendItem[];
  usageCount: number;
  onCancel: () => void;
  onConfirmClear: () => void;
  onConfirmReassign: (targetLegendId: string) => void;
}

export const DeleteLegendConfirmModal: React.FC<DeleteLegendConfirmModalProps> = ({
  isOpen,
  itemToDelete,
  remainingLegendItems,
  usageCount,
  onCancel,
  onConfirmClear,
  onConfirmReassign,
}) => {
  const [targetLegendId, setTargetLegendId] = useState<string>(
    remainingLegendItems[0]?.id || ""
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-pink-100 space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-purple-950">
                Delete Legend Item
              </h3>
              <p className="text-xs text-purple-900/60 flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-3 h-3 rounded-full inline-block border border-black/10"
                  style={{ backgroundColor: itemToDelete.color }}
                />
                <span className="font-semibold text-purple-950">{itemToDelete.label}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-purple-900/40 hover:text-purple-950 text-sm cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs space-y-2 text-purple-950">
          <p className="font-semibold">
            This color is currently used by{" "}
            <span className="text-amber-800 font-bold">{usageCount} day(s)</span> in your tracker.
          </p>
          <p className="text-purple-900/70">
            What would you like to do with the historical tracking data for these days?
          </p>
        </div>

        {/* Action Choices */}
        <div className="space-y-3">
          {/* Reassign Option */}
          {remainingLegendItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-200 space-y-2">
              <label className="block text-xs font-bold text-purple-950">
                Option 1: Reassign days to another color
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={targetLegendId}
                  onChange={(e) => setTargetLegendId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-pink-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  {remainingLegendItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => targetLegendId && onConfirmReassign(targetLegendId)}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reassign
                </button>
              </div>
            </div>
          )}

          {/* Clear Option */}
          <div className="p-3.5 rounded-2xl bg-red-50/50 border border-red-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-950">
                Option {remainingLegendItems.length > 0 ? "2" : "1"}: Clear those days
              </p>
              <p className="text-[11px] text-red-900/70">
                Unmark the affected days in your yearly grid.
              </p>
            </div>
            <button
              onClick={onConfirmClear}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Days
            </button>
          </div>
        </div>

        {/* Footer Cancel */}
        <div className="pt-2 flex justify-end border-t border-pink-100">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full border border-pink-200 text-xs text-purple-900 font-semibold hover:bg-pink-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
