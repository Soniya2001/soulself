import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Plus,
  Volume2,
  VolumeX,
  Bookmark,
  Sparkles,
  List,
  Calendar,
  Layers,
} from "lucide-react";
import { JournalEntry, AboutMeData, BucketListData, UserProfile } from "../types";
import { AboutMeDiaryPage } from "./AboutMeDiaryPage";
import { BucketListDiaryPage } from "./BucketListDiaryPage";
import { JournalEntryDiaryPage } from "./JournalEntryDiaryPage";
import { audioManager } from "../utils/audio";

interface DiaryBookViewProps {
  entries: JournalEntry[];
  aboutMeData: AboutMeData;
  bucketListData: BucketListData;
  userProfile: UserProfile;
  initialPage?: number; // 1-indexed: 1 = About Me, 2 = Bucket List, 3+ = Journals
  onSaveAboutMe: (data: AboutMeData) => Promise<void> | void;
  onSaveBucketList: (data: BucketListData) => Promise<void> | void;
  onSaveJournalEntry: (entry: JournalEntry) => Promise<void> | void;
  onDeleteJournalEntry?: (entryId: string) => Promise<void> | void;
  onCreateNewJournal: () => void;
  onBackToDashboard: () => void;
}

export const DiaryBookView: React.FC<DiaryBookViewProps> = ({
  entries,
  aboutMeData,
  bucketListData,
  userProfile,
  initialPage = 1,
  onSaveAboutMe,
  onSaveBucketList,
  onSaveJournalEntry,
  onDeleteJournalEntry,
  onCreateNewJournal,
  onBackToDashboard,
}) => {
  // Sort journal entries deterministically (chronological from oldest to newest or by date)
  // Page 1: About Me
  // Page 2: Bucket List
  // Page 3..N: Journal Entries
  const sortedEntries = React.useMemo(() => {
    return [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [entries]);

  const totalPages = 2 + sortedEntries.length;

  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (initialPage && initialPage >= 1 && initialPage <= totalPages) {
      return initialPage;
    }
    return 1;
  });

  const [turnDirection, setTurnDirection] = useState<"next" | "prev" | null>(null);
  const [isTurning, setIsTurning] = useState(false);
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false);
  const [isAmbientSoundActive, setIsAmbientSoundActive] = useState(() =>
    audioManager.getIsAmbientPlaying()
  );

  const touchStartX = useRef<number | null>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);

  // Update currentPage if initialPage changes from parent (e.g. user clicked a specific journal entry)
  useEffect(() => {
    if (initialPage && initialPage >= 1 && initialPage <= totalPages) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, totalPages]);

  // Automatically adjust currentPage if totalPages decreases due to page deletion
  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const goToPage = useCallback(
    (pageNumber: number) => {
      if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage || isTurning) {
        return;
      }
      const dir = pageNumber > currentPage ? "next" : "prev";
      setTurnDirection(dir);
      setIsTurning(true);
      audioManager.playPageTurn();

      setTimeout(() => {
        setCurrentPage(pageNumber);
        setTimeout(() => {
          setIsTurning(false);
          setTurnDirection(null);
        }, 180);
      }, 140);
    },
    [currentPage, totalPages, isTurning]
  );

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Keyboard navigation: Left Arrow (prev), Right Arrow (next), Escape (back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger page turn if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "Escape") {
        if (isTableOfContentsOpen) {
          setIsTableOfContentsOpen(false);
        } else {
          onBackToDashboard();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextPage, handlePrevPage, onBackToDashboard, isTableOfContentsOpen]);

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swiped Left -> Next Page
        handleNextPage();
      } else {
        // Swiped Right -> Prev Page
        handlePrevPage();
      }
    }
    touchStartX.current = null;
  };

  const toggleSound = () => {
    const active = audioManager.toggleAmbient();
    setIsAmbientSoundActive(active);
  };

  // Get current page details for table of contents
  const getPageTitle = (page: number): string => {
    if (page === 1) return "✨ Page 1: About Me";
    if (page === 2) return "🌟 Page 2: My Bucket List";
    const entryIdx = page - 3;
    if (sortedEntries[entryIdx]) {
      return `📖 Page ${page}: ${sortedEntries[entryIdx].title || "Journal Entry"}`;
    }
    return `Page ${page}`;
  };

  return (
    <div
      ref={bookContainerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 animate-fade-in flex flex-col items-center"
    >
      {/* Top Diary Toolbar */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 mb-4 pb-3 border-b border-pink-100/90 text-xs text-purple-900 font-sans-ui">
        {/* Back to Sanctuary Button */}
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-pink-50 border border-pink-200/80 text-purple-950 font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-pink-600" />
          <span>Sanctuary</span>
        </button>

        {/* Center: Table of Contents & Quick Ribbon Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTableOfContentsOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 hover:bg-pink-50 border border-pink-200 text-purple-950 font-serif font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-pink-600 fill-pink-300" />
            <span className="hidden sm:inline">{getPageTitle(currentPage)}</span>
            <span className="sm:hidden">
              Page {currentPage} of {totalPages}
            </span>
            <span className="text-[10px] text-pink-600 font-sans-ui bg-pink-100/80 px-2 py-0.5 rounded-full">
              Index ▾
            </span>
          </button>

          {/* Table of Contents Dropdown Menu */}
          {isTableOfContentsOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-pink-200/90 p-2 z-50 animate-scale-in">
              <div className="p-2 border-b border-pink-100 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 font-sans-ui">
                  Diary Index
                </span>
                <span className="text-[11px] text-purple-900/60 font-serif">
                  {totalPages} Total Pages
                </span>
              </div>

              <div className="py-1 space-y-1">
                {/* Page 1: About Me */}
                <button
                  type="button"
                  onClick={() => {
                    goToPage(1);
                    setIsTableOfContentsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif flex items-center justify-between transition-colors ${
                    currentPage === 1
                      ? "bg-pink-100/90 text-pink-900 font-bold"
                      : "hover:bg-pink-50 text-purple-950"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>Page 1: About Me</span>
                  </span>
                  <span className="text-[10px] text-pink-600 font-sans-ui">Intro</span>
                </button>

                {/* Page 2: Bucket List */}
                <button
                  type="button"
                  onClick={() => {
                    goToPage(2);
                    setIsTableOfContentsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif flex items-center justify-between transition-colors ${
                    currentPage === 2
                      ? "bg-purple-100/90 text-purple-900 font-bold"
                      : "hover:bg-pink-50 text-purple-950"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🌟</span>
                    <span>Page 2: My Bucket List</span>
                  </span>
                  <span className="text-[10px] text-purple-600 font-sans-ui">Intro</span>
                </button>

                {/* Journal Pages */}
                {sortedEntries.map((entry, idx) => {
                  const pNum = 3 + idx;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        goToPage(pNum);
                        setIsTableOfContentsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif flex items-center justify-between transition-colors ${
                        currentPage === pNum
                          ? "bg-pink-100/90 text-pink-900 font-bold"
                          : "hover:bg-pink-50 text-purple-950"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span>{entry.moodEmoji || "📖"}</span>
                        <span className="truncate">
                          Page {pNum}: {entry.title || "Untitled"}
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-900/50 font-sans-ui shrink-0">
                        {entry.date}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Tools: + New Entry */}
        <div className="flex items-center gap-2">
          {/* + New Journal Page */}
          <button
            type="button"
            onClick={onCreateNewJournal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Page</span>
          </button>
        </div>
      </div>

      {/* Realistic Physical Book Outer Container */}
      <div className="relative w-full flex justify-center items-center my-2">
        {/* Floating Left Side Arrow Button (Previous Page) */}
        {currentPage > 1 && (
          <button
            type="button"
            id="floating-diary-prev-arrow"
            onClick={handlePrevPage}
            disabled={isTurning}
            title={`Previous: ${getPageTitle(currentPage - 1)}`}
            aria-label="Previous Page"
            className="absolute -left-2 sm:-left-5 md:-left-7 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-pink-50 text-purple-950 shadow-xl border-2 border-pink-200/90 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 group-hover:-translate-x-0.5 transition-transform" />
            <span className="sr-only">Previous Page</span>
          </button>
        )}

        {/* Floating Right Side Arrow Button (Next Page or New Page) */}
        {currentPage < totalPages ? (
          <button
            type="button"
            id="floating-diary-next-arrow"
            onClick={handleNextPage}
            disabled={isTurning}
            title={`Next: ${getPageTitle(currentPage + 1)}`}
            aria-label="Next Page"
            className="absolute -right-2 sm:-right-5 md:-right-7 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-pink-50 text-purple-950 shadow-xl border-2 border-pink-200/90 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 group-hover:translate-x-0.5 transition-transform" />
            <span className="sr-only">Next Page</span>
          </button>
        ) : (
          <button
            type="button"
            id="floating-diary-new-arrow"
            onClick={onCreateNewJournal}
            title="Write Next Journal Page"
            aria-label="Write Next Journal Page"
            className="absolute -right-2 sm:-right-5 md:-right-7 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-xl border-2 border-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" />
            <span className="sr-only">Write Next Page</span>
          </button>
        )}

        {/* Book Hardcover Spine & Depth Shadow */}
        <div className="relative w-full max-w-4xl p-2 sm:p-4 rounded-3xl bg-gradient-to-b from-rose-100/90 via-pink-100/80 to-purple-100/90 shadow-2xl border border-pink-200/80">
          {/* Subtle Book Spine Indentation on Left */}
          <div className="hidden sm:block absolute left-2 sm:left-4 top-4 bottom-4 w-3 bg-gradient-to-r from-pink-300/60 to-transparent rounded-l-2xl pointer-events-none z-30" />

          {/* In-Page Left Margin Edge Clickable Strip */}
          {currentPage > 1 && (
            <div
              onClick={handlePrevPage}
              title="Click to turn back"
              className="absolute left-3 sm:left-5 top-8 bottom-8 w-8 sm:w-12 z-35 flex items-center justify-start cursor-pointer group/left-margin opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="p-1.5 rounded-r-xl bg-pink-600/90 backdrop-blur-xs text-white shadow-md flex items-center gap-1 text-[10px] transform -translate-x-2 group-hover/left-margin:translate-x-0 transition-transform">
                <ChevronLeft className="w-3.5 h-3.5 text-pink-200" />
                <span className="font-serif hidden sm:inline pr-1">Prev</span>
              </div>
            </div>
          )}

          {/* In-Page Right Margin Edge Clickable Strip */}
          {currentPage < totalPages && (
            <div
              onClick={handleNextPage}
              title="Click to turn next page"
              className="absolute right-3 sm:right-5 top-8 bottom-8 w-8 sm:w-12 z-35 flex items-center justify-end cursor-pointer group/right-margin opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="p-1.5 rounded-l-xl bg-pink-600/90 backdrop-blur-xs text-white shadow-md flex items-center gap-1 text-[10px] transform translate-x-2 group-hover/right-margin:translate-x-0 transition-transform">
                <span className="font-serif hidden sm:inline pl-1">Next</span>
                <ChevronRight className="w-3.5 h-3.5 text-pink-200" />
              </div>
            </div>
          )}

          {/* Book Inner Page Stage with 3D Page Turn Animation */}
          <div
            className={`relative w-full transition-transform duration-300 transform-gpu ${
              isTurning && turnDirection === "next"
                ? "rotate-y-[-6deg] translate-x-[-4px] scale-[0.99] opacity-90"
                : isTurning && turnDirection === "prev"
                ? "rotate-y-[6deg] translate-x-[4px] scale-[0.99] opacity-90"
                : "rotate-y-0 translate-x-0 scale-100 opacity-100"
            }`}
            style={{ perspective: 1200 }}
          >
            {/* Page 1: About Me */}
            {currentPage === 1 && (
              <AboutMeDiaryPage
                data={aboutMeData}
                onSave={onSaveAboutMe}
                pageNumber={1}
              />
            )}

            {/* Page 2: Bucket List */}
            {currentPage === 2 && (
              <BucketListDiaryPage
                data={bucketListData}
                onSave={onSaveBucketList}
                pageNumber={2}
              />
            )}

            {/* Page 3 onward: Normal Journal Entry */}
            {currentPage >= 3 && sortedEntries[currentPage - 3] && (
              <JournalEntryDiaryPage
                key={sortedEntries[currentPage - 3].id}
                entry={sortedEntries[currentPage - 3]}
                onSave={onSaveJournalEntry}
                onDelete={onDeleteJournalEntry}
                pageNumber={currentPage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Physical Page Navigation Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-4 mt-6 pt-4 border-t border-pink-100/80">
        {/* Previous Page Button */}
        <button
          type="button"
          id="diary-prev-page-btn"
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || isTurning}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-serif text-sm font-semibold transition-all cursor-pointer ${
            currentPage <= 1
              ? "opacity-30 cursor-not-allowed text-purple-900/40 bg-gray-100"
              : "bg-white hover:bg-pink-50 text-purple-950 border border-pink-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          }`}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4 text-pink-600" />
          <span className="hidden sm:inline">Previous Page</span>
          <span className="sm:hidden">Prev</span>
        </button>

        {/* Center: Deterministic Page Number & Quick Navigation Indicator */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 font-serif font-bold text-sm sm:text-base text-purple-950">
            <span className="px-3 py-1 rounded-full bg-pink-100/80 text-pink-800 text-xs font-sans-ui">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <span className="text-[11px] text-purple-900/60 font-serif italic hidden sm:block mt-0.5">
            Use ← Left & Right → arrow keys or swipe to turn pages
          </span>
        </div>

        {/* Next Page Button or Write Next Entry */}
        {currentPage < totalPages ? (
          <button
            type="button"
            id="diary-next-page-btn"
            onClick={handleNextPage}
            disabled={isTurning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-serif text-sm font-semibold bg-white hover:bg-pink-50 text-purple-950 border border-pink-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            aria-label="Next Page"
          >
            <span className="hidden sm:inline">Next Page</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-4 h-4 text-pink-600" />
          </button>
        ) : (
          <button
            type="button"
            id="diary-write-new-page-btn"
            onClick={onCreateNewJournal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-serif text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Write Next Entry</span>
            <span className="sm:hidden">+ Write</span>
          </button>
        )}
      </div>
    </div>
  );
};
