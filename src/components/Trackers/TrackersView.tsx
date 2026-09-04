import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Edit3,
  Calendar,
  Flame,
  CheckCircle2,
  PieChart,
  Trash2,
  RefreshCw,
  Loader2,
  Palette,
} from "lucide-react";
import {
  TrackerDoc,
  TrackerEntryDoc,
  TrackerLegendItem,
  TrackerStats,
} from "../../types";
import { YearlyPixelGrid } from "./YearlyPixelGrid";
import { CreateTrackerModal } from "./CreateTrackerModal";
import { DayEntryModal } from "./DayEntryModal";
import { DeleteLegendConfirmModal } from "./DeleteLegendConfirmModal";
import { getTrackerReflection } from "../../services/geminiClient";
import {
  saveTrackerDoc,
  deleteTrackerDoc,
  subscribeToTrackerEntries,
  saveTrackerEntryDoc,
  deleteTrackerEntryDoc,
  batchClearLegendDoc,
  batchReassignLegendDoc,
} from "../../services/firestoreService";

interface TrackersViewProps {
  userId: string;
  userName: string;
  trackers: TrackerDoc[];
  onSaveTracker: (tracker: Partial<TrackerDoc>) => Promise<void>;
  onDeleteTracker: (trackerId: string) => Promise<void>;
}

