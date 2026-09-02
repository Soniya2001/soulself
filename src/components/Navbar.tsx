import React, { useState } from "react";
import {
  BookHeart,
  Sparkles,
  Plus,
  User,
  Check,
  LogOut,
  Shield,
  Globe,
  Inbox,
} from "lucide-react";
import { audioManager } from "../utils/audio";
import { UserProfile } from "../types";
import { useAuth } from "../context/AuthContext";
import { DataIsolationTestModal } from "./DataIsolationTestModal";
import { AmbientSoundControl } from "./AmbientSoundControl";

interface NavbarProps {
  currentView: "dashboard" | "writer" | "all-entries" | "globe" | "inbox" | "calendar" | "emotional" | "ayra" | "diary-book";
  onNavigate: (view: "dashboard" | "writer" | "all-entries" | "globe" | "inbox" | "calendar" | "emotional" | "ayra" | "diary-book") => void;
  onOpenNewJournal: () => void;
  onShowSplash: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenNewJournal,
  onShowSplash,
  userProfile,
  onUpdateProfile,
}) => {
  const { user, logout } = useAuth();
  const [isAmbientOn, setIsAmbientOn] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);

  const toggleSound = () => {
    const nextState = audioManager.toggleAmbient();
    setIsAmbientOn(nextState);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onUpdateProfile({ ...userProfile, name: tempName.trim() });
    }
    setShowProfileModal(false);
  };

  const handleLogout = async () => {
    setShowProfileModal(false);
    await logout();
  };

  return (
    <>
      <header
        id="app-header-nav"
        className="sticky top-0 z-40 w-full bg-[#FAF7F9]/90 backdrop-blur-md border-b border-pink-200/60 shadow-2xs transition-all duration-200"
      >
        {/* Top Header Row: Brand Logo & User Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 border-b border-pink-100/60">
          {/* Brand Logo & Name */}
          <div
            id="nav-brand-logo"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-pink-200/80 shadow-xs flex items-center justify-center group-hover:border-pink-300 transition-all text-xl">
              <span className="group-hover:scale-110 transition-transform">🌸</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-[0.15em] text-purple-950 uppercase group-hover:text-pink-700 transition-colors">
                SoulSelf
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-purple-900/50 -mt-1 hidden sm:block">
                Personal Diary & AI Companion
              </span>
            </div>
          </div>

          {/* Right Action Controls (Clean & Uncluttered) */}
          <div className="flex items-center gap-2.5">
            {/* Security & Isolation Button */}
            <button
              id="nav-security-isolation-btn"
              onClick={() => setShowSecurityModal(true)}
              title="Verify Security & Data Isolation"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/80 text-purple-900/70 hover:bg-pink-50 hover:text-purple-950 border border-pink-200/60 text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-pink-600" />
              <span className="hidden sm:inline text-[11px] font-bold">Security</span>
            </button>

            {/* Intro Replay Button */}
            <button
              id="replay-intro-btn"
              onClick={onShowSplash}
              title="View Intro Splash Animation"
              className="p-2 rounded-full bg-white/80 text-purple-900/70 hover:bg-pink-50 hover:text-purple-950 border border-pink-200/60 text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </button>

            {/* User Profile Avatar / Name */}
            <button
              id="user-profile-badge-btn"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white hover:bg-pink-50 border border-pink-200 shadow-2xs transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-purple-900 text-pink-100 flex items-center justify-center text-[10px] font-serif font-bold">
                {userProfile.name.charAt(0)}
              </div>
              <span className="text-xs font-serif italic text-purple-950 max-w-[90px] truncate hidden sm:inline">
                {userProfile.name}
              </span>
            </button>
          </div>
        </div>

        {/* Dedicated Navigation Bar (Below Top Header) */}
        <nav className="w-full bg-white/70 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
            <button
              id="nav-home-btn"
              onClick={() => onNavigate("dashboard")}
              className={`text-xs uppercase tracking-[0.15em] font-bold transition-all cursor-pointer whitespace-nowrap px-3.5 py-1.5 rounded-full ${
                currentView === "dashboard"
                  ? "bg-purple-950 text-white font-extrabold shadow-2xs"
                  : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
              }`}
            >
              Home
            </button>

            <button
              id="nav-diary-book-btn"
              onClick={() => onNavigate("diary-book")}
              className={`text-xs uppercase tracking-[0.15em] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${
                currentView === "diary-book"
                  ? "bg-pink-600 text-white font-extrabold shadow-2xs"
                  : "text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 border border-pink-200/80"
              }`}
            >
              <BookHeart className="w-3.5 h-3.5" />
              <span>Diary Book 📖</span>
            </button>

            <button
              id="nav-entries-btn"
              onClick={() => onNavigate("all-entries")}
              className={`text-xs uppercase tracking-[0.15em] font-bold transition-all cursor-pointer whitespace-nowrap px-3.5 py-1.5 rounded-full ${
                currentView === "all-entries"
                  ? "bg-purple-950 text-white font-extrabold shadow-2xs"
                  : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
              }`}
            >
              All Journals
            </button>

            <button
              id="nav-globe-btn"
              onClick={() => onNavigate("globe")}
              className={`text-xs uppercase tracking-[0.15em] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${
                currentView === "globe"
                  ? "bg-purple-950 text-white font-extrabold shadow-2xs"
                  : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Memory Globe</span>
            </button>

            <button
              id="nav-inbox-btn"
              onClick={() => onNavigate("inbox")}
              className={`text-xs uppercase tracking-[0.15em] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${
                currentView === "inbox"
                  ? "bg-purple-950 text-white font-extrabold shadow-2xs"
                  : "text-purple-900/70 hover:text-purple-950 hover:bg-pink-100/50"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Memory Inbox</span>
            </button>

            <button
              id="nav-ayra-btn"
              onClick={() => onNavigate("ayra")}
              className={`text-xs uppercase tracking-[0.15em] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${
                currentView === "ayra"
                  ? "bg-purple-950 text-white font-extrabold shadow-2xs"
                  : "text-purple-700 hover:text-purple-950 bg-pink-100/70 hover:bg-pink-100 border border-pink-200/80 font-bold"
              }`}
            >
              <span>💜</span>
              <span>AYRA</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Security & Data Isolation Modal */}
      <DataIsolationTestModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

      {/* Profile & Account Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div
            id="profile-settings-dialog"
            className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-pink-100 animate-scale-up"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-pink-600">
                <User className="w-5 h-5" />
                <h3 className="font-serif text-xl font-bold text-purple-950">
                  Journal Identity
                </h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-purple-900/40 hover:text-purple-950 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Account Info */}
            <div className="mb-4 p-3 bg-pink-50/60 rounded-2xl border border-pink-100 text-xs">
              <span className="text-[10px] uppercase font-bold text-purple-900/60 block">
                Signed in as
              </span>
              <p className="font-bold text-purple-950 truncate">
                {user?.displayName || userProfile.name}
              </p>
              {user?.email && (
                <p className="text-[11px] text-purple-900/60 truncate">{user.email}</p>
              )}
              <p className="text-[10px] text-purple-900/40 font-mono mt-1 truncate">
                UID: {user?.uid}
              </p>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6E5474] mb-1.5">
                  Display Pen Name 🌸
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Soniya"
                  className="w-full px-4 py-2.5 rounded-2xl bg-pink-50/50 border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  maxLength={30}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-red-600 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
