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



