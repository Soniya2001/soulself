import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  JournalEntry,
  ConversationEntry,
  UserProfile,
  SocialMemoryItem,
  AyraConversation,
  AboutMeData,
  BucketListData,
} from "../types";

/**
 * Real-time subscription to current user's private journals in /users/{userId}/journals
 */
export function subscribeToUserJournals(
  userId: string,
  onUpdate: (journals: JournalEntry[]) => void,
  onError?: (error: any) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const journalsRef = collection(db, "users", userId, "journals");
  const q = query(journalsRef, orderBy("date", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          userId,
          title: data.title || "Untitled Journal",
          content: data.content || "",
          date: data.date || new Date().toISOString().split("T")[0],
          time: data.time || "12:00 PM",
          mood: data.mood || "Calm",
          moodEmoji: data.moodEmoji || "🌸",
          weather: data.weather || "🌤️ Sunny",
          weatherEmoji: data.weatherEmoji,
          categories: data.categories || ["Personal"],
          location: data.location || undefined,
          media: data.media || [],
          stickers: data.stickers || [],
          tags: data.tags || [],
          coverColor: data.coverColor,
          summary: data.summary,
          geminiChat: data.geminiChat,
          wordCount: data.wordCount || 0,
          sentiment: data.sentiment,
          isFavorite: !!data.isFavorite,
          isPinned: !!data.isPinned,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(entries);
    },
    (err) => {
      console.error("Firestore journals subscription error:", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Save or update a journal entry strictly under /users/{userId}/journals/{journalId}
 */
export async function saveJournalEntryDoc(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error("Authentication required to save journal.");
  const journalRef = doc(db, "users", userId, "journals", entry.id);

  const cleanData = {
    id: entry.id,
    userId,
    title: entry.title || "",
    content: entry.content || "",
    date: entry.date || new Date().toISOString().split("T")[0],
    time: entry.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mood: entry.mood || "Calm",
    moodEmoji: entry.moodEmoji || "🌸",
    weather: entry.weather || "🌤️ Clear",
    weatherEmoji: entry.weatherEmoji || "🌤️",
    categories: entry.categories || ["Personal"],
    location: entry.location || null,
    media: entry.media || [],
    stickers: entry.stickers || [],
    tags: entry.tags || [],
    coverColor: entry.coverColor || "pink",
    summary: entry.summary || null,
    geminiChat: entry.geminiChat || [],
    wordCount: entry.wordCount || (entry.content ? entry.content.trim().split(/\s+/).length : 0),
    sentiment: entry.sentiment || null,
    isFavorite: !!entry.isFavorite,
    isPinned: !!entry.isPinned,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timestamp: serverTimestamp(),
  };

  await setDoc(journalRef, cleanData, { merge: true });
}

/**
 * Delete a journal entry strictly under /users/{userId}/journals/{journalId}
 */
export async function deleteJournalEntryDoc(userId: string, entryId: string): Promise<void> {
  if (!userId) throw new Error("Authentication required to delete journal.");
  const journalRef = doc(db, "users", userId, "journals", entryId);
  await deleteDoc(journalRef);
}

/**
 * Toggle favorite status
 */
export async function toggleJournalFavoriteDoc(userId: string, entryId: string, isFavorite: boolean): Promise<void> {
  if (!userId) throw new Error("Authentication required.");
  const journalRef = doc(db, "users", userId, "journals", entryId);
  await setDoc(journalRef, { isFavorite, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Toggle pinned status
 */
export async function toggleJournalPinnedDoc(userId: string, entryId: string, isPinned: boolean): Promise<void> {
  if (!userId) throw new Error("Authentication required.");
  const journalRef = doc(db, "users", userId, "journals", entryId);
  await setDoc(journalRef, { isPinned, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Real-time subscription to current user's social memories in /users/{userId}/memories
 */
export function subscribeToUserMemories(
  userId: string,
  onUpdate: (memories: SocialMemoryItem[]) => void,
  onError?: (error: any) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const memoriesRef = collection(db, "users", userId, "memories");
  const q = query(memoriesRef, orderBy("date", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const memories: SocialMemoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        memories.push({
          id: docSnap.id,
          userId,
          imageUrl: data.imageUrl || "",
          caption: data.caption || "",
          date: data.date || new Date().toISOString().split("T")[0],
          time: data.time || "12:00 PM",
          location: data.location || undefined,
          source: data.source || "manual_upload",
          sourceIdentifier: data.sourceIdentifier,
          isImportedToJournal: !!data.isImportedToJournal,
          journalId: data.journalId,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      onUpdate(memories);
    },
    (err) => {
      console.error("Firestore memories subscription error:", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Save social memory item in /users/{userId}/memories/{memoryId}
 */
export async function saveSocialMemoryDoc(userId: string, memory: SocialMemoryItem): Promise<void> {
  if (!userId) throw new Error("Authentication required to save memory.");
  const memoryRef = doc(db, "users", userId, "memories", memory.id);
  await setDoc(
    memoryRef,
    {
      ...memory,
      userId,
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Delete social memory item
 */
export async function deleteSocialMemoryDoc(userId: string, memoryId: string): Promise<void> {
  if (!userId) throw new Error("Authentication required.");
  const memoryRef = doc(db, "users", userId, "memories", memoryId);
  await deleteDoc(memoryRef);
}

/**
 * Mark memory item as imported to a journal
 */
export async function markMemoryImportedDoc(userId: string, memoryId: string, journalId: string): Promise<void> {
  if (!userId) return;
  const memoryRef = doc(db, "users", userId, "memories", memoryId);
  await setDoc(
    memoryRef,
    {
      isImportedToJournal: true,
      journalId,
    },
    { merge: true }
  );
}

/**
 * Real-time subscription to current user's multi-turn conversations in /users/{userId}/conversations
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: ConversationEntry[]) => void,
  onError?: (error: any) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const convosRef = collection(db, "users", userId, "conversations");
  const q = query(convosRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const convos: ConversationEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convos.push({
          id: docSnap.id,
          userId,
          journalId: data.journalId,
          title: data.title || "SoulSelf Conversation",
          messages: data.messages || [],
          summary: data.summary,
          emotion: data.emotion,
          sentiment: data.sentiment,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(convos);
    },
    (err) => {
      console.error("Firestore conversations subscription error:", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Save multi-turn conversation doc
 */
export async function saveConversationDoc(userId: string, conversation: ConversationEntry): Promise<void> {
  if (!userId) throw new Error("Authentication required to save conversation.");
  const convoRef = doc(db, "users", userId, "conversations", conversation.id);

  await setDoc(
    convoRef,
    {
      ...conversation,
      userId,
      updatedAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Delete a conversation
 */
export async function deleteConversationDoc(userId: string, convoId: string): Promise<void> {
  if (!userId) throw new Error("Authentication required to delete conversation.");
  const convoRef = doc(db, "users", userId, "conversations", convoId);
  await deleteDoc(convoRef);
}

/**
 * User Profile at /users/{userId}
 */
export async function saveUserProfileDoc(userId: string, profile: Partial<UserProfile>): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getUserProfileDoc(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

/**
 * Real-time subscription to user's AYRA conversations in /users/{userId}/ayraConversations
 */
export function subscribeToUserAyraConversations(
  userId: string,
  onUpdate: (conversations: AyraConversation[]) => void,
  onError?: (error: any) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const convosRef = collection(db, "users", userId, "ayraConversations");
  const q = query(convosRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const convos: AyraConversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convos.push({
          id: docSnap.id,
          userId,
          title: data.title || "Conversation with AYRA",
          mode: data.mode || "just-talk",
          messages: data.messages || [],
          isCrisisActive: !!data.isCrisisActive,
          reflectionDraft: data.reflectionDraft || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(convos);
    },
    (err) => {
      console.error("Firestore AYRA conversations subscription error:", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Save or update an AYRA conversation in /users/{userId}/ayraConversations/{convoId}
 */
export async function saveAyraConversationDoc(
  userId: string,
  conversation: AyraConversation
): Promise<void> {
  if (!userId) throw new Error("Authentication required to save AYRA conversation.");
  const convoRef = doc(db, "users", userId, "ayraConversations", conversation.id);

  await setDoc(
    convoRef,
    {
      ...conversation,
      userId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Delete an AYRA conversation from /users/{userId}/ayraConversations/{convoId}
 */
export async function deleteAyraConversationDoc(
  userId: string,
  convoId: string
): Promise<void> {
  if (!userId) throw new Error("Authentication required to delete AYRA conversation.");
  const convoRef = doc(db, "users", userId, "ayraConversations", convoId);
  await deleteDoc(convoRef);
}

/**
 * About Me Document: /users/{userId}/profile/aboutMe
 */
export function subscribeToAboutMe(
  userId: string,
  onUpdate: (data: AboutMeData | null) => void,
  onError?: (err: any) => void
) {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }
  const aboutMeRef = doc(db, "users", userId, "profile", "aboutMe");
  return onSnapshot(
    aboutMeRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as AboutMeData);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error("Firestore aboutMe subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function getAboutMeDoc(userId: string): Promise<AboutMeData | null> {
  if (!userId) return null;
  const aboutMeRef = doc(db, "users", userId, "profile", "aboutMe");
  const snap = await getDoc(aboutMeRef);
  if (snap.exists()) {
    return snap.data() as AboutMeData;
  }
  return null;
}

export async function saveAboutMeDoc(userId: string, data: AboutMeData): Promise<void> {
  if (!userId) throw new Error("Authentication required to save About Me.");
  const aboutMeRef = doc(db, "users", userId, "profile", "aboutMe");
  await setDoc(
    aboutMeRef,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Bucket List Document: /users/{userId}/profile/bucketList
 */
export function subscribeToBucketList(
  userId: string,
  onUpdate: (data: BucketListData | null) => void,
  onError?: (err: any) => void
) {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }
  const bucketListRef = doc(db, "users", userId, "profile", "bucketList");
  return onSnapshot(
    bucketListRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as BucketListData);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error("Firestore bucketList subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function getBucketListDoc(userId: string): Promise<BucketListData | null> {
  if (!userId) return null;
  const bucketListRef = doc(db, "users", userId, "profile", "bucketList");
  const snap = await getDoc(bucketListRef);
  if (snap.exists()) {
    return snap.data() as BucketListData;
  }
  return null;
}

export async function saveBucketListDoc(userId: string, data: BucketListData): Promise<void> {
  if (!userId) throw new Error("Authentication required to save Bucket List.");
  const bucketListRef = doc(db, "users", userId, "profile", "bucketList");
  await setDoc(
    bucketListRef,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}



