import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Plus, BookOpen, Calendar as CalIcon } from "lucide-react";
import { JournalEntry } from "../types";

interface JournalCalendarProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteForDate: (dateStr: string) => void;
}

export const JournalCalendar: React.FC<JournalCalendarProps> = ({
  entries,
  onSelectEntry,
  onWriteForDate,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 1)); // Sept 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Map entries to YYYY-MM-DD
  const entriesByDate: Record<string, JournalEntry[]> = {};
  entries.forEach((entry) => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date].push(entry);
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calendar cells
  const calendarCells = [];
  // Empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  return (
    <div
      id="journal-calendar-card"
      className="bg-white rounded-[36px] p-6 sm:p-8 border border-pink-100/70 shadow-xs mb-8"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950">
              JOURNAL CALENDAR
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-purple-950">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-pink-50 text-purple-900 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-purple-900 bg-pink-50 hover:bg-pink-100 border border-pink-100 transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-pink-50 text-purple-900 transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekdays.map((w, idx) => (
          <div
            key={w}
            className={`text-xs font-semibold py-1 uppercase tracking-wider ${
              idx === 0 || idx === 6 ? "text-pink-400" : "text-[#8B6E92]"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-2xl bg-transparent" />;
          }

          const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = entriesByDate[dayStr] || [];
          const hasJournal = dayEntries.length > 0;
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          // Choose marker icon for journal day
          const markerEmoji = hasJournal
            ? dayEntries[0]?.moodEmoji || "🌸"
            : "";

          return (
            <div
              key={`day-${day}`}
              id={`calendar-day-${dayStr}`}
              onClick={() => {
                if (hasJournal) {
                  onSelectEntry(dayEntries[0]);
                } else {
                  onWriteForDate(dayStr);
                }
              }}
              className={`group relative h-14 sm:h-16 p-1.5 sm:p-2 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                hasJournal
                  ? "bg-gradient-to-br from-pink-50/90 via-pink-100/40 to-purple-50/80 border-pink-200/90 hover:shadow-md hover:shadow-pink-200/50 hover:scale-[1.03]"
                  : "bg-white/50 border-pink-100/40 hover:bg-pink-50/40 hover:border-pink-200/60"
              } ${isToday ? "ring-2 ring-pink-400 ring-offset-1" : ""}`}
            >
              {/* Day Number and status */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${
                    hasJournal
                      ? "text-pink-700"
                      : isToday
                      ? "text-pink-600 font-bold"
                      : "text-[#6E5474]"
                  }`}
                >
                  {day}
                </span>

                {isToday && !hasJournal && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                )}
              </div>

              {/* Journal Indicator / Sticker icon */}
              <div className="flex items-center justify-center">
                {hasJournal ? (
                  <div className="flex items-center gap-0.5">
                    <span className="text-base sm:text-lg animate-sway drop-shadow-xs">
                      {markerEmoji}
                    </span>
                    {dayEntries.length > 1 && (
                      <span className="text-[10px] font-bold text-pink-600 bg-white/80 rounded-full px-1">
                        +{dayEntries.length - 1}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] text-pink-400 font-medium gap-0.5">
                    <Plus className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Summary */}
      <div className="mt-4 pt-3 border-t border-pink-100/70 flex flex-wrap items-center justify-between gap-3 text-xs text-[#7E6584]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌸</span>
            <span>Journaled Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-pink-400 bg-pink-100" />
            <span>Today</span>
          </div>
        </div>

        <div className="text-[11px] text-pink-700 font-medium">
          Click any date to view or write a memory ✨
        </div>
      </div>
    </div>
  );
};
