import React, { useState } from "react";
import {
  Inbox,
  Instagram,
  Facebook,
  Share2,
  UploadCloud,
  Sparkles,
  Plus,
  Calendar,
  MapPin,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  Trash2,
  Clock,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  Search,
  Navigation,
  Loader2,
} from "lucide-react";
import { SocialMemoryItem, JournalLocation } from "../types";
import { POPULAR_LOCATIONS } from "../data/initialData";
import {
  resolveLocationFromName,
  detectCurrentLocation,
  getSavedPreferredLocation,
  savePreferredLocation,
} from "../utils/location";

interface MemoryInboxProps {
  memories: SocialMemoryItem[];
  onAddMemoryToJournal: (memory: SocialMemoryItem) => void;
  onSaveNewMemory: (memory: SocialMemoryItem) => void;
  onDeleteMemory: (memoryId: string) => void;
}

export const MemoryInbox: React.FC<MemoryInboxProps> = ({
  memories,
  onAddMemoryToJournal,
  onSaveNewMemory,
  onDeleteMemory,
}) => {
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"inbox" | "connections" | "import">("inbox");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNJOURNALED" | "JOURNALED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Social Connection States
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, { connected: boolean; username?: string; lastSync?: string }>>({
    instagram: { connected: true, username: "@soniya_art", lastSync: "Today, 04:00 AM" },
    facebook: { connected: false },
    tiktok: { connected: false },
  });

  const [isConnectingPlatform, setIsConnectingPlatform] = useState<string | null>(null);

  // Manual Upload Form State
  const [uploadImageUrl, setUploadImageUrl] = useState<string>("");
  const [uploadCaption, setUploadCaption] = useState<string>("");
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [uploadTime, setUploadTime] = useState<string>("04:30 PM");
  const [uploadLocationName, setUploadLocationName] = useState<string>(
    () => getSavedPreferredLocation()?.name || ""
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [uploadSource, setUploadSource] = useState<"manual_upload" | "instagram" | "facebook" | "tiktok">("manual_upload");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Handle Mock Platform OAuth Connect (Respecting official OAuth directives & no password storage)
  const handleConnectPlatform = (platformKey: string) => {
    setIsConnectingPlatform(platformKey);
    setTimeout(() => {
      setConnectedPlatforms((prev) => ({
        ...prev,
        [platformKey]: {
          connected: !prev[platformKey]?.connected,
          username: prev[platformKey]?.connected ? undefined : `@soniya_${platformKey}`,
          lastSync: "Just now",
        },
      }));
      setIsConnectingPlatform(null);
    }, 1000);
  };

  // Handle file drop / manual photo select
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadImageUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadImageUrl) return;

    const matchedLocation = uploadLocationName.trim()
      ? resolveLocationFromName(uploadLocationName.trim())
      : undefined;

    const newMem: SocialMemoryItem = {
      id: `mem-${Date.now()}`,
      userId: "current-user",
      imageUrl: uploadImageUrl,
      caption: uploadCaption,
      date: uploadDate,
      time: uploadTime,
      location: matchedLocation,
      source: uploadSource,
      isImportedToJournal: false,
      createdAt: new Date().toISOString(),
    };

    onSaveNewMemory(newMem);

    // Reset Form
    setUploadImageUrl("");
    setUploadCaption("");
    setActiveTab("inbox");
  };

  const handleDetectUploadLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const detected = await detectCurrentLocation();
      setUploadLocationName(detected.name);
      savePreferredLocation(detected);
    } catch (err) {
      console.warn("GPS detection failed:", err);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Filtered memory list
  const filteredMemories = memories.filter((m) => {
    const matchSource = sourceFilter === "ALL" || m.source === sourceFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "UNJOURNALED" && !m.isImportedToJournal) ||
      (statusFilter === "JOURNALED" && m.isImportedToJournal);

    const matchSearch =
      !searchQuery ||
      (m.caption && m.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.location?.name && m.location.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.date.includes(searchQuery);

    return matchSource && matchStatus && matchSearch;
  });

  return (
    <div id="soulself-memory-inbox-page" className="w-full mb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950 flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-pink-500" />
              MEMORY INBOX 📸
            </span>
            <span className="w-2 h-2 rounded-full bg-pink-400" />
          </div>
          <p className="text-xs text-purple-900/60 font-serif italic">
            Gather your photos from Instagram, Facebook, TikTok, or camera roll, and gently transform them into journal stories
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-pink-100/80 shadow-2xs">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "inbox"
                ? "bg-purple-950 text-white shadow-xs"
                : "text-purple-900/60 hover:text-purple-950"
            }`}
          >
            Memories ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === "import"
                ? "bg-purple-950 text-white shadow-xs"
                : "text-purple-900/60 hover:text-purple-950"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "connections"
                ? "bg-purple-950 text-white shadow-xs"
                : "text-purple-900/60 hover:text-purple-950"
            }`}
          >
            Social Connections 🔗
          </button>
        </div>
      </div>

      {/* 1. MEMORY INBOX GRID TAB */}
      {activeTab === "inbox" && (
        <div>
          {/* Sub-filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/80 p-3 rounded-2xl border border-pink-100">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search captions or locations..."
                className="w-full pl-8 pr-3 py-1 rounded-full bg-pink-50/50 border border-pink-100 text-xs text-purple-950 placeholder:text-purple-400/60 focus:outline-none"
              />
            </div>

            {/* Source Filters */}
            <div className="flex items-center gap-1">
              {[
                { key: "ALL", label: "All Sources" },
                { key: "instagram", label: "Instagram" },
                { key: "facebook", label: "Facebook" },
                { key: "tiktok", label: "TikTok" },
                { key: "manual_upload", label: "Camera Roll" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSourceFilter(s.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                    sourceFilter === s.key
                      ? "bg-pink-500 text-white"
                      : "text-purple-900/60 hover:bg-pink-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  statusFilter === "ALL" ? "bg-purple-950 text-white" : "text-purple-900/60 hover:bg-pink-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("UNJOURNALED")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  statusFilter === "UNJOURNALED" ? "bg-purple-950 text-white" : "text-purple-900/60 hover:bg-pink-50"
                }`}
              >
                ✨ Unwritten ({memories.filter((m) => !m.isImportedToJournal).length})
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredMemories.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-[36px] bg-white border border-dashed border-pink-200">
              <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-xl font-bold text-purple-950 mb-1">
                No memories in inbox
              </h4>
              <p className="text-xs text-purple-900/60 font-serif italic max-w-sm mx-auto mb-4">
                Import photos from your camera roll or link your social accounts to surface past moments.
              </p>
              <button
                onClick={() => setActiveTab("import")}
                className="px-6 py-2.5 rounded-full bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Upload a Photo Memory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="group relative rounded-[32px] bg-white border border-pink-100 shadow-xs hover:shadow-xl hover:border-pink-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Photo Frame Container */}
                  <div className="relative h-56 w-full overflow-hidden bg-pink-50">
                    <img
                      src={mem.imageUrl}
                      alt={mem.caption || "Memory"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Source Badge on Top Left */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                      {mem.source === "instagram" && <span>📷 Instagram</span>}
                      {mem.source === "facebook" && <span>👥 Facebook</span>}
                      {mem.source === "tiktok" && <span>🎵 TikTok</span>}
                      {mem.source === "manual_upload" && <span>📸 Camera Roll</span>}
                    </div>

                    {/* Status Badge on Top Right */}
                    {mem.isImportedToJournal ? (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <Check className="w-3 h-3" />
                        <span>Journaled</span>
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-purple-900/80 backdrop-blur-md text-pink-200 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3 text-pink-300" />
                        <span>Ready to Journal</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-[11px] text-purple-400 mb-2 font-serif">
                        <div className="flex items-center gap-1 text-purple-900/70 font-semibold">
                          <Calendar className="w-3 h-3 text-pink-400" />
                          <span>{mem.date}</span>
                        </div>
                        {mem.location && (
                          <div className="flex items-center gap-1 text-pink-600 font-semibold">
                            <MapPin className="w-3 h-3" />
                            <span>{mem.location.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Caption */}
                      <p className="font-serif text-sm text-purple-950 line-clamp-3 leading-relaxed mb-4">
                        {mem.caption || "A quiet photograph awaiting your story..."}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-pink-50 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="p-2 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove Memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onAddMemoryToJournal(mem)}
                        className="flex-1 py-2 px-3 rounded-full bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-950 hover:to-indigo-950 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-pink-300" />
                        <span>{mem.isImportedToJournal ? "Write Another Entry" : "Add to Journal"}</span>
                        <ArrowRight className="w-3 h-3 text-pink-300" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MANUAL PHOTO IMPORT TAB */}
      {activeTab === "import" && (
        <div className="max-w-2xl mx-auto rounded-[36px] bg-white border border-pink-200/80 p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto mb-2">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-purple-950">
              Add Photo to Memory Inbox
            </h3>
            <p className="text-xs text-purple-900/60 font-serif italic mt-1">
              Select or drop a photo, tag the date and place, and prepare it for your digital diary
            </p>
          </div>

          <form onSubmit={handleManualMemorySubmit} className="space-y-5">
            {/* Drag and Drop Zone or Preview */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`relative rounded-3xl border-2 border-dashed transition-all p-6 text-center ${
                isDragging
                  ? "border-pink-500 bg-pink-50"
                  : "border-pink-200 hover:border-pink-400 bg-pink-50/30"
              }`}
            >
              {uploadImageUrl ? (
                <div className="relative rounded-2xl overflow-hidden max-h-72 w-full mx-auto shadow-md">
                  <img
                    src={uploadImageUrl}
                    alt="Upload Preview"
                    className="w-full h-full object-cover max-h-72"
                  />
                  <button
                    type="button"
                    onClick={() => setUploadImageUrl("")}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black text-white text-xs"
                  >
                    ✕ Change Photo
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <ImageIcon className="w-10 h-10 text-pink-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-purple-950 mb-1">
                    Drag & drop your photo here
                  </p>
                  <p className="text-xs text-purple-900/50 mb-4">
                    Supports JPG, PNG, WEBP from your device
                  </p>
                  <label className="px-5 py-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors inline-block">
                    <span>Browse Files</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Photo Caption / Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1.5">
                Memory Caption / Initial Thoughts
              </label>
              <textarea
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="What happened in this moment? What did you feel?"
                rows={3}
                className="w-full p-3.5 rounded-2xl bg-pink-50/40 border border-pink-100 text-xs text-purple-950 placeholder:text-purple-400/60 focus:outline-none focus:ring-1 focus:ring-pink-300"
              />
            </div>

            {/* Date & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1.5">
                  Date of Photo
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-pink-50/40 border border-pink-100">
                  <Calendar className="w-4 h-4 text-pink-400" />
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="bg-transparent text-xs text-purple-950 font-medium focus:outline-none w-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-950">
                    Location (Mapped to Globe 🌍)
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectUploadLocation}
                    disabled={isDetectingLocation}
                    className="text-[11px] text-pink-600 hover:text-pink-800 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3" />
                        <span>Use Current Location</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-pink-50/40 border border-pink-100">
                  <MapPin className="w-4 h-4 text-pink-400 shrink-0" />
                  <input
                    type="text"
                    list="popular-locations-list"
                    value={uploadLocationName}
                    onChange={(e) => setUploadLocationName(e.target.value)}
                    placeholder="Type any city or place (e.g. Kyoto, Paris, Home)..."
                    className="bg-transparent text-xs text-purple-950 font-medium focus:outline-none w-full placeholder:text-purple-400/60"
                  />
                  <datalist id="popular-locations-list">
                    {POPULAR_LOCATIONS.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name}, {loc.country}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Source Tag */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1.5">
                Memory Source
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "manual_upload", label: "📸 Camera Roll" },
                  { key: "instagram", label: "📷 Instagram" },
                  { key: "facebook", label: "👥 Facebook" },
                  { key: "tiktok", label: "🎵 TikTok" },
                ].map((src) => (
                  <button
                    type="button"
                    key={src.key}
                    onClick={() => setUploadSource(src.key as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      uploadSource === src.key
                        ? "bg-purple-950 text-white border-purple-950"
                        : "bg-white text-purple-900 border-pink-100 hover:bg-pink-50"
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-purple-900/60 hover:text-purple-950 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!uploadImageUrl}
                className="px-6 py-2.5 rounded-full bg-purple-950 hover:bg-purple-900 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Save to Memory Inbox
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. SOCIAL CONNECTIONS TAB */}
      {activeTab === "connections" && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Security & OAuth Policy Banner */}
          <div className="rounded-3xl p-6 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border border-pink-200 flex items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-purple-950 text-base mb-1">
                Official OAuth Security & Privacy Guarantee
              </h4>
              <p className="text-xs text-purple-900/75 leading-relaxed font-serif">
                SoulSelf connects using official platform APIs and OAuth standard flows. We will <strong>never</strong> ask for or store your social media passwords. Data is strictly isolated in your private user profile and never shared with third parties.
              </p>
            </div>
          </div>

          {/* Social Platforms List */}
          <div className="space-y-4">
            {/* Instagram */}
            <div className="rounded-3xl p-6 bg-white border border-pink-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-purple-950 text-base">
                      Instagram Graph API
                    </h4>
                    {connectedPlatforms.instagram.connected && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-900/60 font-serif mt-0.5">
                    Sync feed photos, stories, and carousel moments with date & geotags.
                  </p>
                  {connectedPlatforms.instagram.connected && (
                    <div className="text-[11px] text-pink-600 font-medium mt-1">
                      Account: {connectedPlatforms.instagram.username} • Synced {connectedPlatforms.instagram.lastSync}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleConnectPlatform("instagram")}
                disabled={isConnectingPlatform === "instagram"}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  connectedPlatforms.instagram.connected
                    ? "bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200"
                    : "bg-purple-950 hover:bg-purple-900 text-white shadow-sm"
                }`}
              >
                {isConnectingPlatform === "instagram"
                  ? "Authorizing..."
                  : connectedPlatforms.instagram.connected
                  ? "Disconnect"
                  : "Connect Instagram"}
              </button>
            </div>

            {/* Facebook */}
            <div className="rounded-3xl p-6 bg-white border border-pink-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Facebook className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-purple-950 text-base">
                      Facebook Graph API
                    </h4>
                    {connectedPlatforms.facebook.connected && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-900/60 font-serif mt-0.5">
                    Import timeline photographs, albums, and milestone life events.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleConnectPlatform("facebook")}
                disabled={isConnectingPlatform === "facebook"}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  connectedPlatforms.facebook.connected
                    ? "bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200"
                    : "bg-purple-950 hover:bg-purple-900 text-white shadow-sm"
                }`}
              >
                {isConnectingPlatform === "facebook"
                  ? "Authorizing..."
                  : connectedPlatforms.facebook.connected
                  ? "Disconnect"
                  : "Connect Facebook"}
              </button>
            </div>

            {/* TikTok */}
            <div className="rounded-3xl p-6 bg-white border border-pink-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm font-bold text-sm">
                  TikTok
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-purple-950 text-base">
                      TikTok for Developers
                    </h4>
                    {connectedPlatforms.tiktok.connected && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-900/60 font-serif mt-0.5">
                    Fetch photo slide posts and video keyframe moments.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleConnectPlatform("tiktok")}
                disabled={isConnectingPlatform === "tiktok"}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  connectedPlatforms.tiktok.connected
                    ? "bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200"
                    : "bg-purple-950 hover:bg-purple-900 text-white shadow-sm"
                }`}
              >
                {isConnectingPlatform === "tiktok"
                  ? "Authorizing..."
                  : connectedPlatforms.tiktok.connected
                  ? "Disconnect"
                  : "Connect TikTok"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
