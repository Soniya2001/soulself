export type MoodType =
  | "Happy"
  | "Calm"
  | "Excited"
  | "Worried"
  | "Sad"
  | "Frustrated"
  | "Tired"
  | "Neutral";

export type SentimentType = "Positive" | "Neutral" | "Negative" | "Mixed";

export interface TrackerLegendItem {
  id: string;
  color: string; // Hex color code or tailwind color value
  label: string; // User-defined meaning (e.g., "Summer", "Rainy", "Productive")
}

export interface TrackerDoc {
  id: string;
  userId: string;
  name: string; // User-defined title (e.g. "My Year in Colors")
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  legend: TrackerLegendItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackerEntryDoc {
  date: string; // YYYY-MM-DD
  legendId: string;
  note?: string; // Optional daily note
  updatedAt: string;
}

export interface TrackerStats {
  activeDays: number;
  markedDays: number;
  currentStreak: number;
  mostUsedLegendItem?: {
    legend: TrackerLegendItem;
    count: number;
  };
}

export interface JournalLocation {
  name: string; // e.g. "Chennai", "Bangalore", "Singapore"
  country?: string;
  latitude: number;
  longitude: number;
}

export interface JournalMedia {
  id: string;
  type: "image" | "photo";
  url: string; // Base64 data URI or public image URL
  thumbnailUrl?: string;
  source?: "instagram" | "facebook" | "tiktok" | "manual_upload" | "other";
  sourceId?: string;
  caption?: string;
  importedAt: string;
}

export interface SocialMemoryItem {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: JournalLocation;
  source: "instagram" | "facebook" | "tiktok" | "manual_upload";
  sourceIdentifier?: string;
  isImportedToJournal?: boolean;
  journalId?: string;
  createdAt: string;
}

export interface StickerPlacement {
  id: string;
  emoji: string;
  x: number; // percentage on page (0-100)
  y: number; // percentage on page (0-100)
  scale: number; // 0.6 - 2.2
  rotation: number; // -180 to 180 degrees
}

export interface StructuredSummary {
  mainThemes: string[];
  importantThoughts: string[];
  whatWentWell: string[];
  challenges: string[];
  possibleNextSteps: string[];
  emotionalTone: string;
  sentiment?: SentimentType;
  generatedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface JournalMusicTrack {
  provider: "spotify" | "itunes" | string;
  providerTrackId: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  externalUrl: string;
  previewUrl?: string;
  startTime?: number; // Start offset in seconds (default 0)
  duration?: number; // Full track duration in seconds
}

export interface JournalEntry {
  id: string;
  userId?: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mood: MoodType;
  moodEmoji: string;
  weather?: string;
  weatherEmoji?: string;
  categories: string[]; // e.g. ["Personal", "Travel", "Work"]
  location?: JournalLocation;
  media?: JournalMedia[];
  music?: JournalMusicTrack | null;
  stickers: StickerPlacement[];
  tags: string[];
  coverColor?: string;
  summary?: StructuredSummary;
  geminiChat?: ChatMessage[];
  wordCount: number;
  sentiment?: SentimentType;
  isFavorite?: boolean;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationEntry {
  id: string;
  userId: string;
  journalId?: string;
  title: string;
  messages: ChatMessage[];
  summary?: StructuredSummary;
  emotion?: string;
  sentiment?: SentimentType;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  greetingTitle: string;
  bio: string;
  soundEnabled: boolean;
  themePreference: "soft-pink" | "lavender" | "rose-gold";
  favoriteStickers: string[];
  customCategories?: string[];
  defaultLocation?: JournalLocation;
  email?: string;
  photoURL?: string;
}

export interface AboutMeData {
  name?: string;
  age?: string;
  dateOfBirth?: string;
  favoriteFood?: string;
  favoriteMovie?: string;
  favoriteActor?: string;
  favoriteMusic?: string;
  favoriteBook?: string;
  favoriteColor?: string;
  favoritePlace?: string;
  myBias?: string;
  otherFavorites?: string;
  dreamQuote?: string;
  hobbies?: string;
  customFavorites?: { label: string; value: string }[];
  stickers?: StickerPlacement[];
  photoUrl?: string;
  updatedAt?: string;
}

export interface BucketListItem {
  id: string;
  text: string;
  isCompleted: boolean;
  completedAt?: string;
  emoji?: string;
  category?: string;
  notes?: string;
}

export interface BucketListData {
  items: BucketListItem[];
  stickers?: StickerPlacement[];
  updatedAt?: string;
}

export interface AuthContextType {
  user: any | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: (demoType: "User A (Soniya)" | "User B (Alex)") => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
}

export type AmbientSoundId =
  | "piano-waterfall"
  | "flowing-waterfall"
  | "running-stream"
  | "gentle-rain"
  | "forest-breeze"
  | "ocean-shore";

export interface AmbientSoundOption {
  id: AmbientSoundId;
  name: string;
  emoji: string;
  description: string;
  audioPath: string;
  isRecommended?: boolean;
}

export interface AmbientPreference {
  soundId: AmbientSoundId;
  volume: number; // 0 to 1
  isMuted: boolean;
  rememberChoice: boolean;
  persistentPlayback?: boolean; // Keep playing even when leaving diary writer
}

export type AyraConversationMode =
  | "just-talk"
  | "vent"
  | "motivate"
  | "think"
  | "reflect";

export interface CrisisResourceInfo {
  countryCode: string;
  countryName: string;
  primaryServiceName: string;
  organization: string;
  description: string;
  phoneNumbers: string[];
  emergencyNumber: string;
  is24x7: boolean;
  website?: string;
}

export interface AyraJournalReflectionDraft {
  title: string;
  mainThoughts: string;
  whatIRealized: string;
  nextStep: string;
  emotion: string;
  categories: string[];
}

export interface AyraMessage {
  id: string;
  role: "user" | "ayra";
  content: string;
  timestamp: string;
  mode?: AyraConversationMode;
  isSafetyResponse?: boolean;
  isAmbiguousClarification?: boolean;
  isImminentDanger?: boolean;
  safetyQuestion?: string;
  actionOptions?: string[];
  crisisResource?: CrisisResourceInfo;
}

export interface AyraConversation {
  id: string;
  userId: string;
  title: string;
  mode: AyraConversationMode;
  messages: AyraMessage[];
  isCrisisActive?: boolean;
  reflectionDraft?: AyraJournalReflectionDraft;
  createdAt: string;
  updatedAt: string;
}

export type PeriodType = "weekly" | "monthly" | "yearly";

export interface PeriodReflectionDoc {
  id: string; // Deterministic ID: YYYY-Www, YYYY-MM, or YYYY
  userId: string;
  periodType: PeriodType;
  periodKey: string; // e.g. "2026-W37", "2026-09", "2026"
  periodTitle: string; // e.g. "Week 37", "September 2026", "Year 2026"
  startDate: string;
  endDate: string;
  journalCount: number;
  journalDaysCount: number;
  streakCount: number;
  mostRecordedMood: string;
  mostRecordedMoodEmoji: string;
  topCategory: string;
  locationCount: number;
  summary: string;
  emotionalSummary: string;
  meaningfulMoments: string[];
  brightSpots: string[];
  challenges: string[];
  themes: string[];
  changes: string[];
  explorationPrompts: string[];
  nextQuestion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContextualReflectionMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export interface DiaryReflectionDoc {
  id: string;
  userId: string;
  journalId: string;
  messages: ContextualReflectionMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface GlobeReflectionDoc {
  id: string;
  userId: string;
  locationName: string;
  messages: ContextualReflectionMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationDoc {
  id: string; // periodKey e.g. "2026-W37"
  userId: string;
  periodType: PeriodType;
  periodKey: string;
  isRead: boolean;
  dismissedAt: string;
  createdAt: string;
}




