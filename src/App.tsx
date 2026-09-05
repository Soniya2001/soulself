import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookHeart,
  Calendar as CalendarIcon,
  Heart,
  Plus,
  ArrowRight,
  Flame,
  Clock,
  Compass,
  Smile,
  PenTool,
  RotateCcw,
  Loader2,
  Shield,
  Globe,
  Inbox,
} from "lucide-react";
import {
  JournalEntry,
  MoodType,
  UserProfile,
  SocialMemoryItem,
  JournalLocation,
  AboutMeData,
  BucketListData,
  TrackerDoc,
} from "./types";
import {
  DEFAULT_USER_PROFILE,
  INITIAL_JOURNAL_ENTRIES,
  DEFAULT_ABOUT_ME,
  DEFAULT_BUCKET_LIST,
} from "./data/initialData";
import { getSavedPreferredLocation, repairJournalLocationCoords } from "./utils/location";
import { SplashScreen } from "./components/SplashScreen";
import { Sidebar, NavViewType } from "./components/Sidebar";
import { TrackersView } from "./components/Trackers/TrackersView";
import { DashboardStats } from "./components/DashboardStats";
import { GeminiReflectionCard } from "./components/GeminiReflectionCard";
import { JournalCalendar } from "./components/JournalCalendar";
import { EmotionalJourney } from "./components/EmotionalJourney";
import { EmotionKPICards } from "./components/EmotionKPICards";
import { RecentJournals } from "./components/RecentJournals";
import { DiaryBookOpening } from "./components/DiaryBookOpening";
import { DiaryWriter } from "./components/DiaryWriter";
import { DiaryBookView } from "./components/DiaryBookView";
import { AuthScreen } from "./components/AuthScreen";
import { MemoryGlobe } from "./components/MemoryGlobe";
import { MemoryInbox } from "./components/MemoryInbox";
import { AllJournalsView } from "./components/AllJournalsView";
import { AyraChat } from "./components/AyraChat";
import { AyraSpotlightCard } from "./components/AyraSpotlightCard";
import { AyraFloatingButton } from "./components/AyraFloatingButton";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  subscribeToUserJournals,
  saveJournalEntryDoc,
  deleteJournalEntryDoc,
  toggleJournalFavoriteDoc,
  getUserProfileDoc,
  saveUserProfileDoc,
  subscribeToAboutMe,
  saveAboutMeDoc,
  subscribeToBucketList,
  saveBucketListDoc,
  subscribeToUserTrackers,
  saveTrackerDoc,
  deleteTrackerDoc,
} from "./services/firestoreService";
import { audioManager } from "./utils/audio";
import { PetalsCanvas } from "./components/PetalsCanvas";

