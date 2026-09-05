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
import { sanitizeFirestoreData } from "../utils/firestoreSanitizer";
import {
  JournalEntry,
  UserProfile,
  AboutMeData,
  BucketListData,
  AyraConversation,
  TrackerDoc,
  TrackerEntryDoc,
  PeriodReflectionDoc,
  PeriodType,
  UserNotificationDoc,
  DiaryReflectionDoc,
  GlobeReflectionDoc,
} from "../types";

/**
 * Default User Profile fallback object
 */
export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Beloved Journaler",
  greetingTitle: "Beloved Journaler",
  bio: "Writing my thoughts, finding peace in small moments, and growing with SoulSelf.",
  soundEnabled: false,
  themePreference: "soft-pink",
  favoriteStickers: ["🌸", "✨", "🦋", "💜", "☕"],
};

/**
 * Default About Me fallback object
 */
export const DEFAULT_ABOUT_ME: AboutMeData = {
  name: "SoulSelf Companion",
  favoriteColor: "Soft Pink",
  favoritePlace: "Sanctuary Haven",
  dreamQuote: "Peace comes from within. Do not seek it without.",
};

/**
 * Default Bucket List fallback object
 */
export const DEFAULT_BUCKET_LIST: BucketListData = {
  items: [
    {
      id: "b-1",
      text: "Write 30 daily journal entries in SoulSelf",
      isCompleted: false,
      category: "Personal Growth",
    },
    {
      id: "b-2",
      text: "Complete a full year of color mood tracking",
      isCompleted: false,
      category: "Mindfulness",
    },
    {
      id: "b-3",
      text: "Explore 5 serene ambient soundscapes",
      isCompleted: true,
      category: "Relaxation",
    },
  ],
};

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
          music: data.music || null,
          stickers: data.stickers || [],
          tags: data.tags || [],
          coverColor: data.coverColor || "pink",
          summary: data.summary || undefined,
          geminiChat: data.geminiChat || [],
          wordCount: data.wordCount || 0,
          sentiment: data.sentiment || undefined,
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
    music: entry.music || null,
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
export async function toggleFavoriteJournalDoc(
  userId: string,
  entryId: string,
  currentFavoriteState: boolean
): Promise<void> {
  if (!userId) return;
  const journalRef = doc(db, "users", userId, "journals", entryId);
  await setDoc(journalRef, { isFavorite: !currentFavoriteState, updatedAt: new Date().toISOString() }, { merge: true });
}

export const toggleJournalFavoriteDoc = toggleFavoriteJournalDoc;

/**
 * Toggle pinned status
 */
export async function togglePinnedJournalDoc(
  userId: string,
  entryId: string,
  currentPinnedState: boolean
): Promise<void> {
  if (!userId) return;
  const journalRef = doc(db, "users", userId, "journals", entryId);
  await setDoc(journalRef, { isPinned: !currentPinnedState, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Requirement 9: Repair invalid/stale journal location coordinates in Firestore
 */
export async function repairJournalLocationCoords(
  entries: JournalEntry[]
): Promise<{ repaired: JournalEntry[]; hasChanges: boolean }> {
  let hasChanges = false;

  const isValidCoord = (val: any) => typeof val === "number" && !isNaN(val) && val >= -180 && val <= 180;

  const repaired = entries.map((entry) => {
    if (entry.location) {
      const latValid = isValidCoord(entry.location.latitude);
      const lngValid = isValidCoord(entry.location.longitude);

      if (!latValid || !lngValid) {
        hasChanges = true;
        const validLat = latValid ? entry.location.latitude : 40.7128;
        const validLng = lngValid ? entry.location.longitude : -74.006;
        return {
          ...entry,
          location: {
            name: entry.location.name || "Sanctuary Haven",
            latitude: validLat,
            longitude: validLng,
          },
        };
      }
    }
    return entry;
  });

  return { repaired, hasChanges };
}

/**
 * User Profile at /users/{userId}
 */
export async function saveUserProfileDoc(userId: string, profile: Partial<UserProfile>): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  const cleanProfile: Record<string, any> = {};
  Object.entries(profile).forEach(([key, val]) => {
    if (val !== undefined) {
      cleanProfile[key] = val;
    }
  });
  cleanProfile.updatedAt = new Date().toISOString();
  await setDoc(userRef, cleanProfile, { merge: true });
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
 * Save general conversation document
 */
export async function saveConversationDoc(userId: string, convo: any): Promise<void> {
  if (!userId || !convo.id) return;
  const ref = doc(db, "users", userId, "conversations", convo.id);
  await setDoc(ref, { ...convo, userId, updatedAt: new Date().toISOString() }, { merge: true });
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

  const docPath = `users/${userId}/ayraConversations`;

  try {
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
            title: data.title || "Untitled Chat",
            mode: data.mode || "just-talk",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            messages: data.messages || [],
          });
        });
        onUpdate(convos);
      },
      (err) => {
        console.error("[AYRA FIRESTORE ERROR]", {
          code: err?.code || "permission-denied",
          message: err?.message || String(err),
          operation: "onSnapshot",
          path: docPath,
        });
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error("[AYRA FIRESTORE ERROR]", {
      code: err?.code || "subscription-init-failure",
      message: err?.message || String(err),
      operation: "subscribeToUserAyraConversations",
      path: docPath,
    });
    onUpdate([]);
    return () => {};
  }
}

