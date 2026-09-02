import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  BookOpen,
  Camera,
  Plus,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { JournalEntry, JournalLocation } from "../types";

export interface LocationGroup {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
  entries: JournalEntry[];
}

interface MemoryCarouselProps {
  location: LocationGroup | null;
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntryWithLocation?: (location: JournalLocation) => void;
}

export const MemoryCarousel: React.FC<MemoryCarouselProps> = ({
  location,
  entries,
  onSelectEntry,
  onNewEntryWithLocation,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reset active index when location or entries array changes
  useEffect(() => {
    setActiveIndex(0);
  }, [location?.name, entries.length]);

  // Keyboard Navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!entries || entries.length <= 1) return;
      // Only navigate if user is not typing in an input/textarea
      const activeElement = document.activeElement as HTMLElement | null;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);
      if (isInput) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : entries.length - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < entries.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [entries]);

  if (!location) {
    return (
      <div className="w-full p-8 rounded-[36px] bg-white/80 backdrop-blur-md border border-pink-200/70 shadow-sm text-center font-serif space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xl">
          🌎
        </div>
        <h3 className="text-xl font-bold text-purple-950">
          Select a Memory Pin on the Globe
        </h3>
        <p className="text-xs text-purple-900/60 max-w-md mx-auto">
          Rotate the 3D Earth above and click any location marker to reveal your treasured personal journal memories in an interactive carousel.
        </p>
      </div>
    );
  }

  // Handle empty location state
  if (!entries || entries.length === 0) {
    return (
      <div className="w-full p-8 rounded-[36px] bg-white border border-pink-200/80 shadow-md text-center space-y-4 font-serif animate-fade-in">
        <div className="flex items-center justify-center gap-2 text-pink-600">
          <MapPin className="w-5 h-5" />
          <h3 className="text-2xl font-bold text-purple-950">
            {location.name}
            {location.country ? `, ${location.country}` : ""}
          </h3>
        </div>

        <p className="text-xs text-purple-900/60 font-mono">
          {location.latitude.toFixed(4)}° N · {location.longitude.toFixed(4)}° E
        </p>

        <div className="py-6 space-y-2">
          <p className="text-sm text-purple-950 font-medium">
            No memories captured here yet 🌸
          </p>
          <p className="text-xs text-purple-900/60">
            Write your first journal entry for this location to pin your memories here!
          </p>
        </div>

        {onNewEntryWithLocation && (
          <button
            onClick={() =>
              onNewEntryWithLocation({
                name: location.name,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              })
            }
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Write Journal in {location.name}</span>
          </button>
        )}
      </div>
    );
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : entries.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < entries.length - 1 ? prev + 1 : 0));
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentEntry = entries[activeIndex] || entries[0];

  return (
    <div
      className="w-full rounded-[36px] bg-gradient-to-b from-white via-[#FFF9FB]/90 to-[#FAF5FA]/80 border border-pink-200/80 p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Location Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-200/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-purple-950">
              {location.name}
              {location.country ? `, ${location.country}` : ""}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold font-sans">
              {entries.length} {entries.length === 1 ? "memory" : "memories"}
            </span>
          </div>
          <p className="text-[11px] text-purple-900/50 font-mono mt-0.5">
            {Math.abs(location.latitude).toFixed(4)}° {location.latitude >= 0 ? "N" : "S"} ·{" "}
            {Math.abs(location.longitude).toFixed(4)}° {location.longitude >= 0 ? "E" : "W"}
          </p>
        </div>

        {onNewEntryWithLocation && (
          <button
            onClick={() =>
              onNewEntryWithLocation({
                name: location.name,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              })
            }
            className="px-4 py-2 rounded-full bg-white hover:bg-pink-50 border border-pink-300 text-purple-950 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-pink-600" />
            <span>Add Memory Here</span>
          </button>
        )}
      </div>

      {/* 2. Center-Focused 3D Stacked Carousel Container */}
      <div className="relative min-h-[420px] sm:min-h-[460px] flex items-center justify-center py-4 select-none">
        {/* Navigation Arrow Left */}
        {entries.length > 1 && (
          <button
            onClick={handlePrev}
            aria-label="Previous memory"
            className="absolute left-2 sm:left-4 z-40 w-11 h-11 rounded-full bg-white/95 hover:bg-pink-100 text-purple-950 border border-pink-300 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <ChevronLeft className="w-6 h-6 text-purple-900" />
          </button>
        )}

        {/* Carousel Items Stack */}
        <div className="relative w-full max-w-4xl h-[380px] sm:h-[420px] flex items-center justify-center overflow-visible">
          {entries.map((entry, idx) => {
            const diff = idx - activeIndex;

            // Calculate distance wrap for infinite loop visuals when 3+ entries exist
            let offset = diff;
            const total = entries.length;
            if (total > 2) {
              if (diff > total / 2) offset = diff - total;
              if (diff < -total / 2) offset = diff + total;
            }

            const absOffset = Math.abs(offset);
            const isCenter = offset === 0;

            // Hide cards beyond 2 steps away for performance
            if (absOffset > 2 && total > 4) {
              return null;
            }

            // Layering & Transform Dynamics
            let translateX = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;
            let rotateY = 0;

            if (offset === 0) {
              // Center card
              translateX = 0;
              scale = 1;
              opacity = 1;
              zIndex = 30;
            } else if (offset === -1) {
              // Immediate left
              translateX = -180;
              scale = 0.84;
              opacity = 0.75;
              zIndex = 20;
              rotateY = 8;
            } else if (offset === 1) {
              // Immediate right
              translateX = 180;
              scale = 0.84;
              opacity = 0.75;
              zIndex = 20;
              rotateY = -8;
            } else if (offset === -2) {
              // Outer left
              translateX = -320;
              scale = 0.70;
              opacity = 0.45;
              zIndex = 10;
              rotateY = 15;
            } else if (offset === 2) {
              // Outer right
              translateX = 320;
              scale = 0.70;
              opacity = 0.45;
              zIndex = 10;
              rotateY = -15;
            }

            // Mobile positioning overrides for responsive scaling
            const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
            if (isMobile) {
              if (offset === -1) translateX = -110;
              if (offset === 1) translateX = 110;
              if (absOffset > 1) opacity = 0;
            }

            const hasPhoto = entry.media && entry.media.length > 0;
            const primaryPhoto = hasPhoto ? entry.media![0].url : null;
            const photoCount = entry.media ? entry.media.length : 0;

            return (
              <div
                key={entry.id}
                onClick={() => {
                  if (!isCenter) {
                    setActiveIndex(idx);
                  }
                }}
                style={{
                  transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
                  opacity,
                  zIndex,
                  transition: "all 450ms cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                className={`absolute w-[280px] sm:w-[360px] h-[360px] sm:h-[400px] rounded-3xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer border shadow-lg ${
                  isCenter
                    ? "bg-white border-pink-300 ring-2 ring-pink-300/60 shadow-2xl cursor-default"
                    : "bg-white/95 border-pink-200 hover:border-pink-300 hover:shadow-xl"
                }`}
              >
                {/* Photo / Journal Banner */}
                <div className="relative w-full h-[180px] sm:h-[210px] rounded-2xl overflow-hidden bg-gradient-to-tr from-pink-100 via-purple-50 to-rose-100 flex items-center justify-center shrink-0 border border-pink-100">
                  {primaryPhoto ? (
                    <img
                      src={primaryPhoto}
                      alt={entry.title || "Memory Photo"}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    /* Fallback journal card aesthetic */
                    <div className="w-full h-full p-4 flex flex-col justify-between bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-100/80 via-white to-purple-50">
                      <div className="flex items-center justify-between text-pink-500 text-xs font-serif italic">
                        <span>✨ SoulSelf Journal</span>
                        <span className="text-base">{entry.moodEmoji || "🌸"}</span>
                      </div>
                      <div className="font-serif font-bold text-sm text-purple-950 line-clamp-2 text-center">
                        "{entry.title || "Untitled Thought"}"
                      </div>
                      <div className="text-[10px] text-purple-900/50 font-serif italic text-right">
                        {entry.date}
                      </div>
                    </div>
                  )}

                  {/* Photo count badge if multiple photos exist */}
                  {photoCount > 1 && (
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-purple-950/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Camera className="w-3 h-3 text-pink-300" />
                      <span>{photoCount} photos</span>
                    </div>
                  )}

                  {/* Mood Emoji Badge */}
                  <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-xs flex items-center justify-center text-sm border border-pink-200">
                    {entry.moodEmoji || "💜"}
                  </div>
                </div>

                {/* Card Details Body */}
                <div className="flex-1 pt-3 flex flex-col justify-between min-h-0">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-serif text-purple-900/60 mb-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-pink-500" />
                        <span>{entry.date}</span>
                      </span>

                      {entry.categories && entry.categories.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                          {entry.categories[0]}
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif text-base sm:text-lg font-bold text-purple-950 line-clamp-1">
                      {entry.title || "Untitled Memory"}
                    </h4>

                    {entry.content && (
                      <p className="text-xs text-purple-900/70 font-serif line-clamp-2 mt-1 italic">
                        "{entry.content}"
                      </p>
                    )}
                  </div>

                  {/* Center Card "View Journal" Primary CTA */}
                  {isCenter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntry(entry);
                      }}
                      className="w-full mt-2 py-2 px-3 rounded-full bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-101 active:scale-99 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-pink-300" />
                      <span>View Journal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrow Right */}
        {entries.length > 1 && (
          <button
            onClick={handleNext}
            aria-label="Next memory"
            className="absolute right-2 sm:right-4 z-40 w-11 h-11 rounded-full bg-white/95 hover:bg-pink-100 text-purple-950 border border-pink-300 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <ChevronRight className="w-6 h-6 text-purple-900" />
          </button>
        )}
      </div>

      {/* 3. Carousel Dots Indicator */}
      {entries.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {entries.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              title={`Go to memory ${idx + 1}`}
              className={`transition-all rounded-full cursor-pointer ${
                idx === activeIndex
                  ? "w-6 h-2 bg-pink-600 shadow-xs"
                  : "w-2 h-2 bg-pink-200 hover:bg-pink-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
