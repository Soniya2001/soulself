import React from "react";
import {
  BookOpen,
  Calendar,
  Sparkles,
  Heart,
  Trash2,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react";
import { JournalEntry } from "../types";

interface RecentJournalsProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onNewJournalClick: () => void;
  onViewAllClick?: () => void;
}

export const RecentJournals: React.FC<RecentJournalsProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onToggleFavorite,
  onNewJournalClick,
  onViewAllClick,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Sort entries by most recently updated/created/dated and limit to 3 recent entries
  const sortedRecentEntries = [...entries]
    .sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || a.date;
      const dateB = b.updatedAt || b.createdAt || b.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 3);

  return (
    <div id="recent-journals-section" className="mb-12">
      {/* Clean Minimal Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950">
              RECENT JOURNALS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-pink-50 text-purple-900/70 border border-pink-100 font-medium">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <p className="text-xs text-purple-900/60 font-serif italic">
            Your recently saved reflections, thoughts, and quiet insights
          </p>
        </div>

        {onViewAllClick && entries.length > 0 && (
          <button
            onClick={onViewAllClick}
            className="text-xs text-pink-600 hover:text-purple-950 font-bold tracking-wider uppercase cursor-pointer transition-colors flex items-center gap-1 group"
          >
            <span>View Archive</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Diary Cards Grid */}
      {sortedRecentEntries.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-[36px] bg-white border border-dashed border-pink-200 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="font-serif text-xl font-bold text-purple-950 mb-1">
            No saved journals yet
          </h4>
          <p className="text-xs text-purple-900/60 font-serif italic max-w-sm mx-auto mb-4">
            Begin your mindful journaling sanctuary today by writing your very first reflection.
          </p>
          <button
            onClick={onNewJournalClick}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer transition-all hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5 text-pink-100" />
            <span>Write Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedRecentEntries.map((entry) => (
            <div
              key={entry.id}
              id={`journal-card-${entry.id}`}
              onClick={() => onSelectEntry(entry)}
              className="group relative rounded-[32px] p-6 bg-white border border-pink-100/70 shadow-xs hover:shadow-lg hover:border-pink-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Date & Mood Header */}
                <div className="flex items-center justify-between text-xs text-purple-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-pink-400" />
                    <span className="font-bold tracking-widest text-[10px] uppercase text-purple-900/70">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  <span className="text-xs bg-pink-50/90 px-2.5 py-0.5 rounded-full text-purple-900 border border-pink-100 font-serif italic">
                    {entry.moodEmoji} {entry.mood}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl text-purple-950 font-bold group-hover:text-pink-600 transition-colors mb-2 leading-snug line-clamp-2">
                  {entry.title || "Untitled Journal"}
                </h3>

                {/* Content Excerpt */}
                <p className="font-serif text-sm text-purple-900/75 leading-relaxed line-clamp-3 mb-4">
                  {entry.content || "Empty reflection page..."}
                </p>
              </div>

              {/* Footer with stickers & tags */}
              <div className="border-t border-pink-50 pt-3 flex items-center justify-between text-xs text-purple-400">
                <div className="flex items-center gap-1.5">
                  {entry.stickers && entry.stickers.length > 0 ? (
                    <div className="flex items-center -space-x-1">
                      {entry.stickers.slice(0, 3).map((stk, i) => (
                        <span key={i} className="text-sm">
                          {stk.emoji}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-purple-400/80 italic font-serif flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-purple-300" />
                      {entry.time || "Recently saved"}
                    </span>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <span className="text-[9px] uppercase tracking-wider font-bold text-purple-900/50 bg-pink-50/80 px-2 py-0.5 rounded-full">
                      {entry.tags[0]}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(entry.id);
                    }}
                    title={entry.isFavorite ? "Favorited" : "Favorite"}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      entry.isFavorite
                        ? "text-rose-500 hover:bg-rose-50"
                        : "text-gray-300 hover:text-rose-400 hover:bg-pink-50"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${entry.isFavorite ? "fill-rose-500" : ""}`}
                    />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(entry.id);
                    }}
                    title="Delete Entry"
                    className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center text-purple-900 group-hover:bg-pink-500 group-hover:text-white transition-all ml-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