/**
 * Save or update an AYRA conversation in /users/{userId}/ayraConversations/{convoId}
 */
export async function saveAyraConversationDoc(
  userId: string,
  conversation: AyraConversation
): Promise<void> {
  if (!userId) {
    const err = new Error("Authentication required to save AYRA conversation: userId is empty.");
    console.error("[AYRA FIRESTORE ERROR]", {
      code: "unauthenticated",
      message: err.message,
      operation: "saveAyraConversationDoc",
      path: "users/undefined/ayraConversations",
    });
    throw err;
  }

  if (!conversation || !conversation.id) {
    const err = new Error("Invalid conversation object: conversation.id is required.");
    console.error("[AYRA FIRESTORE ERROR]", {
      code: "invalid-argument",
      message: err.message,
      operation: "saveAyraConversationDoc",
      path: `users/${userId}/ayraConversations`,
    });
    throw err;
  }

  const docPath = `users/${userId}/ayraConversations/${conversation.id}`;

  try {
    const convoRef = doc(db, "users", userId, "ayraConversations", conversation.id);

    const payload = {
      id: conversation.id,
      userId,
      title: conversation.title || "Talk with AYRA",
      mode: conversation.mode || "just-talk",
      messages: conversation.messages || [],
      isCrisisActive: !!conversation.isCrisisActive,
      reflectionDraft: conversation.reflectionDraft || null,
      createdAt: conversation.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cleanPayload = sanitizeFirestoreData(payload);

    await setDoc(convoRef, cleanPayload, { merge: true });
  } catch (err: any) {
    console.error("[AYRA FIRESTORE ERROR]", {
      code: err?.code || "setDoc-failure",
      message: err?.message || String(err),
      operation: "setDoc",
      path: docPath,
    });
    throw err;
  }
}

/**
 * Delete an AYRA conversation from /users/{userId}/ayraConversations/{convoId}
 */
export async function deleteAyraConversationDoc(
  userId: string,
  convoId: string
): Promise<void> {
  if (!userId) return;
  const docPath = `users/${userId}/ayraConversations/${convoId}`;
  try {
    const convoRef = doc(db, "users", userId, "ayraConversations", convoId);
    await deleteDoc(convoRef);
  } catch (err: any) {
    console.error("[AYRA FIRESTORE ERROR]", {
      code: err?.code || "deleteDoc-failure",
      message: err?.message || String(err),
      operation: "deleteDoc",
      path: docPath,
    });
    throw err;
  }
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
  if (!userId) return;
  const aboutMeRef = doc(db, "users", userId, "profile", "aboutMe");
  await setDoc(aboutMeRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
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
  const bucketRef = doc(db, "users", userId, "profile", "bucketList");
  return onSnapshot(
    bucketRef,
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

export async function saveBucketListDoc(userId: string, data: BucketListData): Promise<void> {
  if (!userId) return;
  const bucketRef = doc(db, "users", userId, "profile", "bucketList");
  await setDoc(bucketRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Profile-Scoped Yearly Color Trackers Document stored at /users/{userId}/profile/trackersData
 * Uses /users/{userId}/profile/{profileDoc} path which is fully authorized by Firestore security rules.
 */
interface TrackersProfileDoc {
  trackers: TrackerDoc[];
  entries: Record<string, Record<string, TrackerEntryDoc>>; // trackerId -> dateStr -> TrackerEntryDoc
  updatedAt: string;
}

const getLocalTrackersKey = (userId: string) => `soulself_trackers_${userId}`;

function getLocalTrackersData(userId: string): TrackersProfileDoc {
  try {
    const raw = localStorage.getItem(getLocalTrackersKey(userId));
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { trackers: [], entries: {}, updatedAt: new Date().toISOString() };
}

function saveLocalTrackersData(userId: string, data: TrackersProfileDoc) {
  try {
    localStorage.setItem(getLocalTrackersKey(userId), JSON.stringify(data));
  } catch (e) {}
}

function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        clean[key] = value.map((item) =>
          typeof item === "object" && item !== null ? sanitizeFirestoreData(item) : item
        );
      } else if (typeof value === "object" && value !== null && !(value instanceof Date)) {
        clean[key] = sanitizeFirestoreData(value);
      } else {
        clean[key] = value;
      }
    }
  });
  return clean;
}

export function subscribeToUserTrackers(
  userId: string,
  onUpdate: (trackers: TrackerDoc[]) => void,
  onError?: (error: any) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // Load from local storage immediately as instant baseline
  const local = getLocalTrackersData(userId);
  onUpdate(local.trackers);

  const docRef = doc(db, "users", userId, "profile", "trackersData");

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TrackersProfileDoc;
        const trackersList = data.trackers || [];
        saveLocalTrackersData(userId, data);
        onUpdate(trackersList);
      } else {
        onUpdate(local.trackers);
      }
    },
    (err) => {
      console.warn("Firestore trackers subscription fallback to local:", err?.message || err);
      onUpdate(getLocalTrackersData(userId).trackers);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

export async function saveTrackerDoc(userId: string, tracker: TrackerDoc): Promise<void> {
  if (!userId) throw new Error("Authentication required to save tracker.");

  let currentData = getLocalTrackersData(userId);
  const docRef = doc(db, "users", userId, "profile", "trackersData");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      currentData = snap.data() as TrackersProfileDoc;
    }
  } catch (e) {}

  const trackers = currentData.trackers || [];
  const idx = trackers.findIndex((t) => t.id === tracker.id);

  if (idx >= 0) {
    trackers[idx] = { ...trackers[idx], ...tracker, updatedAt: new Date().toISOString() };
  } else {
    trackers.unshift({ ...tracker, updatedAt: new Date().toISOString() });
  }

  const updatedDoc: TrackersProfileDoc = {
    ...currentData,
    trackers,
    updatedAt: new Date().toISOString(),
  };

  saveLocalTrackersData(userId, updatedDoc);

  try {
    await setDoc(docRef, sanitizeFirestoreData(updatedDoc), { merge: true });
  } catch (err: any) {
    console.warn("Saved tracker locally (Firestore sync notice):", err?.message || err);
  }
}