export const TrackersView: React.FC<TrackersViewProps> = ({
  userId,
  userName,
  trackers,
  onSaveTracker,
  onDeleteTracker,
}) => {
  const [activeTrackerId, setActiveTrackerId] = useState<string>("");
  const [entriesMap, setEntriesMap] = useState<Record<string, TrackerEntryDoc>>({});
  const [isEntriesLoading, setIsEntriesLoading] = useState<boolean>(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingTracker, setEditingTracker] = useState<TrackerDoc | undefined>(undefined);

  // Day Cell click modal state
  const [selectedDayDate, setSelectedDayDate] = useState<{ dateStr: string; formatted: string } | null>(null);

  // Legend Delete Confirmation Modal State
  const [legendToDelete, setLegendToDelete] = useState<TrackerLegendItem | null>(null);

  // Gemini Reflection state
  const [reflection, setReflection] = useState<{
    observation: string;
    pattern: string;
    suggestion: string;
  } | null>(null);
  const [isReflecting, setIsReflecting] = useState<boolean>(false);

  // Set default active tracker when trackers list loads
  useEffect(() => {
    if (trackers.length > 0 && !activeTrackerId) {
      setActiveTrackerId(trackers[0].id);
    }
  }, [trackers, activeTrackerId]);

  // Active tracker object
  const activeTracker = trackers.find((t) => t.id === activeTrackerId) || trackers[0];

  // Subscribe to entries for current active tracker
  useEffect(() => {
    if (!userId || !activeTracker?.id) {
      setEntriesMap({});
      setIsEntriesLoading(false);
      return;
    }

    setIsEntriesLoading(true);
    const unsubscribe = subscribeToTrackerEntries(
      userId,
      activeTracker.id,
      (entries) => {
        setEntriesMap(entries);
        setIsEntriesLoading(false);
      },
      (err) => {
        console.error("Tracker entries sub error:", err);
        setIsEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, activeTracker?.id]);

  // Build legend map for instant lookup: legendId -> TrackerLegendItem
  const legendMap: Record<string, TrackerLegendItem> = {};
  if (activeTracker?.legend) {
    activeTracker.legend.forEach((item) => {
      legendMap[item.id] = item;
    });
  }

  // Calculate real-time stats
  const calculateStats = (): TrackerStats => {
    if (!activeTracker) {
      return { activeDays: 0, markedDays: 0, currentStreak: 0 };
    }

    const start = new Date(activeTracker.startDate);
    const end = activeTracker.endDate
      ? new Date(activeTracker.endDate)
      : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active days count up to today or end date
    const effectiveEnd = end < today ? end : today;
    let activeDaysCount = 0;
    let currDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    while (currDate <= effectiveEnd) {
      activeDaysCount++;
      currDate.setDate(currDate.getDate() + 1);
    }

    // Marked days count
    const markedDaysCount = Object.keys(entriesMap).filter((dKey) => {
      const e = entriesMap[dKey];
      return e && e.legendId;
    }).length;

    // Calculate current streak leading up to today
    let streak = 0;
    let streakDate = new Date(today);

    while (streakDate >= start) {
      const dStr = streakDate.toISOString().split("T")[0];
      const entry = entriesMap[dStr];
      if (entry && entry.legendId) {
        streak++;
        streakDate.setDate(streakDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate most used legend item
    const countsByLegendId: Record<string, number> = {};
    (Object.values(entriesMap) as TrackerEntryDoc[]).forEach((e) => {
      if (e.legendId) {
        countsByLegendId[e.legendId] = (countsByLegendId[e.legendId] || 0) + 1;
      }
    });

    let mostUsedId: string | null = null;
    let maxCount = 0;
    Object.entries(countsByLegendId).forEach(([id, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedId = id;
      }
    });

    const mostUsedLegend = mostUsedId && legendMap[mostUsedId]
      ? { legend: legendMap[mostUsedId], count: maxCount }
      : undefined;

    return {
      activeDays: Math.max(activeDaysCount, 1),
      markedDays: markedDaysCount,
      currentStreak: streak,
      mostUsedLegendItem: mostUsedLegend,
    };
  };

  const stats = calculateStats();

  // Safe legend deletion handler
  const handleLegendDeleteCheck = (item: TrackerLegendItem) => {
    const usageCount = (Object.values(entriesMap) as TrackerEntryDoc[]).filter((e) => e.legendId === item.id).length;
    if (usageCount > 0) {
      setLegendToDelete(item);
    } else {
      // Direct delete from activeTracker legend
      const updatedLegend = activeTracker.legend.filter((l) => l.id !== item.id);
      onSaveTracker({ ...activeTracker, legend: updatedLegend });
    }
  };

  const handleConfirmClearLegend = async () => {
    if (!legendToDelete || !activeTracker) return;
    await batchClearLegendDoc(userId, activeTracker.id, legendToDelete.id);
    const updatedLegend = activeTracker.legend.filter((l) => l.id !== legendToDelete.id);
    await onSaveTracker({ ...activeTracker, legend: updatedLegend });
    setLegendToDelete(null);
  };

  const handleConfirmReassignLegend = async (targetLegendId: string) => {
    if (!legendToDelete || !activeTracker) return;
    await batchReassignLegendDoc(userId, activeTracker.id, legendToDelete.id, targetLegendId);
    const updatedLegend = activeTracker.legend.filter((l) => l.id !== legendToDelete.id);
    await onSaveTracker({ ...activeTracker, legend: updatedLegend });
    setLegendToDelete(null);
  };

  // Day Cell Save/Clear
  const handleSaveDayEntry = async (legendId: string, note?: string) => {
    if (!selectedDayDate || !activeTracker) return;
    await saveTrackerEntryDoc(userId, activeTracker.id, {
      date: selectedDayDate.dateStr,
      legendId,
      note,
      updatedAt: new Date().toISOString(),
    });
    setSelectedDayDate(null);
  };

  const handleClearDayEntry = async () => {
    if (!selectedDayDate || !activeTracker) return;
    await deleteTrackerEntryDoc(userId, activeTracker.id, selectedDayDate.dateStr);
    setSelectedDayDate(null);
  };

  // Empty state: User has no trackers yet
  if (trackers.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-pink-100/80 border border-pink-200 shadow-lg flex items-center justify-center text-4xl mx-auto animate-bounce">
          🌸
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-purple-950">
            Create Your First Yearly Color Tracker
          </h2>
          <p className="font-serif italic text-lg text-purple-900/70 max-w-lg mx-auto">
            "My Year, Expressed in Colors." Customize colors, define what each means, and watch your year transform into a colorful visual pattern.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTracker(undefined);
            setShowCreateModal(true);
          }}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 rounded-full shadow-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2.5 mx-auto transition-all hover:scale-105 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Tracker</span>
        </button>

        {showCreateModal && (
          <CreateTrackerModal
            isOpen={showCreateModal}
            initialTracker={editingTracker}
            onClose={() => setShowCreateModal(false)}
            onSave={async (newTracker) => {
              await onSaveTracker(newTracker);
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Trackers Gallery Section: List of All Created Trackers */}
      <div className="bg-white rounded-[32px] p-6 border border-pink-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100 pb-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-purple-950 flex items-center gap-2">
              <span>Your Trackers Gallery</span>
              <span className="text-xs font-mono font-bold bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full">
                {trackers.length} {trackers.length === 1 ? "tracker" : "trackers"}
              </span>
            </h2>
            <p className="text-xs text-purple-900/60 font-serif italic">
              Select a tracker to put entries for today, view grid, and receive Gemini reflections.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingTracker(undefined);
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Tracker</span>
          </button>
        </div>

        {/* List Grid of Tracker Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {trackers.map((t) => {
            const isSelected = t.id === activeTracker.id;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTrackerId(t.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  isSelected
                    ? "bg-pink-50/80 border-pink-400 ring-2 ring-pink-300 shadow-sm"
                    : "bg-pink-50/20 border-pink-100 hover:bg-pink-50/50 hover:border-pink-200"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-base text-purple-950 truncate flex items-center gap-1.5">
                      <span>🌸</span>
                      <span className="truncate">{t.name}</span>
                    </span>
                    {isSelected && (
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-600 bg-white px-2 py-0.5 rounded-full border border-pink-200 shadow-2xs">
                        Active
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-purple-900/60 font-serif italic line-clamp-1">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-pink-100/70 text-[11px] text-purple-900/60">
                  <span className="font-mono">Start: {t.startDate}</span>
                  <div className="flex items-center gap-1">
                    {t.legend.slice(0, 4).map((leg) => (
                      <span
                        key={leg.id}
                        className="w-2.5 h-2.5 rounded-full inline-block border border-black/10"
                        style={{ backgroundColor: leg.color }}
                      />
                    ))}
                    {t.legend.length > 4 && (
                      <span className="text-[9px] font-bold text-purple-900/50">
                        +{t.legend.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Header: Selected Active Tracker Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-pink-200/60 pb-6">
        <div className="space-y-2">
          {/* Tracker Title with edit icon */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌸</span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-purple-950 tracking-tight">
              {activeTracker.name}
            </h1>
            <button
              onClick={() => {
                setEditingTracker(activeTracker);
                setShowCreateModal(true);
              }}
              title="Edit Tracker Title & Legend"
              className="p-2 rounded-full hover:bg-pink-100/60 text-purple-900/60 hover:text-purple-950 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <p className="font-serif italic text-base sm:text-lg text-purple-900/70">
            {activeTracker.description || "A colorful way to track my days and memories."}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-purple-900/60">
            <span className="flex items-center gap-1 font-mono font-medium">
              <Calendar className="w-3.5 h-3.5 text-pink-600" />
              <span>Start: {activeTracker.startDate}</span>
            </span>
            {activeTracker.endDate && (
              <span className="flex items-center gap-1 font-mono font-medium">
                <span>• End: {activeTracker.endDate}</span>
              </span>
            )}
          </div>
        </div>

        {/* Tracker Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditingTracker(activeTracker);
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-purple-950 text-xs font-bold shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-pink-600" />
            <span>Edit Tracker</span>
          </button>
        </div>
      </div>

      {/* Statistics Header Overview (Requirement #13 & #14) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Days */}
        <div className="bg-white rounded-3xl p-5 border border-pink-100 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-600 block">
            Active Days
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl font-bold text-purple-950">
              {stats.activeDays}
            </h3>
            <span className="text-xs text-purple-900/50 font-mono font-medium">
              active period
            </span>
          </div>
          <p className="text-[11px] text-purple-900/60 font-serif italic">
            Calendar days within tracker period
          </p>
        </div>

        {/* Marked Days Progress */}
        <div className="bg-white rounded-3xl p-5 border border-pink-100 shadow-2xs space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-600 block">
            Marked Days
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl font-bold text-purple-950">
              {stats.markedDays}
            </h3>
            <span className="text-xs text-purple-950 font-bold font-mono">
              {((stats.markedDays / stats.activeDays) * 100).toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-pink-100/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (stats.markedDays / stats.activeDays) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-white rounded-3xl p-5 border border-pink-100 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-600 block">
            Current Streak
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-3xl font-bold text-purple-950 flex items-center gap-2">
              <span>{stats.currentStreak} days</span>
              {stats.currentStreak > 0 && <Flame className="w-5 h-5 text-orange-500 fill-orange-400" />}
            </h3>
          </div>
          <p className="text-[11px] text-purple-900/60 font-serif italic">
            {stats.currentStreak > 0 ? "Keep your rhythm going! 💜" : "Mark today to start a streak!"}
          </p>
        </div>

        {/* Most Used Legend Item */}
        <div className="bg-white rounded-3xl p-5 border border-pink-100 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-600 block">
            Most Used
          </span>
          {stats.mostUsedLegendItem ? (
            <div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-black/10 shrink-0"
                  style={{ backgroundColor: stats.mostUsedLegendItem.legend.color }}
                />
                <span className="font-serif text-xl font-bold text-purple-950 truncate">
                  {stats.mostUsedLegendItem.legend.label}
                </span>
              </div>
              <p className="text-xs text-purple-900/60 font-mono font-semibold mt-1">
                {stats.mostUsedLegendItem.count} days recorded
              </p>
            </div>
          ) : (
            <p className="text-xs text-purple-900/50 font-serif italic pt-1">
              Start marking days to reveal your top rhythm.
            </p>
          )}
        </div>
      </div>

      {/* Prominent User-Defined Color Legend Bar (Requirement #4 & #11) */}
      <div className="bg-white rounded-[28px] p-5 border border-pink-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest font-extrabold text-purple-950">
            Legend
          </span>
          <span className="text-[11px] text-purple-900/50 italic font-serif">
            User-Defined Meanings
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTracker.legend.map((item) => {
            const count = (Object.values(entriesMap) as TrackerEntryDoc[]).filter((e) => e.legendId === item.id).length;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-pink-50/50 border border-pink-100 shadow-2xs text-xs font-semibold text-purple-950"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-black/10 shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-pink-200 text-purple-900/60 font-mono">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year-in-Pixels Pixel Grid Component */}
      <YearlyPixelGrid
        tracker={activeTracker}
        entries={entriesMap}
        legendMap={legendMap}
        onCellClick={(dateStr, formatted) => {
          setSelectedDayDate({ dateStr, formatted });
        }}
      />

      {/* Create / Edit Tracker Modal */}
      {showCreateModal && (
        <CreateTrackerModal
          isOpen={showCreateModal}
          initialTracker={editingTracker}
          onClose={() => setShowCreateModal(false)}
          onSave={async (updatedTracker) => {
            try {
              await onSaveTracker(updatedTracker);
              if (updatedTracker.id) {
                setActiveTrackerId(updatedTracker.id);
              }
              setShowCreateModal(false);
            } catch (err: any) {
              console.error("Save tracker error:", err);
              alert("Unable to save tracker: " + (err.message || "Please try again."));
            }
          }}
          onDeleteLegendRequest={handleLegendDeleteCheck}
        />
      )}

      {/* Day Cell Entry Popover / Modal */}
      {selectedDayDate && (
        <DayEntryModal
          isOpen={!!selectedDayDate}
          dateStr={selectedDayDate.dateStr}
          formattedDateStr={selectedDayDate.formatted}
          legendItems={activeTracker.legend}
          existingEntry={entriesMap[selectedDayDate.dateStr]}
          onClose={() => setSelectedDayDate(null)}
          onSave={handleSaveDayEntry}
          onClear={handleClearDayEntry}
        />
      )}

      {/* Delete Legend Safe Confirmation Modal */}
      {legendToDelete && (
        <DeleteLegendConfirmModal
          isOpen={!!legendToDelete}
          itemToDelete={legendToDelete}
          remainingLegendItems={activeTracker.legend.filter((l) => l.id !== legendToDelete.id)}
          usageCount={
            (Object.values(entriesMap) as TrackerEntryDoc[]).filter((e) => e.legendId === legendToDelete.id).length
          }
          onCancel={() => setLegendToDelete(null)}
          onConfirmClear={handleConfirmClearLegend}
          onConfirmReassign={handleConfirmReassignLegend}
        />
      )}
    </div>
  );
};
