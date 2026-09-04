import React from "react";
import { Lock, FileText } from "lucide-react";
import { TrackerDoc, TrackerEntryDoc, TrackerLegendItem } from "../../types";

interface YearlyPixelGridProps {
  tracker: TrackerDoc;
  entries: Record<string, TrackerEntryDoc>;
  legendMap: Record<string, TrackerLegendItem>;
  onCellClick: (dateStr: string, formattedDate: string) => void;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const YearlyPixelGrid: React.FC<YearlyPixelGridProps> = ({
  tracker,
  entries,
  legendMap,
  onCellClick,
}) => {
  // Parse tracker start and end dates
  const start = new Date(tracker.startDate || new Date().toISOString().split("T")[0]);
  const end = tracker.endDate ? new Date(tracker.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

  // Determine target year(s) for the grid columns
  const startYear = start.getFullYear();

  // Utility to calculate days in month for a given year & month (0-indexed month)
  const getDaysInMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  // Generate Month Columns info spanning from start date to end date
  const startMonthIdx = start.getMonth(); // 0..11
  const endMonthIdx = end.getMonth();
  const endYear = end.getFullYear();

  let totalMonths = (endYear - startYear) * 12 + (endMonthIdx - startMonthIdx) + 1;
  if (isNaN(totalMonths) || totalMonths < 12) totalMonths = 12;

  const monthsList = [];
  for (let i = 0; i < totalMonths; i++) {
    const monthIdx = (startMonthIdx + i) % 12;
    const yearOffset = Math.floor((startMonthIdx + i) / 12);
    const colYear = startYear + yearOffset;
    const daysInMonth = getDaysInMonth(colYear, monthIdx);

    monthsList.push({
      monthIndex: monthIdx,
      monthName: MONTH_NAMES[monthIdx],
      year: colYear,
      daysInMonth,
    });
  }

  // Days 1 to 31
  const dayRows = Array.from({ length: 31 }, (_, i) => i + 1);

  // Date formatting helper
  const formatDateString = (year: number, monthIndex: number, day: number) => {
    const m = String(monthIndex + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const formatHumanDate = (year: number, monthIndex: number, day: number) => {
    const monthFull = new Date(year, monthIndex).toLocaleString("default", { month: "long" });
    return `${monthFull} ${day}, ${year}`;
  };

  return (
    <div className="bg-white rounded-[32px] p-4 sm:p-8 border border-pink-100 shadow-sm space-y-6">
      {/* Grid Container Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100 pb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-purple-950">
            Year in Pixels Grid
          </h3>
          <p className="text-xs text-purple-900/60 font-serif italic">
            Click any active cell to fill with your chosen color or record a note.
          </p>
        </div>

        {/* Dynamic State Key Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-purple-900/70">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs border border-pink-300 bg-white inline-block shadow-2xs" />
            <span>Active (Unmarked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-xs bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] text-slate-400">
              <Lock className="w-2.5 h-2.5" />
            </div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-pink-500 inline-block shadow-2xs" />
            <span>Marked Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📝</span>
            <span>Has Note</span>
          </div>
        </div>
      </div>

      {/* Grid Table Container (Scrollable horizontally on small screens) */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 pb-2">
        <div style={{ minWidth: `${monthsList.length * 52 + 40}px` }}>
          {/* Month Headers Row */}
          <div
            className="gap-1 mb-2 text-center text-xs font-bold text-purple-950 uppercase tracking-wider"
            style={{
              display: "grid",
              gridTemplateColumns: `36px repeat(${monthsList.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="text-purple-900/40 font-mono text-[10px] self-center">Day</div>
            {monthsList.map((m) => (
              <div
                key={`${m.year}-${m.monthIndex}`}
                className="py-1 bg-pink-50/60 rounded-lg border border-pink-100/70 font-serif"
              >
                <span>{m.monthName}</span>
                {m.year !== startYear && (
                  <span className="block text-[8px] text-purple-900/40 font-mono font-normal">
                    '{String(m.year).slice(2)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 31 Rows of Cells */}
          <div className="space-y-1">
            {dayRows.map((dayNum) => (
              <div
                key={dayNum}
                className="gap-1 items-center"
                style={{
                  display: "grid",
                  gridTemplateColumns: `36px repeat(${monthsList.length}, minmax(0, 1fr))`,
                }}
              >
                {/* Day Row Label */}
                <div className="text-center text-[11px] font-mono text-purple-900/50 font-bold select-none">
                  {dayNum}
                </div>

                {/* 12 Month Cells */}
                {monthsList.map((m) => {
                  // Check if dayNum exists in this month (e.g. Feb 30 does not exist)
                  if (dayNum > m.daysInMonth) {
                    return (
                      <div
                        key={`${m.year}-${m.monthIndex}-${dayNum}`}
                        className="h-6 rounded-xs bg-transparent"
                      />
                    );
                  }

                  const dateStr = formatDateString(m.year, m.monthIndex, dayNum);
                  const cellDate = new Date(m.year, m.monthIndex, dayNum);

                  // Compare with start and end dates (normalized to dates without time)
                  const cellTime = cellDate.getTime();
                  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
                  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

                  const isLocked = cellTime < startTime || cellTime > endTime;

                  const entry = entries[dateStr];
                  const legendItem = entry?.legendId ? legendMap[entry.legendId] : null;

                  if (isLocked) {
                    return (
                      <div
                        key={dateStr}
                        title={`${formatHumanDate(m.year, m.monthIndex, dayNum)} (Outside Tracker Period)`}
                        className="h-6 rounded-xs bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-300 select-none"
                      >
                        <Lock className="w-2.5 h-2.5 opacity-50" />
                      </div>
                    );
                  }

                  // Active Cell
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isToday = dateStr === todayStr;
                  const formattedHuman = formatHumanDate(m.year, m.monthIndex, dayNum);
                  const isMarked = !!legendItem;
                  const hasNote = !!entry?.note;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => onCellClick(dateStr, formattedHuman)}
                      title={`${formattedHuman}${isToday ? " (Today — Editable!)" : ""}${
                        legendItem ? `: ${legendItem.label}` : " (Unmarked)"
                      }${entry?.note ? ` — Note: "${entry.note}"` : ""}`}
                      className={`h-6 rounded-xs transition-all relative flex items-center justify-center group cursor-pointer border ${
                        isToday
                          ? "ring-2 ring-pink-500 border-pink-600 shadow-md scale-105 z-10"
                          : isMarked
                          ? "border-black/10 shadow-2xs hover:scale-110 hover:z-20 hover:shadow-md"
                          : "bg-white border-pink-200/90 hover:bg-pink-100/60 hover:border-pink-300 hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: legendItem ? legendItem.color : undefined,
                      }}
                    >
                      {/* Today Badge Indicator */}
                      {isToday && !isMarked && (
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-600 animate-ping" />
                      )}

                      {/* Subtle Note Indicator */}
                      {hasNote && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-950 border border-white flex items-center justify-center">
                          <div className="w-0.5 h-0.5 rounded-full bg-pink-300" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
