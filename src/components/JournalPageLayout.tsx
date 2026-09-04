import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CloudSun,
  Heart,
  Tag,
  Trash2,
  Sparkles,
  BookOpen,
  Music,
  RotateCcw,
  X,
  Image as ImageIcon,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  JournalEntry,
  MoodType,
  StickerPlacement,
  JournalMedia,
  JournalMusicTrack,
  StructuredSummary,
  JournalLocation,
} from "../types";
import { InteractiveSticker } from "./InteractiveSticker";
import { MusicStickerCard } from "./MusicStickerCard";

export interface JournalPageLayoutProps {
  entry: JournalEntry;
  isEditing: boolean;
  pageNumber?: number;

  // Editable Form Control Values
  title: string;
  content: string;
  date: string;
  time: string;
  mood: MoodType;
  moodEmoji: string;
  weather?: string;
  categories: string[];
  location?: JournalLocation;
  music?: JournalMusicTrack | null;
  media: JournalMedia[];
  stickers: StickerPlacement[];
  summary?: StructuredSummary;
  isFavorite?: boolean;

  // Change Callbacks
  onTitleChange?: (val: string) => void;
  onContentChange?: (val: string) => void;
  onDateChange?: (val: string) => void;
  onTimeChange?: (val: string) => void;
  onMoodChange?: (mood: MoodType, emoji: string) => void;
  onWeatherChange?: (val: string) => void;
  onLocationClick?: () => void;
  onOpenMusicSearch?: () => void;
  onRemoveMusic?: () => void;
  onRemovePhoto?: (photoId: string) => void;
  onAddPhoto?: (file: File) => void;
  onPhotoCaptionChange?: (photoId: string, caption: string) => void;
  onUpdateSticker?: (sticker: StickerPlacement) => void;
  onRemoveSticker?: (stickerId: string) => void;
  onToggleFavorite?: () => void;
  onCategoryToggle?: (catName: string) => void;
  onOpenCategoryManager?: () => void;
  onAskGeminiForCategories?: () => void;
  isSuggestingCategories?: boolean;

  // Stylistic preferences
  fontFamily?: "serif" | "handwriting" | "sans";
  fontSize?: number;
  isLinedPaper?: boolean;

  // Optional Header Action Toolbar items (Save, Cancel, Edit, Delete buttons)
  headerActions?: React.ReactNode;
  toastMessage?: { text: string; onUndo?: () => void } | null;
  onDismissToast?: () => void;

  // Custom mood options list
  moodOptions?: { type: MoodType; emoji: string; label: string }[];
  weatherOptions?: string[];
}

const DEFAULT_MOODS: { type: MoodType; emoji: string; label: string }[] = [
  { type: "Happy", emoji: "😊", label: "Happy" },
  { type: "Calm", emoji: "🌿", label: "Calm" },
  { type: "Excited", emoji: "✨", label: "Excited" },
  { type: "Neutral", emoji: "💭", label: "Neutral" },
  { type: "Tired", emoji: "💤", label: "Tired" },
  { type: "Worried", emoji: "🌧️", label: "Worried" },
  { type: "Sad", emoji: "💧", label: "Sad" },
  { type: "Frustrated", emoji: "⚡", label: "Frustrated" },
];

const DEFAULT_WEATHERS = [
  "🌤️ Mild Sun",
  "☀️ Warm",
  "🍃 Breezy",
  "🌧️ Rain",
  "🌙 Night",
  "☁️ Overcast",
];