export async function deleteTrackerDoc(userId: string, trackerId: string): Promise<void> {
  if (!userId) return;
  let currentData = getLocalTrackersData(userId);
  const docRef = doc(db, "users", userId, "profile", "trackersData");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      currentData = snap.data() as TrackersProfileDoc;
    }
  } catch (e) {}

  const trackers = (currentData.trackers || []).filter((t) => t.id !== trackerId);
  const entries = { ...(currentData.entries || {}) };
  delete entries[trackerId];

  const updatedDoc: TrackersProfileDoc = {
    ...currentData,
    trackers,
    entries,
    updatedAt: new Date().toISOString(),
  };

  saveLocalTrackersData(userId, updatedDoc);

  try {
    await setDoc(docRef, sanitizeFirestoreData(updatedDoc), { merge: true });
  } catch (e) {}
}

export function subscribeToTrackerEntries(
  userId: string,
  trackerId: string,
  onUpdate: (entries: Record<string, TrackerEntryDoc>) => void,
  onError?: (err: any) => void
) {
  if (!userId || !trackerId) {
    onUpdate({});
    return () => {};
  }

  const local = getLocalTrackersData(userId);
  onUpdate(local.entries?.[trackerId] || {});

  const docRef = doc(db, "users", userId, "profile", "trackersData");

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TrackersProfileDoc;
        const trackerEntries = data.entries?.[trackerId] || {};
        saveLocalTrackersData(userId, data);
        onUpdate(trackerEntries);
      } else {
        onUpdate(local.entries?.[trackerId] || {});
      }
    },
    (err) => {
      onUpdate(getLocalTrackersData(userId).entries?.[trackerId] || {});
      if (onError) onError(err);
    }
  );
}

