import React, { useState } from "react";
import {
  Home,
  BookHeart,
  LayoutGrid,
  BookOpen,
  Globe,
  Sparkles,
  Shield,
  User,
  LogOut,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  SunMedium,
  HeartHandshake,
} from "lucide-react";
import { audioManager } from "../utils/audio";
import { UserProfile } from "../types";
import { useAuth } from "../context/AuthContext";
import { DataIsolationTestModal } from "./DataIsolationTestModal";

export type NavViewType =
  | "dashboard"
  | "writer"
  | "all-entries"
  | "globe"
  | "calendar"
  | "emotional"
  | "ayra"
  | "diary-book"
  | "trackers"
  | "reflection-corner";

interface SidebarProps {
  currentView: NavViewType;
  onNavigate: (view: NavViewType) => void;
  onOpenNewJournal: () => void;
  onShowSplash: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenNewJournal,
  onShowSplash,
  userProfile,
  onUpdateProfile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const navItems = [
    {
      id: "dashboard" as NavViewType,
      label: "Home",
      icon: Home,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
    {
      id: "diary-book" as NavViewType,
      label: "Diary Book",
      icon: BookHeart,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
    {
      id: "trackers" as NavViewType,
      label: "Trackers",
      icon: LayoutGrid,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
    {
      id: "all-entries" as NavViewType,
      label: "All Journals",
      icon: BookOpen,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
    {
      id: "globe" as NavViewType,
      label: "Memory Globe",
      icon: Globe,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
    {
      id: "reflection-corner" as NavViewType,
      label: "Reflection Corner",
      icon: Sparkles,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
    {
      id: "ayra" as NavViewType,
      label: "AYRA AI",
      icon: HeartHandshake,
      badge: null,
      color: "hover:bg-pink-50 text-pink-900 font-semibold",
      activeColor: "bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white font-extrabold shadow-md",
    },
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar (Shown on small screens) */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-[#FAF7F9]/95 backdrop-blur-md border-b border-pink-200/60 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-pink-200 shadow-2xs flex items-center justify-center text-lg">
            🌸
          </div>
          <span className="font-serif text-xl font-bold tracking-wider text-purple-950 uppercase">
            SoulSelf
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("trackers")}
            className={`p-2 rounded-full border border-pink-200 ${
              currentView === "trackers" ? "bg-pink-600 text-white" : "bg-white text-purple-900"
            }`}
            title="Yearly Trackers"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-white border border-pink-200 text-purple-950 font-bold"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 space-y-4 border-t border-pink-200 animate-slide-up">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <span className="font-serif text-lg font-bold text-purple-950">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-purple-950/60 hover:text-purple-950 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isActive ? item.activeColor : "bg-pink-50/60 text-purple-950 hover:bg-pink-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-pink-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowSecurityModal(true);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-1.5 text-xs text-purple-900 font-medium"
              >
                <Shield className="w-3.5 h-3.5 text-pink-600" />
                <span>Security</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 text-xs font-serif italic text-purple-950"
              >
                <div className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  {userProfile.name.charAt(0)}
                </div>
                <span>{userProfile.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Vertical Sidebar */}
      <aside
        id="soulself-sidebar-desktop"
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-[#FAF7F9]/90 backdrop-blur-md border-r border-pink-200/70 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header / Brand Logo */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-pink-100/70">
          <div
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-white border border-pink-200 shadow-2xs flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
              <span>🌸</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold tracking-widest text-purple-950 uppercase group-hover:text-pink-600 transition-colors">
                  SoulSelf
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-purple-900/40 -mt-0.5">
                  Mindful Sanctuary
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="p-1.5 rounded-full hover:bg-pink-100/60 text-purple-900/60 hover:text-purple-950 transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  isActive ? item.activeColor : `${item.color} hover:scale-[1.01]`
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="w-4 h-4 shrink-0" />
                </div>

                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs font-normal ml-1">{item.badge}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Controls */}
        <div className="p-3 border-t border-pink-100/70 space-y-2">
          {/* Security & Data Isolation Modal Launcher */}
          <button
            onClick={() => setShowSecurityModal(true)}
            title="Verify Security & Data Isolation"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 hover:bg-pink-50 text-purple-900/80 border border-pink-200/60 text-xs font-medium transition-colors cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            {!isCollapsed && <span className="text-[11px] font-bold">Security</span>}
          </button>

          {/* Intro Replay */}
          <button
            onClick={onShowSplash}
            title="Replay Intro Splash"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 hover:bg-pink-50 text-purple-900/80 border border-pink-200/60 text-xs font-medium transition-colors cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            {!isCollapsed && <span className="text-[11px] font-bold">Replay Splash</span>}
          </button>

          {/* Profile User Badge */}
          <button
            onClick={() => setShowProfileModal(true)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-2xl bg-white hover:bg-pink-50 border border-pink-200/80 shadow-2xs transition-colors cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs font-serif font-bold shrink-0">
              {userProfile.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-serif font-semibold italic text-purple-950 truncate">
                  {userProfile.name}
                </span>
                <span className="text-[9px] text-purple-900/50 truncate">Account Profile</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Security & Data Isolation Modal */}
      <DataIsolationTestModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

      {/* Profile & Account Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-pink-100 animate-scale-up">
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