function MainAppContent() {
  const { user, loading: authLoading } = useAuth();

  // Firestore Synchronized State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trackers, setTrackers] = useState<TrackerDoc[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [aboutMeData, setAboutMeData] = useState<AboutMeData>(DEFAULT_ABOUT_ME);
  const [bucketListData, setBucketListData] = useState<BucketListData>(DEFAULT_BUCKET_LIST);

  // App Navigation & View state
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<NavViewType>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isOpeningBook, setIsOpeningBook] = useState<boolean>(false);
  const [openingTargetView, setOpeningTargetView] = useState<"writer" | "diary-book">("writer");
  const [targetDiaryPage, setTargetDiaryPage] = useState<number>(1);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  const hasSeededWelcomeRef = useRef<Record<string, boolean>>({});

  // Synchronize Firestore Real-Time Stream whenever authenticated user changes
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);

    // 1. Subscribe to User's private journals in /users/{userId}/journals
    const unsubscribeJournals = subscribeToUserJournals(
      user.uid,
      async (userEntries) => {
        // Deduplicate entries by ID
        const uniqueMap = new Map<string, JournalEntry>();
        userEntries.forEach((e) => uniqueMap.set(e.id, e));
        const cleanEntries = Array.from(uniqueMap.values());

        if (cleanEntries.length === 0 && !hasSeededWelcomeRef.current[user.uid]) {
          hasSeededWelcomeRef.current[user.uid] = true;
          // Single deterministic welcome entry ID per user
          const welcomeEntryId = `welcome-${user.uid}`;
          const welcomeEntry: JournalEntry = {
            id: welcomeEntryId,
            userId: user.uid,
            title: "Welcome to My Mindful Sanctuary 🌸",
            content: `Dear SoulSelf,\n\nToday I opened my personal digital diary. Here, in this cozy haven, I can freely express my deepest thoughts, celebrate quiet wins, and reflect on life's gentle unfolding.\n\nWith SoulSelf and Gemini holding space for my words, I look forward to nurturing my peace, creativity, and self-compassion.`,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            mood: "Calm",
            moodEmoji: "🌸",
            weather: "🌤️ Clear",
            categories: ["Personal", "Life", "Gratitude"],
            location: userProfile?.defaultLocation || getSavedPreferredLocation() || undefined,
            wordCount: 54,
            tags: ["New Beginnings", "Mindfulness"],
            isFavorite: true,
            isPinned: true,
            stickers: [
              { id: "st-w1", emoji: "🌸", x: 88, y: 15, scale: 1.3, rotation: 10 },
              { id: "st-w2", emoji: "✨", x: 85, y: 80, scale: 1.1, rotation: -8 },
              { id: "st-w3", emoji: "🦋", x: 12, y: 85, scale: 1.2, rotation: -12 },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveJournalEntryDoc(user.uid, welcomeEntry);
          setEntries([welcomeEntry]);
        } else {
          setEntries(cleanEntries);
          // Requirement 9: Auto-repair invalid historical coordinates (e.g. old pseudo-hashes)
          repairJournalLocationCoords(cleanEntries).then(({ repaired, hasChanges }) => {
            if (hasChanges) {
              setEntries(repaired);
              repaired.forEach((rEntry) => {
                saveJournalEntryDoc(user.uid, rEntry);
              });
            }
          });
        }
        setIsDataLoading(false);
      },
      (err) => {
        console.error("Failed to load user journals:", err);
        setIsDataLoading(false);
      }
    );

    // 2. Fetch User Profile
    getUserProfileDoc(user.uid).then((prof) => {
      if (prof) {
        setUserProfile(prof);
      } else {
        const displayName = user.displayName || user.email?.split("@")[0] || "Beloved Friend";
        const newProf: UserProfile = {
          ...DEFAULT_USER_PROFILE,
          name: displayName,
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
        };
        setUserProfile(newProf);
        saveUserProfileDoc(user.uid, newProf);
      }
    });

    // 3. Subscribe to About Me Page Data
    const unsubscribeAboutMe = subscribeToAboutMe(
      user.uid,
      async (data) => {
        if (data) {
          setAboutMeData(data);
        } else {
          const initialAboutMe: AboutMeData = {
            ...DEFAULT_ABOUT_ME,
            name: user.displayName || userProfile.name || DEFAULT_ABOUT_ME.name,
          };
          setAboutMeData(initialAboutMe);
          await saveAboutMeDoc(user.uid, initialAboutMe);
        }
      },
      (err) => console.error("Failed to load About Me data:", err)
    );

    // 4. Subscribe to Bucket List Data
    const unsubscribeBucketList = subscribeToBucketList(
      user.uid,
      async (data) => {
        if (data && data.items && data.items.length > 0) {
          setBucketListData(data);
        } else {
          setBucketListData(DEFAULT_BUCKET_LIST);
          await saveBucketListDoc(user.uid, DEFAULT_BUCKET_LIST);
        }
      },
      (err) => console.error("Failed to load Bucket List data:", err)
    );

    // 5. Subscribe to User's Yearly Color Trackers
    const unsubscribeTrackers = subscribeToUserTrackers(
      user.uid,
      async (userTrackers) => {
        if (userTrackers.length === 0) {
          // Auto seed welcome tracker template for first-time user
          const defaultTracker: TrackerDoc = {
            id: `tracker-default-${user.uid}`,
            userId: user.uid,
            name: "My Year in Colors",
            description: "A colorful way to track my days and memories throughout the year.",
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0],
            legend: [
              { id: "leg-1", color: "#FDE047", label: "" },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveTrackerDoc(user.uid, defaultTracker);
          setTrackers([defaultTracker]);
        } else {
          setTrackers(userTrackers);
        }
      },
      (err) => console.error("Failed to load trackers data:", err)
    );

    return () => {
      unsubscribeJournals();
      unsubscribeAboutMe();
      unsubscribeBucketList();
      unsubscribeTrackers();
    };
  }, [user]);

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  };

  // Open Diary Book directly to a specific page
  const handleOpenDiaryBook = (page: number = 1) => {
    setTargetDiaryPage(page);
    setOpeningTargetView("diary-book");
    setIsOpeningBook(true);
  };

  // Start a new journal entry with opening animation
  const handleStartNewJournal = (
    prefilledMood?: MoodType,
    prefilledDate?: string,
    promptText?: string,
    prefilledLocation?: JournalLocation
  ) => {
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      userId: user?.uid,
      title: "",
      content: promptText ? `${promptText}\n\n` : "",
      date: prefilledDate || new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mood: prefilledMood || "Happy",
      moodEmoji:
        prefilledMood === "Happy"
          ? "😊"
          : prefilledMood === "Calm"
          ? "🌿"
          : prefilledMood === "Excited"
          ? "✨"
          : prefilledMood === "Worried"
          ? "🌧️"
          : prefilledMood === "Sad"
          ? "💧"
          : prefilledMood === "Tired"
          ? "💤"
          : prefilledMood === "Frustrated"
          ? "⚡"
          : "💭",
      weather: "🌤️ Mild Sun",
      categories: ["Personal"],
      location: prefilledLocation || userProfile?.defaultLocation || getSavedPreferredLocation() || undefined,
      stickers: [],
      tags: ["Diary"],
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveEntry(newEntry);
    setOpeningTargetView("writer");
    setIsOpeningBook(true);
  };

  const handleStartJournalWithDraft = (draft: Partial<JournalEntry>) => {
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      userId: user?.uid,
      title: draft.title || "",
      content: draft.content || "",
      date: draft.date || new Date().toISOString().split("T")[0],
      time: draft.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mood: draft.mood || "Calm",
      moodEmoji: draft.moodEmoji || "💜",
      weather: draft.weather || "🌤️ Clear",
      categories: draft.categories || ["Personal", "Reflection"],
      location: draft.location || userProfile?.defaultLocation || getSavedPreferredLocation() || undefined,
      stickers: draft.stickers || [
        { id: "st-ayra-1", emoji: "💜", x: 88, y: 15, scale: 1.3, rotation: 8 },
        { id: "st-ayra-2", emoji: "✨", x: 85, y: 80, scale: 1.1, rotation: -6 },
      ],
      tags: draft.tags || ["AYRA", "Reflection"],
      wordCount: (draft.content || "").split(/\s+/).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveEntry(newEntry);
    setOpeningTargetView("writer");
    setIsOpeningBook(true);
  };

  // Open existing entry directly on its corresponding diary page
  const handleOpenExistingEntry = (entry: JournalEntry) => {
    const sorted = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const idx = sorted.findIndex((e) => e.id === entry.id);
    const pageNum = 3 + (idx >= 0 ? idx : 0);
    setTargetDiaryPage(pageNum);
    setActiveEntry(entry);
    setOpeningTargetView("diary-book");
    setIsOpeningBook(true);
  };

  const handleSaveEntry = async (savedEntry: JournalEntry) => {
    if (!user) return;
    const entryToSave = { ...savedEntry, userId: user.uid };
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entryToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entryToSave;
        return next;
      } else {
        return [entryToSave, ...prev];
      }
    });
    setActiveEntry(entryToSave);
    await saveJournalEntryDoc(user.uid, entryToSave);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    await deleteJournalEntryDoc(user.uid, id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleToggleFavorite = async (id: string) => {
    if (!user) return;
    const target = entries.find((e) => e.id === id);
    if (target) {
      const nextFav = !target.isFavorite;
      await toggleJournalFavoriteDoc(user.uid, id, nextFav);
    }
  };

  const handleTogglePin = async (id: string) => {
    if (!user) return;
    const target = entries.find((e) => e.id === id);
    if (target) {
      const updated = { ...target, isPinned: !target.isPinned };
      await saveJournalEntryDoc(user.uid, updated);
    }
  };

  const handleUpdateProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    if (user) {
      await saveUserProfileDoc(user.uid, updated);
    }
  };

  // Convert Memory from Inbox into a Journal Page
  const handleConvertMemoryToJournal = (mem: SocialMemoryItem) => {
    const newEntry: JournalEntry = {
      id: `entry-from-mem-${Date.now()}`,
      userId: user?.uid,
      title: mem.caption?.slice(0, 40) || `Memory from ${mem.source}`,
      content: `${mem.caption || "A captured moment in time."}\n\nReflecting back on this memory...`,
      date: mem.date || new Date().toISOString().split("T")[0],
      time: mem.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mood: "Excited",
      moodEmoji: "✨",
      weather: "🌤️ Mild Sun",
      categories: ["Memories", "Life"],
      location: mem.location || userProfile?.defaultLocation || getSavedPreferredLocation() || undefined,
      media: mem.imageUrl
        ? [
            {
              id: `media-${Date.now()}`,
              url: mem.imageUrl,
              type: "image",
              caption: mem.caption || "Imported memory",
              source: mem.source,
              importedAt: new Date().toISOString(),
            },
          ]
        : [],
      stickers: [{ id: "st-mem", emoji: "📸", x: 80, y: 20, scale: 1.2, rotation: 5 }],
      tags: ["Imported", mem.source],
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveEntry(newEntry);
    setIsOpeningBook(true);
  };

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAF7F9] text-purple-950 p-4">
        <PetalsCanvas />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white shadow-xl border border-pink-200 flex items-center justify-center animate-bounce">
            <span className="text-3xl">🌸</span>
          </div>
          <h2 className="font-serif text-3xl font-bold tracking-wide">SoulSelf</h2>
          <div className="flex items-center gap-2 text-xs text-purple-900/60">
            <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
            <span>Connecting to your secure sanctuary...</span>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated State: Show SoulSelf Authentication Screen
  if (!user) {
    return <AuthScreen />;
  }

  // 1. Initial Splash Screen view
  if (showSplash) {
    return (
      <SplashScreen
        onEnter={() => {
          setShowSplash(false);
          audioManager.playSparkleChime();
        }}
      />
    );
  }

  // 2. Book opening 3D animation experience
  if (isOpeningBook) {
    return (
      <DiaryBookOpening
        title={activeEntry?.title || "SoulSelf Diary"}
        onAnimationComplete={() => {
          setIsOpeningBook(false);
          setCurrentView(openingTargetView);
        }}
      />
    );
  }

  // 3. Fullscreen Digital Diary Writer View
  if (currentView === "writer") {
    return (
      <DiaryWriter
        initialEntry={activeEntry}
        userName={userProfile.name}
        allEntries={entries}
        onSaveEntry={handleSaveEntry}
        onBackToDashboard={() => {
          setCurrentView("dashboard");
          setActiveEntry(null);
        }}
        onSelectOtherEntry={(entry) => {
          setActiveEntry(entry);
        }}
      />
    );
  }

  // 4. Fullscreen Permanent 3D Flip Diary Book View (About Me -> Bucket List -> Entries)
  if (currentView === "diary-book") {
    return (
      <DiaryBookView
        entries={entries}
        aboutMeData={aboutMeData}
        bucketListData={bucketListData}
        userProfile={userProfile}
        initialPage={targetDiaryPage}
        onSaveAboutMe={async (data) => {
          setAboutMeData(data);
          if (user) await saveAboutMeDoc(user.uid, data);
        }}
        onSaveBucketList={async (data) => {
          setBucketListData(data);
          if (user) await saveBucketListDoc(user.uid, data);
        }}
        onSaveJournalEntry={handleSaveEntry}
        onDeleteJournalEntry={handleDeleteEntry}
        onCreateNewJournal={() => {
          handleStartNewJournal();
        }}
        onBackToDashboard={() => {
          setCurrentView("dashboard");
        }}
      />
    );
  }

  // Quick mood buttons for morning check-in
  const quickMoods: { mood: MoodType; emoji: string; label: string }[] = [
    { mood: "Happy", emoji: "😊", label: "Happy" },
    { mood: "Calm", emoji: "🌿", label: "Calm" },
    { mood: "Excited", emoji: "✨", label: "Excited" },
    { mood: "Neutral", emoji: "💭", label: "Reflective" },
    { mood: "Tired", emoji: "💤", label: "Tired" },
    { mood: "Worried", emoji: "🌧️", label: "Worried" },
  ];

  const handleSaveTracker = async (tracker: Partial<TrackerDoc>) => {
    if (!user) return;
    const fullTracker: TrackerDoc = {
      id: tracker.id || `tracker-${Date.now()}`,
      userId: user.uid,
      name: tracker.name || "My Year in Colors",
      description: tracker.description,
      startDate: tracker.startDate || new Date().toISOString().split("T")[0],
      endDate: tracker.endDate,
      legend: tracker.legend || [],
      createdAt: tracker.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveTrackerDoc(user.uid, fullTracker);
  };

  const handleDeleteTracker = async (trackerId: string) => {
    if (!user) return;
    await deleteTrackerDoc(user.uid, trackerId);
  };

  return (
    <div id="soulself-dashboard-root" className="min-h-screen bg-[#FCF8FA] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenNewJournal={() => handleStartNewJournal()}
        onShowSplash={() => setShowSplash(true)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Dashboard Body */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* View: Trackers */}
          {currentView === "trackers" && (
            <div className="animate-fade-in">
              <TrackersView
                userId={user.uid}
                userName={userProfile.name}
                trackers={trackers}
                onSaveTracker={handleSaveTracker}
                onDeleteTracker={handleDeleteTracker}
              />
            </div>
          )}

          {/* View 1: 3D Memory Globe */}
          {currentView === "globe" && (
            <div className="animate-fade-in space-y-8">
              <MemoryGlobe
                entries={entries}
                onSelectEntry={handleOpenExistingEntry}
                onNewEntryWithLocation={(loc) => handleStartNewJournal(undefined, undefined, undefined, loc)}
              />
            </div>
          )}

        {/* View 3: All Journals Advanced Archive */}
        {currentView === "all-entries" && (
          <div className="animate-fade-in">
            <AllJournalsView
              entries={entries}
              onSelectEntry={handleOpenExistingEntry}
              onDeleteEntry={handleDeleteEntry}
              onToggleFavorite={handleToggleFavorite}
              onTogglePin={handleTogglePin}
              onNewJournalClick={() => handleStartNewJournal()}
            />
          </div>
        )}

        {/* View 4: Calendar Tab */}
        {currentView === "calendar" && (
          <div className="animate-fade-in">
            <JournalCalendar
              entries={entries}
              onSelectEntry={handleOpenExistingEntry}
              onWriteForDate={(dateStr) => handleStartNewJournal(undefined, dateStr)}
            />
          </div>
        )}

        {/* View 5: Emotional Journey Tab */}
        {currentView === "emotional" && (
          <div className="animate-fade-in">
            <EmotionalJourney
              entries={entries}
              onSelectEntry={handleOpenExistingEntry}
              onNewJournalClick={() => handleStartNewJournal()}
            />
            <GeminiReflectionCard
              entries={entries}
              userName={userProfile.name}
              onPromptClick={(prompt) => handleStartNewJournal(undefined, undefined, prompt)}
            />
          </div>
        )}

        {/* View 6: AYRA AI Companion Dedicated Chatroom */}
        {currentView === "ayra" && (
          <div className="animate-fade-in">
            <AyraChat
              userEntries={entries}
              userName={userProfile.name}
              onOpenJournalInWriter={handleStartJournalWithDraft}
              onBackToDashboard={() => setCurrentView("dashboard")}
            />
          </div>
        )}

        {/* View 7: Default Editorial Dashboard */}
        {currentView === "dashboard" && (
          <div className="animate-fade-in space-y-8">
            {/* 12-Column Editorial Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
              {/* Left Column (8 cols): Greeting, Big Action, Stats, AYRA, Emotional Journey & Calendar */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                {/* Hero Greeting & Editorial Action Button */}
                <div className="space-y-4">
                  <h1
                    id="dashboard-greeting-title"
                    className="font-serif text-4xl sm:text-5xl md:text-6xl text-purple-950 font-bold tracking-tight leading-tight"
                  >
                    {getGreeting()},{" "}
                    <span className="italic font-serif text-pink-600 font-normal">
                      {userProfile.name}.
                    </span>{" "}
                    🌸
                  </h1>
                  <p className="font-serif italic text-lg sm:text-xl text-purple-900/70 max-w-xl">
                    The sun is high, and your space is ready for your thoughts.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Editorial Main Action CTA Button */}
                    <button
                      id="main-write-journal-cta-card"
                      onClick={() => handleStartNewJournal()}
                      className="bg-white border border-pink-200 text-purple-950 px-7 py-4 rounded-full shadow-md flex items-center gap-3 hover:shadow-xl hover:border-pink-300 hover:scale-[1.01] active:scale-[0.99] transition-all group w-fit cursor-pointer"
                    >
                      <span className="font-bold uppercase tracking-widest text-xs">
                        Write Journal
                      </span>
                      <div className="w-7 h-7 rounded-full bg-pink-100/80 group-hover:bg-pink-200 text-pink-700 flex items-center justify-center transition-colors">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Open Full Physical Diary Book Button */}
                    <button
                      id="main-open-diary-book-btn"
                      onClick={() => handleOpenDiaryBook(1)}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-7 py-4 rounded-full shadow-md flex items-center gap-3 hover:shadow-xl hover:from-pink-600 hover:to-purple-700 hover:scale-[1.01] active:scale-[0.99] transition-all group w-fit cursor-pointer"
                    >
                      <BookHeart className="w-4 h-4 text-pink-100" />
                      <span className="font-bold uppercase tracking-widest text-xs">
                        Open Diary Book 📖
                      </span>
                    </button>
                  </div>

                  {/* Diary Quick Nav Chips: About Me, Bucket List, Recent */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] uppercase font-bold text-purple-900/50 mr-1">
                      Quick Open:
                    </span>
                    <button
                      onClick={() => handleOpenDiaryBook(1)}
                      className="px-3 py-1 rounded-full bg-white/90 hover:bg-pink-50 border border-pink-200/80 text-xs text-purple-900 font-serif font-semibold shadow-2xs hover:scale-105 transition-all cursor-pointer"
                    >
                      ✨ Page 1: About Me
                    </button>
                    <button
                      onClick={() => handleOpenDiaryBook(2)}
                      className="px-3 py-1 rounded-full bg-white/90 hover:bg-pink-50 border border-pink-200/80 text-xs text-purple-900 font-serif font-semibold shadow-2xs hover:scale-105 transition-all cursor-pointer"
                    >
                      🎯 Page 2: Bucket List
                    </button>
                    {entries.length > 0 && (
                      <button
                        onClick={() => handleOpenDiaryBook(3)}
                        className="px-3 py-1 rounded-full bg-white/90 hover:bg-pink-50 border border-pink-200/80 text-xs text-purple-900 font-serif font-semibold shadow-2xs hover:scale-105 transition-all cursor-pointer"
                      >
                        📖 Page 3: Latest Journal
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Dashboard Statistics Cards */}
                <DashboardStats entries={entries} />

                {/* Emotion KPI Breakdown Cards (Days logged per emotion) */}
                <EmotionKPICards
                  entries={entries}
                  onSelectMood={(mood) => handleStartNewJournal(mood)}
                />

                {/* Emotional Journey & Mood Flow */}
                <EmotionalJourney
                  entries={entries}
                  onSelectEntry={handleOpenExistingEntry}
                  onNewJournalClick={() => handleStartNewJournal()}
                />

                {/* Calendar View */}
                <JournalCalendar
                  entries={entries}
                  onSelectEntry={handleOpenExistingEntry}
                  onWriteForDate={(dateStr) => handleStartNewJournal(undefined, dateStr)}
                />
              </div>

              {/* Right Column (4 cols): Gemini Noticed Card */}
              <div className="lg:col-span-4 flex flex-col gap-8">
                {/* Gemini Noticed Dark Editorial Card */}
                <GeminiReflectionCard
                  entries={entries}
                  userName={userProfile.name}
                  onPromptClick={(prompt) => handleStartNewJournal(undefined, undefined, prompt)}
                />
              </div>
            </div>

            {/* Single Curated Recent Journals Section */}
            <RecentJournals
              entries={entries}
              onSelectEntry={handleOpenExistingEntry}
              onDeleteEntry={handleDeleteEntry}
              onToggleFavorite={handleToggleFavorite}
              onNewJournalClick={() => handleStartNewJournal()}
              onViewAllClick={() => setCurrentView("all-entries")}
            />
          </div>
        )}
      </main>

      {/* Floating Quick-Access AYRA Companion Button */}
      <AyraFloatingButton
        isOpen={currentView === "ayra" || currentView === "writer"}
        onClick={() => setCurrentView("ayra")}
      />

      {/* Footer */}
      <footer className="border-t border-pink-100/80 bg-white/60 py-6 text-center text-xs text-[#9E83A4] font-sans-ui mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-serif-title font-bold text-pink-700 text-sm">SoulSelf</span>
            <span>•</span>
            <span>Your Personal Mindful Sanctuary</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSplash(true)}
              className="text-pink-600 hover:text-pink-700 font-medium cursor-pointer"
            >
              Replay Intro 🌸
            </button>
            <span>•</span>
            <span>Protected by Firestore Security Rules</span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