export async function saveTrackerEntryDoc(
  userId: string,
  trackerId: string,
  entry: TrackerEntryDoc
): Promise<void> {
  if (!userId || !trackerId) return;

  let currentData = getLocalTrackersData(userId);
  const docRef = doc(db, "users", userId, "profile", "trackersData");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      currentData = snap.data() as TrackersProfileDoc;
    }
  } catch (e) {}

  const entries = { ...(currentData.entries || {}) };
  const trackerEntries = { ...(entries[trackerId] || {}) };

  if (!entry.legendId && !entry.note) {
    delete trackerEntries[entry.date];
  } else {
    trackerEntries[entry.date] = {
      date: entry.date,
      legendId: entry.legendId || "",
      note: entry.note || "",
      updatedAt: new Date().toISOString(),
    };
  }

  entries[trackerId] = trackerEntries;

  const updatedDoc: TrackersProfileDoc = {
    ...currentData,
    entries,
    updatedAt: new Date().toISOString(),
  };

  saveLocalTrackersData(userId, updatedDoc);

  try {
    await setDoc(docRef, sanitizeFirestoreData(updatedDoc), { merge: true });
  } catch (e) {}
}

export async function deleteTrackerEntryDoc(
  userId: string,
  trackerId: string,
  date: string
): Promise<void> {
  await saveTrackerEntryDoc(userId, trackerId, {
    date,
    legendId: "",
    note: "",
    updatedAt: new Date().toISOString(),
  });
}

export async function batchClearLegendDoc(
  userId: string,
  trackerId: string,
  legendId: string
): Promise<void> {
  if (!userId || !trackerId) return;

  let currentData = getLocalTrackersData(userId);
  const docRef = doc(db, "users", userId, "profile", "trackersData");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) currentData = snap.data() as TrackersProfileDoc;
  } catch (e) {}

  const entries = { ...(currentData.entries || {}) };
  const trackerEntries = { ...(entries[trackerId] || {}) };

  Object.keys(trackerEntries).forEach((dateKey) => {
    if (trackerEntries[dateKey].legendId === legendId) {
      delete trackerEntries[dateKey];
    }
  });

  entries[trackerId] = trackerEntries;

  const updatedDoc: TrackersProfileDoc = {
    ...currentData,
    entries,
    updatedAt: new Date().toISOString(),
  };

  saveLocalTrackersData(userId, updatedDoc);
  try {
    await setDoc(docRef, sanitizeFirestoreData(updatedDoc), { merge: true });
  } catch (e) {}
}

export async function batchReassignLegendDoc(
  userId: string,
  trackerId: string,
  oldLegendId: string,
  newLegendId: string
): Promise<void> {
  if (!userId || !trackerId) return;

  let currentData = getLocalTrackersData(userId);
  const docRef = doc(db, "users", userId, "profile", "trackersData");

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) currentData = snap.data() as TrackersProfileDoc;
  } catch (e) {}

  const entries = { ...(currentData.entries || {}) };
  const trackerEntries = { ...(entries[trackerId] || {}) };

  Object.keys(trackerEntries).forEach((dateKey) => {
    if (trackerEntries[dateKey].legendId === oldLegendId) {
      trackerEntries[dateKey].legendId = newLegendId;
      trackerEntries[dateKey].updatedAt = new Date().toISOString();
    }
  });

  entries[trackerId] = trackerEntries;

  const updatedDoc: TrackersProfileDoc = {
    ...currentData,
    entries,
    updatedAt: new Date().toISOString(),
  };

  saveLocalTrackersData(userId, updatedDoc);
  try {
    await setDoc(docRef, sanitizeFirestoreData(updatedDoc), { merge: true });
  } catch (e) {}
}

