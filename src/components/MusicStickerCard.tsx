import React, { useState, useEffect, useRef } from "react";
import { Music, Play, Pause, ExternalLink, RefreshCw, Trash2, Disc } from "lucide-react";
import { JournalMusicTrack } from "../types";
import { audioManager } from "../utils/audio";

interface MusicStickerCardProps {
  track: JournalMusicTrack;
  isEditable?: boolean;
  onOpenSearch?: () => void;
  onRemoveTrack?: () => void;
}

export const MusicStickerCard: React.FC<MusicStickerCardProps> = ({
  track,
  isEditable = false,
  onOpenSearch,
  onRemoveTrack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-play on mount and setup continuous 30s segment looping
  useEffect(() => {
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (track.previewUrl) {
      const audio = new Audio(track.previewUrl);
      audioRef.current = audio;

      const startOffset = track.startTime || 0;

      const getTargetPos = () => {
        const audioDur = audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 30;
        return startOffset < audioDur ? startOffset : startOffset % audioDur;
      };

      const applyStartPos = () => {
        const targetPos = getTargetPos();
        try {
          audio.currentTime = targetPos;
        } catch (e) {
          console.warn("[MusicStickerCard] Could not set currentTime:", e);
        }
      };

      audio.onloadedmetadata = applyStartPos;
      applyStartPos();

      // Loop audio continuously when reaching the end of the 30s segment or track duration
      audio.ontimeupdate = () => {
        const audioDur = audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 30;
        const targetPos = getTargetPos();
        const endPos = Math.min(targetPos + 30, audioDur);

        if (audio.currentTime >= endPos || audio.currentTime < targetPos - 1) {
          try {
            audio.currentTime = targetPos;
            audio.play().catch(() => {});
          } catch {}
        }
      };

      audio.onended = () => {
        const targetPos = getTargetPos();
        try {
          audio.currentTime = targetPos;
          audio.play().catch(() => {});
        } catch {}
      };

      // Auto-play music when opening the journal page
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("[MusicStickerCard] Autoplay blocked by browser until user interaction:", err);
          setIsPlaying(false);
        });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [track.providerTrackId, track.previewUrl, track.startTime]);

  const handleTogglePlay = () => {
    audioManager.playGentleTap();

    if (audioRef.current && track.previewUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const startOffset = track.startTime || 0;
        const audioDur =
          audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0
            ? audioRef.current.duration
            : 30;
        const targetPos = startOffset < audioDur ? startOffset : startOffset % audioDur;

        if (
          audioRef.current.currentTime < targetPos ||
          audioRef.current.currentTime >= Math.min(targetPos + 30, audioDur)
        ) {
          try {
            audioRef.current.currentTime = targetPos;
          } catch {}
        }
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("[MusicStickerCard] Audio play error:", err);
            window.open(
              track.externalUrl ||
                `https://open.spotify.com/search/${encodeURIComponent(track.title)}`,
              "_blank"
            );
          });
      }
    } else if (track.externalUrl) {
      window.open(track.externalUrl, "_blank");
    }
  };

  const handleRemove = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioManager.playGentleTap();
    if (onRemoveTrack) {
      onRemoveTrack();
    }
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-50/90 via-purple-50/90 to-pink-100/90 border border-pink-200/80 shadow-2xs text-xs my-1 transition-all hover:border-pink-300">
      {/* Artwork thumbnail or music icon */}
      <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 border border-pink-300 shadow-2xs">
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-pink-200 flex items-center justify-center text-pink-600">
            <Music className="w-3.5 h-3.5" />
          </div>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-purple-950/40 flex items-center justify-center">
            <Disc className="w-3.5 h-3.5 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Song Title & Artist Text Badge */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-[280px] sm:max-w-[380px]">
        <span className="font-serif font-bold text-purple-950 truncate">
          🎵 {track.title}
        </span>
        <span className="text-pink-300 font-sans text-[10px]">•</span>
        <span className="text-[#7E6584] truncate text-[11px] font-sans">
          {track.artist}
        </span>
      </div>

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer shadow-2xs transition-transform hover:scale-110 active:scale-95 ${
          isPlaying ? "bg-purple-700" : "bg-pink-500 hover:bg-pink-600"
        }`}
        title={isPlaying ? "Pause soundtrack" : "Play soundtrack"}
      >
        {isPlaying ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3 ml-0.5" />
        )}
      </button>

      {/* Spotify External Link */}
      <a
        href={
          track.externalUrl ||
          `https://open.spotify.com/search/${encodeURIComponent(track.title)}`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="text-purple-600 hover:text-pink-600 transition-colors p-0.5 shrink-0"
        title="Open on Spotify"
      >
        <ExternalLink className="w-3 h-3" />
      </a>

      {/* Editor Controls (Change / Remove) */}
      {isEditable && (
        <div className="flex items-center gap-1.5 border-l border-pink-200/80 pl-2 ml-0.5 shrink-0">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="text-[11px] font-medium text-purple-800 hover:text-pink-700 cursor-pointer underline underline-offset-2"
            >
              Change
            </button>
          )}

          {onRemoveTrack && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer px-1"
              title="Remove music from page"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};