export const JournalPageLayout: React.FC<JournalPageLayoutProps> = ({
  entry,
  isEditing,
  pageNumber,
  title,
  content,
  date,
  time,
  mood,
  moodEmoji,
  weather,
  categories,
  location,
  music,
  media,
  stickers,
  summary,
  isFavorite,
  onTitleChange,
  onContentChange,
  onDateChange,
  onTimeChange,
  onMoodChange,
  onWeatherChange,
  onLocationClick,
  onOpenMusicSearch,
  onRemoveMusic,
  onRemovePhoto,
  onAddPhoto,
  onPhotoCaptionChange,
  onUpdateSticker,
  onRemoveSticker,
  onToggleFavorite,
  onCategoryToggle,
  onOpenCategoryManager,
  onAskGeminiForCategories,
  isSuggestingCategories,
  fontFamily = "serif",
  fontSize = 18,
  isLinedPaper = true,
  headerActions,
  toastMessage,
  onDismissToast,
  moodOptions = DEFAULT_MOODS,
  weatherOptions = DEFAULT_WEATHERS,
}) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);

  // Compute word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Auto-resize title textarea if content wraps
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title, isEditing]);

  return (
    <div
      ref={paperRef}
      id={`journal-page-canvas-${entry.id}`}
      className={`relative w-full min-h-[680px] sm:min-h-[750px] bg-[#FFFDFB] ${
        isLinedPaper ? "diary-paper-lined" : "diary-paper-texture"
      } rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-inner flex flex-col overflow-hidden select-text transition-colors`}
    >
      {/* Decorative Bookmark Ribbon */}
      <div className="absolute top-0 right-10 w-6 h-14 bg-gradient-to-b from-purple-400 via-pink-400 to-pink-500 rounded-b-md shadow-md pointer-events-none z-10 opacity-90" />

      {/* Decorative Washi Tape Accent */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-28 h-5 bg-pink-200/70 backdrop-blur-xs opacity-90 rotate-1 rounded-xs pointer-events-none shadow-2xs z-10 border border-pink-300/40" />

      {/* Decorative & Interactive Placed Stickers */}
      {(stickers || []).map((st) => (
        <InteractiveSticker
          key={st.id}
          sticker={st}
          containerRef={paperRef}
          onUpdate={onUpdateSticker || (() => {})}
          onRemove={onRemoveSticker || (() => {})}
          readOnly={!isEditing}
        />
      ))}

      {/* Floating Undo Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-pink-900/95 text-white px-4 py-2 rounded-full shadow-xl border border-pink-300/40 text-xs animate-slide-down">
          <span>{toastMessage.text}</span>
          {toastMessage.onUndo && (
            <button
              type="button"
              onClick={() => {
                toastMessage.onUndo?.();
                onDismissToast?.();
              }}
              className="flex items-center gap-1 font-bold text-pink-300 hover:text-pink-100 underline ml-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDismissToast}
            className="text-white/60 hover:text-white ml-1 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Structural Content Layout (Header -> Title -> Music -> Media -> Body -> Footer) */}
      <div className="relative z-20 flex-1 flex flex-col space-y-4">
        {/* 1. JOURNAL HEADER (Metadata & Controls) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-1 border-b border-pink-200/80">
          {/* Metadata badges with identical containers in Edit & Read mode */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-purple-900/80 font-serif">
            {/* Date Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-xs font-serif font-semibold text-pink-800 border border-pink-200/70 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              {isEditing ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => onDateChange?.(e.target.value)}
                  className="bg-transparent text-xs font-serif font-semibold text-pink-800 focus:outline-none cursor-pointer"
                />
              ) : (
                <span>{date || "Today"}</span>
              )}
            </div>

            {/* Time Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-xs font-serif text-purple-900/80 border border-pink-200/50">
              <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              {isEditing ? (
                <input
                  type="text"
                  value={time}
                  onChange={(e) => onTimeChange?.(e.target.value)}
                  className="bg-transparent w-16 text-xs font-serif text-purple-900/80 focus:outline-none"
                />
              ) : (
                <span>{time || "12:00 PM"}</span>
              )}
            </div>

            {/* Weather Badge */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-pink-50 text-xs font-serif text-purple-900/80 border border-pink-200/50">
              <CloudSun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {isEditing ? (
                <select
                  value={weather || weatherOptions[0]}
                  onChange={(e) => onWeatherChange?.(e.target.value)}
                  className="bg-transparent text-xs font-serif text-purple-900/80 focus:outline-none cursor-pointer"
                >
                  {weatherOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{weather || "🌤️ Mild Sun"}</span>
              )}
            </div>

            {/* Location Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={onLocationClick}
                disabled={!isEditing && !onLocationClick}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif font-medium border transition-colors ${
                  location?.name
                    ? "bg-pink-50 text-pink-700 border-pink-200/70"
                    : "bg-pink-50/50 text-pink-500 border-dashed border-pink-300"
                } ${isEditing || onLocationClick ? "hover:bg-pink-100 cursor-pointer" : "cursor-default"}`}
                title={isEditing ? "Click to change location" : "Page Location"}
              >
                <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <span>{location?.name ? location.name : "+ Place"}</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar slot */}
          {headerActions && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {headerActions}
            </div>
          )}
        </div>

        {/* Mood & Categories Row (IDENTICAL 28px CONTAINER HEIGHT IN EDIT & READ MODE) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mood Badge Pill (IDENTICAL 28px HEIGHT & VISUAL POSITION IN BOTH MODES) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => isEditing && setIsMoodPickerOpen(!isMoodPickerOpen)}
                disabled={!isEditing}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif font-semibold border transition-all ${
                  isEditing
                    ? "bg-pink-100/90 text-pink-900 border-pink-300 hover:bg-pink-200 cursor-pointer shadow-2xs"
                    : "bg-pink-50 text-pink-900 border-pink-200/80 shadow-2xs cursor-default"
                }`}
                title={isEditing ? "Click to change mood" : "Today's Mood"}
              >
                <span>{moodEmoji || "🌸"}</span>
                <span>Feeling {mood}</span>
                {isEditing && <ChevronDown className="w-3 h-3 text-pink-500 ml-0.5" />}
              </button>

              {/* Floating Mood Picker Popover in Edit Mode (OVERLAYS PAGE WITHOUT EXPANDING LAYOUT FLOW) */}
              {isEditing && isMoodPickerOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-xl border border-pink-200 flex flex-wrap gap-1.5 max-w-xs animate-scale-in">
                  {moodOptions.map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => {
                        onMoodChange?.(m.type, m.emoji);
                        setIsMoodPickerOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-serif transition-all cursor-pointer ${
                        mood === m.type
                          ? "bg-pink-600 text-white font-bold scale-105"
                          : "bg-pink-50 text-pink-900 hover:bg-pink-100"
                      }`}
                    >
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Categories Chips */}
            {(categories || []).map((cat) => (
              <span
                key={cat}
                className="px-2.5 py-0.5 rounded-full bg-white/90 border border-pink-200 text-pink-900 text-[11px] font-sans-ui font-semibold"
              >
                #{cat}
              </span>
            ))}

            {/* Optional Edit Mode Category Actions */}
            {isEditing && onCategoryToggle && (
              <div className="flex items-center gap-1">
                {onAskGeminiForCategories && (
                  <button
                    type="button"
                    onClick={onAskGeminiForCategories}
                    disabled={isSuggestingCategories}
                    className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Let Gemini suggest categories"
                  >
                    <Sparkles className={`w-3 h-3 text-pink-100 ${isSuggestingCategories ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">AI Suggest</span>
                  </button>
                )}
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="p-1 rounded-full text-pink-600 hover:bg-pink-100 text-xs cursor-pointer"
                    title="Manage Categories"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {isFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className="flex items-center gap-1 text-xs text-rose-500 font-serif font-medium bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100 cursor-pointer"
            >
              <Heart className="w-3 h-3 fill-rose-400" />
              <span>Favorited</span>
            </button>
          )}
        </div>

        {/* 2. TITLE SECTION (DEDICATED SECTION WITH SUBTLE SEPARATOR) */}
        <div className="relative z-20 mb-2 pb-2 border-b border-pink-200/70">
          {isEditing ? (
            <textarea
              ref={titleTextareaRef}
              rows={1}
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Give today's chapter a title..."
              className={`w-full bg-transparent border-0 p-0 m-0 text-2xl sm:text-3xl font-bold text-[#3B2C3E] placeholder:text-[#BCA3BF] focus:outline-none leading-snug tracking-tight resize-none overflow-hidden block ${
                fontFamily === "serif"
                  ? "font-serif-title"
                  : fontFamily === "handwriting"
                  ? "font-handwriting text-3xl"
                  : "font-sans-ui"
              }`}
            />
          ) : (
            <h2
              className={`w-full bg-transparent border-0 p-0 m-0 text-2xl sm:text-3xl font-bold text-[#3B2C3E] leading-snug tracking-tight block ${
                fontFamily === "serif"
                  ? "font-serif-title"
                  : fontFamily === "handwriting"
                  ? "font-handwriting text-3xl"
                  : "font-sans-ui"
              }`}
            >
              {title || "Untitled Memory"}
            </h2>
          )}
        </div>

        {/* 3. OPTIONAL MUSIC SECTION */}
        {music && (
          <div className="relative z-20 mb-2">
            <MusicStickerCard
              track={music}
              isEditable={isEditing}
              onOpenSearch={onOpenMusicSearch}
              onRemoveTrack={onRemoveMusic}
            />
          </div>
        )}

        {/* 4. ATTACHED MEDIA / POLAROID PHOTOS */}
        {((media && media.length > 0) || (isEditing && onAddPhoto)) && (
          <div className="relative z-20 mb-3 flex flex-wrap gap-4 items-center">
            {media && media.map((item) => (
              <div
                key={item.id}
                className="relative group bg-white p-2.5 pb-4 rounded-xl shadow-md border border-pink-200/80 -rotate-1 hover:rotate-0 transition-transform duration-300 max-w-xs"
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-pink-200/80 backdrop-blur-xs opacity-90 rotate-2 pointer-events-none rounded-xs" />
                <div className="rounded-lg overflow-hidden h-36 w-full bg-pink-50">
                  <img
                    src={item.url}
                    alt={item.caption || "Journal Photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={item.caption || ""}
                    onChange={(e) => onPhotoCaptionChange?.(item.id, e.target.value)}
                    placeholder="Add caption..."
                    className="w-full text-xs font-handwriting text-purple-950 text-center bg-pink-50/50 rounded-md px-2 py-1 border border-pink-200 focus:outline-none mt-2"
                  />
                ) : (
                  <div className="w-full text-xs font-handwriting text-purple-900 text-center bg-transparent rounded-md px-2 py-1 border border-transparent mt-2">
                    {item.caption || "\u00A0"}
                  </div>
                )}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto?.(item.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md border border-white cursor-pointer opacity-90 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {isEditing && onAddPhoto && (
              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-50/80 hover:bg-pink-100 text-xs font-semibold text-pink-700 border border-dashed border-pink-300 shadow-2xs transition-colors cursor-pointer">
                <ImageIcon className="w-4 h-4 text-pink-500" />
                <span>+ Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onAddPhoto(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>
        )}

        {/* 5. BODY SECTION (IDENTICAL TYPOGRAPHY, LINE-HEIGHT, PRE-WRAP & PADDING IN BOTH MODES) */}
        <div className="relative z-20 flex-1 flex flex-col min-h-[350px] sm:min-h-[420px]">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => onContentChange?.(e.target.value)}
              placeholder="Dear SoulSelf... Pour your heart onto the page..."
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: isLinedPaper ? "2.2rem" : "1.8",
              }}
              className={`w-full flex-1 bg-transparent border-0 p-0 m-0 resize-none focus:outline-none text-[#4A3E4E] placeholder:text-[#BCA3BF] whitespace-pre-wrap break-words tracking-normal leading-relaxed ${
                fontFamily === "serif"
                  ? "font-serif"
                  : fontFamily === "handwriting"
                  ? "font-handwriting text-2xl"
                  : "font-sans"
              }`}
            />
          ) : (
            <div
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: isLinedPaper ? "2.2rem" : "1.8",
              }}
              className={`w-full flex-1 bg-transparent border-0 p-0 m-0 text-[#4A3E4E] whitespace-pre-wrap break-words tracking-normal leading-relaxed ${
                fontFamily === "serif"
                  ? "font-serif"
                  : fontFamily === "handwriting"
                  ? "font-handwriting text-2xl"
                  : "font-sans"
              }`}
            >
              {content || (
                <span className="text-purple-300 italic font-sans text-sm">
                  No entry written on this page yet.
                </span>
              )}
            </div>
          )}
        </div>

        {/* 6. GEMINI REFLECTION INSIGHTS (IF PRESENT) */}
        {summary && (
          <div className="relative z-20 mt-4 p-4 rounded-2xl bg-pink-50/90 border border-pink-200 shadow-2xs">
            <div className="flex items-center justify-between font-serif font-bold text-pink-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-500" />
                Gemini Reflection Insights
              </span>
              <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-pink-200 text-pink-900 font-semibold">
                {summary.emotionalTone}
              </span>
            </div>
            <div className="text-xs text-[#5B4360] space-y-1">
              {summary.mainThemes && summary.mainThemes.length > 0 && (
                <div>
                  <strong>Themes:</strong> {summary.mainThemes.join(", ")}
                </div>
              )}
              {summary.importantThoughts && summary.importantThoughts.length > 0 && (
                <div>
                  <strong>Thoughts:</strong> {summary.importantThoughts.join(" • ")}
                </div>
              )}
              {summary.whatWentWell && summary.whatWentWell.length > 0 && (
                <div>
                  <strong>What went well:</strong> {summary.whatWentWell.join(" • ")}
                </div>
              )}
              {summary.possibleNextSteps && summary.possibleNextSteps.length > 0 && (
                <div>
                  <strong>Gentle Next Steps:</strong> {summary.possibleNextSteps.join(" • ")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. PAGE FOOTER */}
        <div className="relative z-20 pt-4 mt-4 border-t border-pink-100/70 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8B6E92]">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{Math.max(1, Math.ceil(wordCount / 100))} min read</span>
            <span>•</span>
            <span>{(stickers || []).length} stickers placed</span>
          </div>

          <div className="flex items-center gap-2">
            {pageNumber ? (
              <div className="flex items-center gap-1.5 text-pink-600/80 italic font-serif">
                <BookOpen className="w-3.5 h-3.5 text-pink-500" />
                <span>Page {pageNumber}</span>
              </div>
            ) : (
              <span className="text-[11px] text-pink-600 font-medium hidden sm:inline">
                SoulSelf Personal Sanctuary
              </span>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                className="flex items-center gap-1 text-pink-500 hover:text-pink-600 cursor-pointer ml-2"
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-pink-500" : ""}`} />
                <span className="text-xs">{isFavorite ? "Favorited" : "Favorite"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
