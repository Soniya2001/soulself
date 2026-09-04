import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Calendar,
  MapPin,
  Tag,
  Pin,
  Sparkles,
  Heart,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  X,
  Clock,
  ArrowUpDown,
  ImageIcon,
} from "lucide-react";
import { JournalEntry } from "../types";
import { DEFAULT_CATEGORIES } from "../data/initialData";

interface AllJournalsViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onTogglePin?: (entryId: string) => void;
}

export const AllJournalsView: React.FC<AllJournalsViewProps> = ({
  entries,
  onSelectEntry,
  onNewEntry,
  onTogglePin,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedMood, setSelectedMood] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [onlyPinned, setOnlyPinned] = useState<boolean>(false);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "length">("newest");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");

  // Distinct locations from entries
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.location?.name) set.add(e.location.name);
    });
    return Array.from(set);
  }, [entries]);

  // Distinct categories from entries + default
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATEGORIES.forEach((c) => set.add(c.name));
    entries.forEach((e) => {
      if (e.categories) {
        e.categories.forEach((cat) => set.add(cat));
      }
    });
    return Array.from(set);
  }, [entries]);

  // Filter & Sort Logic
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        // Search
        const matchesSearch =
          !searchQuery ||
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (entry.location?.name && entry.location.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (entry.categories && entry.categories.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())));

        // Category
        const matchesCategory =
          selectedCategory === "ALL" ||
          (entry.categories && entry.categories.includes(selectedCategory));

        // Mood
        const matchesMood = selectedMood === "ALL" || entry.mood === selectedMood;

        // Location
        const matchesLocation =
          selectedLocation === "ALL" || entry.location?.name === selectedLocation;

        // Flags
        const matchesPinned = !onlyPinned || entry.isPinned;
        const matchesPhotos = !onlyWithPhotos || (entry.media && entry.media.length > 0);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesMood &&
          matchesLocation &&
          matchesPinned &&
          matchesPhotos
        );
      })
      .sort((a, b) => {
        // Pinned entries always on top if default newest/oldest
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        if (sortBy === "newest") {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "length") {
          return b.content.length - a.content.length;
        }
        return 0;
      });
  }, [
    entries,
    searchQuery,
    selectedCategory,
    selectedMood,
    selectedLocation,
    onlyPinned,
    onlyWithPhotos,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedMood("ALL");
    setSelectedLocation("ALL");
    setOnlyPinned(false);
    setOnlyWithPhotos(false);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== "ALL" ||
    selectedMood !== "ALL" ||
    selectedLocation !== "ALL" ||
    onlyPinned ||
    onlyWithPhotos;

  return (
    <div id="soulself-all-journals-page" className="w-full mb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-pink-500" />
              ALL JOURNALS 📖
            </span>
            <span className="w-2 h-2 rounded-full bg-pink-400" />
          </div>
          <p className="text-xs text-purple-900/60 font-serif italic">
            Search, filter by category, location, emotion, and browse your personal life archives
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Toggle */}
          <div className="flex items-center bg-white p-1 rounded-full border border-pink-100/80 shadow-2xs">
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-1.5 rounded-full transition-colors ${
                layoutMode === "grid" ? "bg-pink-600 text-white font-bold" : "text-pink-700 hover:bg-pink-50"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode("list")}
              className={`p-1.5 rounded-full transition-colors ${
                layoutMode === "list" ? "bg-pink-600 text-white font-bold" : "text-pink-700 hover:bg-pink-50"
              }`}
              title="Diary List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Entry Button */}
          <button
            onClick={onNewEntry}
            className="px-4 py-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Write New</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-[28px] p-5 border border-pink-100/90 shadow-xs mb-8 space-y-4">
        {/* Row 1: Search & Sorting */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, titles, places..."
              className="w-full pl-8 pr-3 py-2 rounded-full bg-pink-50/50 border border-pink-100 text-xs text-purple-950 placeholder:text-purple-400/60 focus:outline-none focus:ring-1 focus:ring-pink-300"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 text-xs text-purple-900/60 font-serif">
              <ArrowUpDown className="w-3.5 h-3.5 text-pink-500" />
              <span>Sort by:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-full bg-pink-50/60 border border-pink-100 text-xs font-serif text-purple-950 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
              <option value="length">Word Length</option>
            </select>
          </div>
        </div>

        {/* Row 2: Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] uppercase font-bold text-purple-900/50 shrink-0 mr-1">
            Category:
          </span>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-serif font-semibold shrink-0 transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-pink-600 text-white font-bold shadow-2xs"
                : "bg-pink-50/60 text-purple-900 hover:bg-pink-100 border border-pink-100"
            }`}
          >
            All ({entries.length})
          </button>
          {allCategoryNames.map((catName) => (
            <button
              key={catName}
              onClick={() => setSelectedCategory(catName)}
              className={`px-3 py-1 rounded-full text-xs font-serif font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCategory === catName
                  ? "bg-pink-600 text-white font-bold shadow-2xs"
                  : "bg-pink-50/60 text-purple-900 hover:bg-pink-100 border border-pink-100"
              }`}
            >
              {catName}
            </button>
          ))}
        </div>

        {/* Row 3: Quick Filter Pills (Locations, Emotions, Pinned, Photos) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-pink-50">
          <div className="flex flex-wrap items-center gap-2">
            {/* Location Select */}
            {availableLocations.length > 0 && (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-1 rounded-full bg-pink-50/50 border border-pink-100 text-xs font-serif text-purple-950 focus:outline-none cursor-pointer"
              >
                <option value="ALL">📍 All Locations</option>
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    📍 {loc}
                  </option>
                ))}
              </select>
            )}

            {/* Mood Select */}
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="px-3 py-1 rounded-full bg-pink-50/50 border border-pink-100 text-xs font-serif text-purple-950 focus:outline-none cursor-pointer"
            >
              <option value="ALL">🌸 All Moods</option>
              <option value="Peaceful">Peaceful 🌸</option>
              <option value="Calm">Calm 🌿</option>
              <option value="Joyful">Joyful ✨</option>
              <option value="Grateful">Grateful 🍵</option>
              <option value="Nostalgic">Nostalgic 🕯️</option>
              <option value="Reflective">Reflective 💭</option>
              <option value="Thoughtful">Thoughtful ☁️</option>
            </select>

            {/* Pinned Toggle */}
            <button
              onClick={() => setOnlyPinned(!onlyPinned)}
              className={`px-3 py-1 rounded-full text-xs font-serif font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                onlyPinned
                  ? "bg-pink-500 text-white border-pink-500 shadow-2xs"
                  : "bg-white text-purple-900 border-pink-100 hover:bg-pink-50"
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </button>

            {/* Photos Toggle */}
            <button
              onClick={() => setOnlyWithPhotos(!onlyWithPhotos)}
              className={`px-3 py-1 rounded-full text-xs font-serif font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                onlyWithPhotos
                  ? "bg-pink-500 text-white border-pink-500 shadow-2xs"
                  : "bg-white text-purple-900 border-pink-100 hover:bg-pink-50"
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Has Photos</span>
            </button>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-pink-600 hover:text-pink-800 font-serif font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear filters ({filteredEntries.length} found)</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-[36px] bg-white border border-dashed border-pink-200">
          <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="font-serif text-xl font-bold text-purple-950 mb-1">
            No journals match your filters
          </h4>
          <p className="text-xs text-purple-900/60 font-serif italic max-w-sm mx-auto mb-4">
            Try adjusting your search terms or clearing the selected categories and filters.
          </p>
          <button
            onClick={resetFilters}
            className="px-6 py-2.5 rounded-full bg-pink-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
          >
            Upload Photo Memory
          </button>
        </div>
      ) : layoutMode === "grid" ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="group relative rounded-[32px] bg-white border border-pink-100/90 shadow-xs hover:shadow-xl hover:border-pink-200 hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Top Meta Bar */}
                <div className="flex items-center justify-between text-xs text-purple-400 mb-3 font-serif">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-400" />
                    <span>{entry.date}</span>
                    {entry.time && <span className="opacity-60">• {entry.time}</span>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {entry.isPinned && (
                      <span className="p-1 rounded-full bg-amber-100 text-amber-800" title="Pinned">
                        <Pin className="w-3 h-3" />
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-pink-50 text-purple-900 text-[11px] font-medium">
                      {entry.moodEmoji} {entry.mood}
                    </span>
                  </div>
                </div>

                {/* Media preview if present */}
                {entry.media && entry.media.length > 0 && (
                  <div className="mb-3 rounded-2xl overflow-hidden h-36 w-full bg-pink-50">
                    <img
                      src={entry.media[0].url}
                      alt={entry.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Title */}
                <h3 className="font-serif text-lg font-bold text-purple-950 group-hover:text-pink-600 transition-colors mb-2 leading-snug">
                  {entry.title || "Untitled Entry"}
                </h3>

                {/* Content snippet */}
                <p className="font-serif text-xs text-purple-900/75 line-clamp-3 leading-relaxed mb-4">
                  {entry.content}
                </p>
              </div>

              <div>
                {/* Location & Categories */}
                <div className="pt-3 border-t border-pink-50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  {entry.location ? (
                    <div className="flex items-center gap-1 text-pink-600 font-semibold">
                      <MapPin className="w-3 h-3" />
                      <span>{entry.location.name}</span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {entry.categories && entry.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.categories.slice(0, 2).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[10px] font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                      {entry.categories.length > 2 && (
                        <span className="text-[10px] text-purple-400">
                          +{entry.categories.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Cozy List Layout */
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="group rounded-[24px] bg-white border border-pink-100/90 hover:border-pink-200 hover:shadow-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1">
                {entry.media && entry.media.length > 0 ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-pink-50 shrink-0">
                    <img
                      src={entry.media[0].url}
                      alt={entry.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 text-purple-900 flex items-center justify-center text-xl shrink-0">
                    {entry.moodEmoji || "🌸"}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-purple-400 font-serif mb-0.5">
                    <span>{entry.date}</span>
                    {entry.location && (
                      <span className="text-pink-600 font-medium">• 📍 {entry.location.name}</span>
                    )}
                    {entry.isPinned && (
                      <span className="text-amber-600 font-bold">• 📌 Pinned</span>
                    )}
                  </div>
                  <h4 className="font-serif text-base font-bold text-purple-950 group-hover:text-pink-600 transition-colors">
                    {entry.title || "Untitled Entry"}
                  </h4>
                  <p className="font-serif text-xs text-purple-900/60 line-clamp-1 mt-0.5">
                    {entry.content}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {entry.categories && (
                  <div className="flex gap-1">
                    {entry.categories.slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[10px] font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                <div className="w-8 h-8 rounded-full bg-pink-50 group-hover:bg-pink-600 group-hover:text-white text-pink-700 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
