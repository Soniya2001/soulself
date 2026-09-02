import React, { useState, useEffect, useRef } from "react";
import {
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Pause,
  X,
  Sparkles,
  Check,
  ChevronDown,
  Waves,
} from "lucide-react";
import { AmbientSoundId, AmbientSoundOption } from "../types";
import {
  AMBIENT_SOUND_OPTIONS,
  DEFAULT_AMBIENT_PREFERENCE,
  AMBIENT_PREFERENCE_STORAGE_KEY,
} from "../data/ambientSounds";
import { ambientEngine, AmbientEngineState } from "../utils/ambientAudio";

interface AmbientSoundControlProps {
  variant?: "toolbar" | "inline" | "compact";
  className?: string;
}

export const AmbientSoundControl: React.FC<AmbientSoundControlProps> = ({
  variant = "toolbar",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [engineState, setEngineState] = useState<AmbientEngineState>(ambientEngine.getState());
  const [rememberChoice, setRememberChoice] = useState<boolean>(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Subscribe to real-time engine state updates
  useEffect(() => {
    const unsubscribe = ambientEngine.subscribe((state) => {
      setEngineState(state);
    });

    // Check remembered preference state
    try {
      const saved = localStorage.getItem(AMBIENT_PREFERENCE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRememberChoice(parsed.rememberChoice ?? true);
      }
    } catch (e) {}

    return () => {
      unsubscribe();
    };
  }, []);

  // Close panel on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeSound =
    AMBIENT_SOUND_OPTIONS.find((s) => s.id === engineState.activeSoundId) ||
    AMBIENT_SOUND_OPTIONS[0];

  const handleTogglePlay = async () => {
    if (engineState.isPlaying) {
      await ambientEngine.pause(1.2);
    } else {
      await ambientEngine.playSound(engineState.activeSoundId);
    }
  };

  const handleSelectSound = async (soundId: AmbientSoundId) => {
    await ambientEngine.selectSound(soundId);
    if (rememberChoice) {
      ambientEngine.savePreferences(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    ambientEngine.setVolume(newVol);
    if (rememberChoice) {
      ambientEngine.savePreferences(true);
    }
  };

  const handleToggleMute = () => {
    ambientEngine.toggleMute();
    if (rememberChoice) {
      ambientEngine.savePreferences(true);
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberChoice(checked);
    ambientEngine.savePreferences(checked);
  };

  const handlePersistentToggle = (checked: boolean) => {
    ambientEngine.setPersistentPlayback(checked);
  };

  const volumePercent = Math.round(engineState.volume * 100);

  // If inline widget variant (e.g. at the top or sidebar of the writer)
  if (variant === "inline") {
    return (
      <div
        id="inline-ambient-sound-card"
        className={`rounded-2xl bg-white/80 backdrop-blur-md border border-pink-200/80 p-3.5 shadow-2xs ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎧</span>
            <div>
              <div className="font-serif font-bold text-xs text-purple-950 flex items-center gap-1.5">
                <span>{activeSound.emoji}</span>
                <span>{activeSound.name}</span>
              </div>
              <p className="text-[10px] text-purple-900/60 font-serif">
                Relaxing piano & continuous calming water
              </p>
            </div>
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
              engineState.isPlaying
                ? "bg-pink-500 hover:bg-pink-600 text-white"
                : "bg-purple-950 hover:bg-purple-900 text-white"
            }`}
          >
            {engineState.isPlaying ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
        </div>

        {/* Volume & Wave */}
        <div className="flex items-center gap-2 pt-1 border-t border-pink-100">
          <button
            onClick={handleToggleMute}
            aria-label={engineState.isMuted ? "Unmute" : "Mute"}
            className="text-purple-600 hover:text-purple-900 cursor-pointer"
          >
            {engineState.isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={engineState.isMuted ? 0 : engineState.volume}
            onChange={handleVolumeChange}
            aria-label="Waterfall volume"
            className="w-full h-1 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />

          <span className="font-mono text-[10px] text-pink-600 font-bold w-7 text-right">
            {engineState.isMuted ? "0%" : `${volumePercent}%`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={panelRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        id="ambient-sound-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Ambient sound control"
        title="Relaxing Piano & Flowing Water Sounds"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
          engineState.isPlaying
            ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border-pink-300 text-purple-950 shadow-xs ring-2 ring-pink-300/40"
            : "bg-white/90 hover:bg-pink-50/80 text-purple-900/80 border-pink-200/70 shadow-2xs"
        }`}
      >
        <span className="relative flex items-center justify-center">
          <Headphones
            className={`w-3.5 h-3.5 ${
              engineState.isPlaying ? "text-pink-600 animate-pulse" : "text-purple-600"
            }`}
          />
          {engineState.isPlaying && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
          )}
        </span>

        <span className="font-medium tracking-tight">
          {engineState.isPlaying ? (
            <span className="flex items-center gap-1.5">
              <span>{activeSound.emoji}</span>
              <span className="hidden sm:inline font-serif">{activeSound.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span>🎧</span>
              <span>Ambient</span>
            </span>
          )}
        </span>

        {/* Extremely subtle animated water/wave indicator near audio control */}
        {engineState.isPlaying && !engineState.isMuted && (
          <div className="flex items-center gap-0.5 ml-0.5" title="Piano & water ambience playing">
            <span className="w-0.5 h-2 bg-pink-400 rounded-full animate-pulse [animation-duration:1.1s]" />
            <span className="w-0.5 h-3 bg-purple-500 rounded-full animate-pulse [animation-duration:0.8s]" />
            <span className="w-0.5 h-2.5 bg-pink-500 rounded-full animate-pulse [animation-duration:1.3s]" />
          </div>
        )}
      </button>

      {/* Floating Ambient Sound Panel Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Ambient sound settings"
          className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-[320px] sm:w-[350px] max-w-[calc(100vw-24px)] rounded-3xl bg-white/95 backdrop-blur-xl border border-pink-200 shadow-2xl p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-200 text-purple-950 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-200/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-100/80 text-pink-600 flex items-center justify-center shadow-inner">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-purple-950 flex items-center gap-1.5">
                  <span>Peaceful Ambient</span>
                  <Sparkles className="w-3 h-3 text-pink-500" />
                </h3>
                <p className="text-[11px] text-purple-900/60 font-serif">
                  Relaxing piano & water sounds for mindful writing
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close ambient panel"
              className="p-1.5 rounded-full text-purple-400 hover:text-purple-900 hover:bg-pink-100/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Currently Selected Banner & Play / Pause Button */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-pink-50/80 via-[#FFF5F8] to-purple-50/60 border border-pink-200/80 mb-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-pink-100 flex items-center justify-center text-xl shrink-0">
                  {activeSound.emoji}
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-xs font-bold text-purple-950 truncate flex items-center gap-1">
                    <span>{activeSound.name}</span>
                  </div>
                  <div className="text-[10px] text-purple-900/60 truncate font-serif">
                    {activeSound.description}
                  </div>
                </div>
              </div>

              {/* Play / Pause Toggle Button */}
              <button
                id="ambient-play-pause-btn"
                onClick={handleTogglePlay}
                className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 ${
                  engineState.isPlaying
                    ? "bg-pink-500 hover:bg-pink-600 text-white"
                    : "bg-purple-950 hover:bg-purple-900 text-white"
                }`}
              >
                {engineState.isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>
            </div>

            {/* Subtle Animated Visual Waveform Indicator when playing */}
            {engineState.isPlaying && (
              <div className="mt-2.5 pt-2.5 border-t border-pink-200/50 flex items-center justify-between text-[11px] text-purple-900/70">
                <span className="flex items-center gap-1 font-serif text-[10px] italic">
                  <Waves className="w-3 h-3 text-pink-500 animate-pulse" />
                  <span>{engineState.isFading ? "Fading smoothly..." : "Flowing peacefully ~"}</span>
                </span>

                {/* Soft natural wave ripples */}
                <div className="flex items-center gap-1 h-3">
                  {[35, 60, 85, 55, 75, 40, 80, 50].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        height: `${h}%`,
                        animationDuration: `${0.9 + (i % 3) * 0.25}s`,
                      }}
                      className="w-1 bg-pink-400 rounded-full animate-pulse opacity-75"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Volume Control: 🔊 ━━━━━●━━━━ 35% */}
          <div className="space-y-1.5 mb-4 px-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-900/80 flex items-center gap-1 text-[11px]">
                <span>Volume</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-pink-600">
                {engineState.isMuted ? "Muted" : `${volumePercent}%`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                title={engineState.isMuted ? "Unmute" : "Mute"}
                aria-label={engineState.isMuted ? "Unmute ambient audio" : "Mute ambient audio"}
                className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                  engineState.isMuted
                    ? "bg-pink-100 text-pink-700 border-pink-300"
                    : "bg-white text-purple-700 hover:bg-pink-50 border-pink-200"
                }`}
              >
                {engineState.isMuted || volumePercent === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={engineState.isMuted ? 0 : engineState.volume}
                onChange={handleVolumeChange}
                aria-label="Waterfall volume level"
                className="w-full h-1.5 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Sound Choices Grid (Natural Water & Forest Focus) */}
          <div className="space-y-1.5 mb-3">
            <div className="text-[10px] uppercase font-bold tracking-widest text-purple-900/60 px-1">
              Natural Water & Atmosphere
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-[170px] overflow-y-auto pr-0.5 scrollbar-thin">
              {AMBIENT_SOUND_OPTIONS.map((sound) => {
                const isSelected = sound.id === engineState.activeSoundId;

                return (
                  <button
                    key={sound.id}
                    onClick={() => handleSelectSound(sound.id)}
                    className={`p-2 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-pink-100/70 border-pink-400 ring-2 ring-pink-300/50 shadow-2xs"
                        : "bg-white/80 border-pink-100 hover:border-pink-300 hover:bg-pink-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{sound.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-serif font-bold text-xs text-purple-950 truncate flex items-center gap-1.5">
                          <span>{sound.name}</span>
                          {sound.isRecommended && (
                            <span className="text-[9px] font-sans font-bold uppercase tracking-wider bg-pink-200 text-pink-900 px-1.5 py-0.2 rounded-full">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-purple-900/60 truncate font-serif">
                          {sound.description}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options: Remember choice & Persistent playback */}
          <div className="pt-2.5 border-t border-pink-200/60 space-y-1.5 text-[11px] text-purple-900/70">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberChoice}
                  onChange={(e) => handleRememberToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-pink-600 focus:ring-pink-400 border-pink-300 cursor-pointer accent-pink-500"
                />
                <span className="font-serif text-[11px]">Remember sound preference</span>
              </label>

              <span className="text-[10px] text-purple-900/50 font-serif italic">
                Seamless loop ✨
              </span>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={engineState.persistentPlayback}
                  onChange={(e) => handlePersistentToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-pink-600 focus:ring-pink-400 border-pink-300 cursor-pointer accent-pink-500"
                />
                <span className="font-serif text-[11px]">Keep playing outside diary</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
