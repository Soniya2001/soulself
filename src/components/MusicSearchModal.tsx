import React, { useState, useEffect, useRef } from "react";
import { Search, Music, X, Loader2, Disc, ExternalLink, Check, Play, Pause, Scissors, ArrowLeft } from "lucide-react";
import { JournalMusicTrack } from "../types";
import { musicService } from "../services/music/musicService";
import { audioManager } from "../utils/audio";

interface MusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: JournalMusicTrack) => void;
  currentTrack?: JournalMusicTrack | null;
}

export const MusicSearchModal: React.FC<MusicSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  currentTrack,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JournalMusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProvider] = useState("spotify");

  // Trimmer Step State
  const [trimmingTrack, setTrimmingTrack] = useState<JournalMusicTrack | null>(null);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [isTrimmerPlaying, setIsTrimmerPlaying] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const trimmerAudioRef = useRef<HTMLAudioElement | null>(null);

  // Focus input when modal opens & load popular sample songs initially
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (!query.trim() && !trimmingTrack) {
        performSearch("Munbe Vaa");
      }
    } else {
      setTrimmingTrack(null);
      stopTrimmerAudio();
    }
  }, [isOpen]);

  // Debounced search trigger (350ms)
  useEffect(() => {
    if (!query.trim() || trimmingTrack) {
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [query, selectedProvider, trimmingTrack]);

  // Handle trimmer audio cleanup
  useEffect(() => {
    return () => {
      stopTrimmerAudio();
    };
  }, []);

  const stopTrimmerAudio = () => {
    if (trimmerAudioRef.current) {
      trimmerAudioRef.current.pause();
      trimmerAudioRef.current = null;
    }
    setIsTrimmerPlaying(false);
  };

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const tracks = await musicService.searchTracks(searchTerm, selectedProvider);
      setResults(tracks);
    } catch (err) {
      console.error("Music search failed:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleOpenTrimmer = (track: JournalMusicTrack) => {
    stopTrimmerAudio();
    setStartOffset(track.startTime || 0);
    setTrimmingTrack(track);
  };

  const handleToggleTrimmerPreview = () => {
    if (!trimmingTrack?.previewUrl) return;

    if (isTrimmerPlaying && trimmerAudioRef.current) {
      stopTrimmerAudio();
      return;
    }

    const audio = new Audio(trimmingTrack.previewUrl);
    trimmerAudioRef.current = audio;
    
    // Fit current preview playback position safely
    const audioDur = audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 30;
    const targetPos = startOffset < audioDur ? startOffset : startOffset % audioDur;
    try {
      audio.currentTime = targetPos;
    } catch {}

    audio.ontimeupdate = () => {
      const currentAudioDur = audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 30;
      const currentTargetPos = startOffset < currentAudioDur ? startOffset : startOffset % currentAudioDur;
      const endPos = Math.min(currentTargetPos + 30, currentAudioDur);

      if (audio.currentTime >= endPos || audio.currentTime < currentTargetPos - 1) {
        try {
          audio.currentTime = currentTargetPos;
        } catch {}
      }
    };

    audio.onended = () => {
      const currentAudioDur = audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 30;
      const currentTargetPos = startOffset < currentAudioDur ? startOffset : startOffset % currentAudioDur;
      try {
        audio.currentTime = currentTargetPos;
        audio.play().catch(() => setIsTrimmerPlaying(false));
      } catch {}
    };

    audio.play().then(() => {
      setIsTrimmerPlaying(true);
    }).catch((err) => {
      console.warn("Trimmer audio play error:", err);
      setIsTrimmerPlaying(false);
    });
  };

  const handleOffsetChange = (newOffset: number) => {
    const totalTrackDuration = trimmingTrack?.duration || 210;
    const maxOffset = Math.max(10, Math.floor(totalTrackDuration - 30));
    const clampedOffset = Math.max(0, Math.min(maxOffset, newOffset));

    setStartOffset(clampedOffset);

    if (trimmerAudioRef.current) {
      const audioDur =
        trimmerAudioRef.current.duration &&
        !isNaN(trimmerAudioRef.current.duration) &&
        trimmerAudioRef.current.duration > 0
          ? trimmerAudioRef.current.duration
          : 30;
      const targetPos = clampedOffset < audioDur ? clampedOffset : clampedOffset % audioDur;

      try {
        trimmerAudioRef.current.currentTime = targetPos;
      } catch {}
    }
  };

  const updateScrubberFromPointer = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = relX / rect.width;
    
    const totalTrackDuration = trimmingTrack?.duration || 210;
    const maxOffset = Math.max(10, Math.floor(totalTrackDuration - 30));
    const newOffset = Math.round(ratio * maxOffset);

    handleOffsetChange(newOffset);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateScrubberFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateScrubberFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleConfirmTrack = () => {
    if (!trimmingTrack) return;
    stopTrimmerAudio();
    audioManager.playGentleTap();
    onSelectTrack({
      ...trimmingTrack,
      startTime: startOffset,
    });
    setTrimmingTrack(null);
    onClose();
  };

  // Full track duration & max scrubber offset calculation
  const totalTrackDuration = trimmingTrack?.duration || 210; // Default 210s (3m 30s)
  const maxScrubberOffset = Math.max(10, Math.floor(totalTrackDuration - 30));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pink-950/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-white via-pink-50/50 to-purple-50/80 shadow-2xl border border-pink-200/80 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-pink-100 bg-white/80 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            {trimmingTrack ? (
              <button
                type="button"
                onClick={() => {
                  stopTrimmerAudio();
                  setTrimmingTrack(null);
                }}
                className="p-1.5 rounded-full hover:bg-pink-100 text-purple-700 transition-colors cursor-pointer"
                title="Back to search results"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shadow-2xs">
                <Music className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="font-serif font-bold text-lg text-purple-950">
                {trimmingTrack ? "Trim 30s Soundtrack" : "Attach Soundtrack"}
              </h3>
              <p className="text-xs text-[#7E6584]">
                {trimmingTrack
                  ? "Choose which part of the song plays with your memory 🎵"
                  : "Choose a track for this diary memory 🎵"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopTrimmerAudio();
              onClose();
            }}
            className="p-1.5 rounded-full text-purple-700 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trimmer Screen (If track selected for trimming) */}
        {trimmingTrack ? (
          <div className="p-5 flex flex-col items-center justify-between flex-1 space-y-5 overflow-y-auto">
            {/* Track Info Card */}
            <div className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-pink-200/80">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-pink-100 shrink-0 border border-pink-300">
                {trimmingTrack.artworkUrl ? (
                  <img
                    src={trimmingTrack.artworkUrl}
                    alt={trimmingTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc className="w-8 h-8 text-pink-400 m-3" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-serif font-bold text-base text-purple-950 truncate">
                  {trimmingTrack.title}
                </h4>
                <p className="text-xs text-[#7E6584] truncate">
                  {trimmingTrack.artist}
                </p>
                <p className="text-[10px] text-pink-600 font-semibold uppercase mt-0.5">
                  Segment: {formatTime(startOffset)} - {formatTime(startOffset + 30)}
                </p>
              </div>
            </div>

            {/* Instagram Story-Style Waveform Trimmer Container */}
            <div className="w-full space-y-4 bg-[#120B1A] text-white p-5 sm:p-6 rounded-3xl border border-pink-500/30 shadow-2xl relative overflow-hidden">
              {/* Trimmer Title & Live Timestamp */}
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-pink-300">
                  <Scissors className="w-4 h-4 text-pink-400 animate-pulse" />
                  <span>Drag timeline to select 30s portion:</span>
                </span>
                <span className="font-mono text-[11px] px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-200 border border-pink-400/40 shadow-inner font-bold">
                  {formatTime(startOffset)} — {formatTime(startOffset + 30)}
                </span>
              </div>

              {/* Full Track Waveform Visualizer Scrubber (Instagram Story Style) */}
              <div
                ref={timelineRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative py-2 my-2 select-none touch-none cursor-grab active:cursor-grabbing"
              >
                {/* Full Song Waveform Track (Gray Bars Across Whole Track) */}
                <div className="flex items-center justify-between gap-[3px] h-16 px-3 opacity-30 pointer-events-none">
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const seed = (trimmingTrack?.title?.length || 10) + idx;
                    const heightPct = Math.max(
                      20,
                      Math.min(95, Math.floor(Math.sin(seed * 0.45) * 35 + Math.cos(seed * 0.25) * 25 + 50))
                    );
                    return (
                      <div
                        key={idx}
                        style={{ height: `${heightPct}%` }}
                        className="w-1 rounded-full bg-white/70 transition-all"
                      />
                    );
                  })}
                </div>

                {/* Instagram Story Glowing Selection Frame Window */}
                <div
                  style={{
                    left: `${maxScrubberOffset > 0 ? (startOffset / maxScrubberOffset) * 63 : 0}%`,
                    width: "37%",
                  }}
                  className="absolute top-1/2 -translate-y-1/2 h-20 rounded-2xl p-[3px] bg-gradient-to-r from-[#FFD600] via-[#FF007A] to-[#9C27B0] shadow-[0_0_25px_rgba(255,0,122,0.6)] pointer-events-none transition-all duration-75 flex flex-col justify-between"
                >
                  {/* Top Drag Handle Pill */}
                  <div className="w-8 h-1 rounded-full bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 mx-auto mt-0.5 shadow-xs" />

                  {/* Inside Highlighted Active Box */}
                  <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-between px-2.5 overflow-hidden shadow-inner my-0.5">
                    {Array.from({ length: 15 }).map((_, idx) => {
                      const seed = (trimmingTrack?.title?.length || 10) + idx + startOffset;
                      const heightPct = Math.max(
                        30,
                        Math.min(95, Math.floor(Math.sin(seed * 0.6) * 30 + 60))
                      );
                      return (
                        <div
                          key={idx}
                          style={{ height: `${heightPct}%` }}
                          className={`w-1 rounded-full transition-all ${
                            isTrimmerPlaying
                              ? "bg-gradient-to-t from-pink-600 to-rose-500 animate-pulse"
                              : "bg-pink-400/80"
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Bottom Drag Handle Pill */}
                  <div className="w-8 h-1 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300 mx-auto mb-0.5 shadow-xs" />
                </div>
              </div>

              {/* Scrubber Timeline Labels */}
              <div className="flex justify-between text-[10px] text-pink-300/80 font-mono pt-1">
                <span>0:00 (Start)</span>
                <span>{formatTime(Math.floor(totalTrackDuration / 2))} (Chorus)</span>
                <span>{formatTime(totalTrackDuration)} (End)</span>
              </div>
            </div>

            {/* Live Audio Preview Button */}
            {trimmingTrack.previewUrl && (
              <button
                type="button"
                onClick={handleToggleTrimmerPreview}
                className={`w-full py-2.5 rounded-2xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isTrimmerPlaying
                    ? "bg-pink-600 text-white hover:bg-pink-700 border border-pink-500"
                    : "bg-pink-100 hover:bg-pink-200 text-pink-900 border border-pink-300"
                }`}
              >
                {isTrimmerPlaying ? (
                  <>
                    <Pause className="w-4 h-4 text-pink-400" />
                    <span>Pause Live Audio Preview</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 ml-0.5 text-pink-600" />
                    <span>Test Selected 30s Audio Segment ▶</span>
                  </>
                )}
              </button>
            )}

            {/* Confirm & Attach Button */}
            <button
              type="button"
              onClick={handleConfirmTrack}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-pink-600 hover:from-pink-600 hover:to-purple-700 text-white font-serif font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Attach Sound Memory ({startOffset}s - {startOffset + 30}s) 🎵</span>
            </button>
          </div>
        ) : (
          <>
            {/* Search Input Bar */}
            <div className="p-4 bg-white/60 border-b border-pink-100">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by song, artist, album, language..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-full bg-white border border-pink-200 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200/50 shadow-inner text-purple-950 placeholder:text-pink-300"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 p-1 rounded-full text-pink-400 hover:text-pink-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-[#8B6E92] font-medium shrink-0">Try:</span>
                {[
                  "Munbe Vaa",
                  "A R Rahman",
                  "Taylor Swift",
                  "Arijit Singh",
                  "Korean songs",
                  "Edith Piaf",
                  "Anirudh",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setQuery(chip);
                      performSearch(chip);
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-pink-100/70 hover:bg-pink-200/80 text-purple-900 text-[11px] border border-pink-200/60 shrink-0 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
              {isSearching ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-purple-800 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                  <p className="text-sm font-medium">Searching music catalog...</p>
                </div>
              ) : results.length > 0 ? (
                results.map((track) => {
                  const isCurrent =
                    currentTrack?.providerTrackId === track.providerTrackId;
                  return (
                    <div
                      key={`${track.provider}-${track.providerTrackId}`}
                      className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all hover:shadow-md ${
                        isCurrent
                          ? "bg-pink-100/80 border-pink-300 shadow-2xs"
                          : "bg-white/80 hover:bg-pink-50/90 border-pink-100"
                      }`}
                    >
                      {/* Track Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                        {/* Artwork */}
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-pink-100 shrink-0 shadow-2xs border border-pink-200/60">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-pink-400">
                              <Disc className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Title & Artist */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-purple-950 truncate group-hover:text-pink-700 transition-colors">
                            {track.title}
                          </h4>
                          <p className="text-xs text-[#7E6584] truncate">
                            {track.artist}
                          </p>
                          {track.album && (
                            <p className="text-[10px] text-purple-400 truncate opacity-80">
                              {track.album}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select Button -> Opens Trimmer */}
                      <button
                        type="button"
                        onClick={() => handleOpenTrimmer(track)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isCurrent
                            ? "bg-pink-600 text-white"
                            : "bg-pink-500 hover:bg-pink-600 text-white shadow-xs hover:scale-105"
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <span>Select & Trim ✂️</span>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : hasSearched ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-100/60 flex items-center justify-center text-pink-400">
                    <Music className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-purple-950">
                    🎵 No songs found
                  </h4>
                  <p className="text-xs text-[#7E6584] max-w-xs">
                    Try searching for another song title, artist, album, or language.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Footer Attribution */}
        <div className="p-3 px-5 bg-white/90 border-t border-pink-100 flex items-center justify-between text-[11px] text-[#7E6584]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Spotify & Global Catalog API
          </span>
          <span className="italic text-purple-400">SoulSelf Memory Soundtrack</span>
        </div>
      </div>
    </div>
  );
};