/**
 * Save or update Period Reflection (Weekly, Monthly, Yearly)
 * Path: /users/{userId}/{periodType}Reflections/{periodKey}
 */
export async function savePeriodReflectionDoc(
  userId: string,
  reflection: PeriodReflectionDoc
): Promise<void> {
  if (!userId) throw new Error("Authentication required to save reflection.");
  if (!reflection || !reflection.periodKey || !reflection.periodType) {
    throw new Error("Missing required reflection key or type.");
  }

  const collectionName = `${reflection.periodType}Reflections`;
  const docRef = doc(db, "users", userId, collectionName, reflection.periodKey);

  const cleanDoc = sanitizeFirestoreData({
    ...reflection,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, cleanDoc, { merge: true });
}

export async function getPeriodReflectionDoc(
  userId: string,
  periodType: PeriodType,
  periodKey: string
): Promise<PeriodReflectionDoc | null> {
  if (!userId || !periodType || !periodKey) return null;
  const collectionName = `${periodType}Reflections`;
  const docRef = doc(db, "users", userId, collectionName, periodKey);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as PeriodReflectionDoc;
  }
  return null;
}

export function subscribeToUserPeriodReflections(
  userId: string,
  periodType: PeriodType,
  onUpdate: (reflections: PeriodReflectionDoc[]) => void,
  onError?: (err: any) => void
) {
  if (!userId || !periodType) {
    onUpdate([]);
    return () => {};
  }

  const collectionName = `${periodType}Reflections`;
  const collRef = collection(db, "users", userId, collectionName);
  const q = query(collRef, orderBy("periodKey", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PeriodReflectionDoc[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as PeriodReflectionDoc);
      });
      onUpdate(list);
    },
    (err) => {
      console.error(`Firestore ${periodType}Reflections error:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Contextual Reflections: Diary Reflection Documents
 * Path: /users/{userId}/diaryReflections/{reflectionId}
 */
export async function saveDiaryReflectionDoc(
  userId: string,
  reflection: DiaryReflectionDoc
): Promise<void> {
  if (!userId) throw new Error("Authentication required to save diary reflection.");
  const docRef = doc(db, "users", userId, "diaryReflections", reflection.id);
  const clean = sanitizeFirestoreData({
    ...reflection,
    userId,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, clean, { merge: true });
}

export async function getDiaryReflectionDoc(
  userId: string,
  reflectionId: string
): Promise<DiaryReflectionDoc | null> {
  if (!userId || !reflectionId) return null;
  const docRef = doc(db, "users", userId, "diaryReflections", reflectionId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as DiaryReflectionDoc;
  return null;
}

/**
 * Contextual Reflections: Globe Reflection Documents
 * Path: /users/{userId}/globeReflections/{reflectionId}
 */
export async function saveGlobeReflectionDoc(
  userId: string,
  reflection: GlobeReflectionDoc
): Promise<void> {
  if (!userId) throw new Error("Authentication required to save globe reflection.");
  const docRef = doc(db, "users", userId, "globeReflections", reflection.id);
  const clean = sanitizeFirestoreData({
    ...reflection,
    userId,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, clean, { merge: true });
}

export async function getGlobeReflectionDoc(
  userId: string,
  reflectionId: string
): Promise<GlobeReflectionDoc | null> {
  if (!userId || !reflectionId) return null;
  const docRef = doc(db, "users", userId, "globeReflections", reflectionId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as GlobeReflectionDoc;
  return null;
}

/**
 * User Notifications for One-Time Home Popups
 * Path: /users/{userId}/notifications/{periodKey}
 */
export async function getUserNotificationDoc(
  userId: string,
  periodKey: string
): Promise<UserNotificationDoc | null> {
  if (!userId || !periodKey) return null;
  const docRef = doc(db, "users", userId, "notifications", periodKey);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserNotificationDoc;
  }
  return null;
}

export async function markUserNotificationReadDoc(
  userId: string,
  periodType: PeriodType,
  periodKey: string
): Promise<void> {
  if (!userId || !periodKey) return;
  const docRef = doc(db, "users", userId, "notifications", periodKey);
  const clean = sanitizeFirestoreData({
    id: periodKey,
    userId,
    periodType,
    periodKey,
    isRead: true,
    dismissedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  await setDoc(docRef, clean, { merge: true });
}

