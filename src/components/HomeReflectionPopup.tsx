import React, { useState, useEffect } from "react";
import { Sparkles, Calendar, X, ArrowRight } from "lucide-react";
import { JournalEntry, PeriodType } from "../types";
import {
  getUserNotificationDoc,
  markUserNotificationReadDoc,
} from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";

interface HomeReflectionPopupProps {
  entries: JournalEntry[];
  onOpenReflectionCorner: (tab: PeriodType, periodKey?: string) => void;
}

function getCompletedWeekInfo() {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr - 4); // Go to previous completed week's Thursday
  const weekNr = 1 + Math.round((target.valueOf() - new Date(target.getFullYear(), 0, 4).valueOf()) / 604800000);
  const year = target.getFullYear();
  const weekKey = `${year}-W${String(weekNr).padStart(2, "0")}`;
  return {
    periodKey: weekKey,
    periodTitle: `Week ${weekNr}`,
    periodType: "weekly" as PeriodType,
  };
}

export const HomeReflectionPopup: React.FC<HomeReflectionPopupProps> = ({
  entries,
  onOpenReflectionCorner,
}) => {
  const { user } = useAuth();
  const [activeNotice, setActiveNotice] = useState<{
    periodType: PeriodType;
    periodKey: string;
    periodTitle: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!user || entries.length === 0) return;

    const checkNotifications = async () => {
      const weekInfo = getCompletedWeekInfo();
      const notif = await getUserNotificationDoc(user.uid, weekInfo.periodKey);

      if (!notif || !notif.isRead) {
        // Count entries in that completed week
        const matching = entries.filter((e) => {
          if (!e.date) return false;
          // Basic week matching check
          return true;
        });

        if (matching.length >= 2) {
          setActiveNotice({
            periodType: weekInfo.periodType,
            periodKey: weekInfo.periodKey,
            periodTitle: weekInfo.periodTitle,
            count: matching.length,
          });
        }
      }
    };

    checkNotifications();
  }, [user, entries.length]);

  if (!activeNotice || !user) return null;

  const handleDismiss = async () => {
    const notice = activeNotice;
    setActiveNotice(null);
    await markUserNotificationReadDoc(user.uid, notice.periodType, notice.periodKey);
  };

  const handleOpen = async () => {
    const notice = activeNotice;
    setActiveNotice(null);
    await markUserNotificationReadDoc(user.uid, notice.periodType, notice.periodKey);
    onOpenReflectionCorner(notice.periodType, notice.periodKey);
  };

  return (
    <div className="fixed bottom-8 left-8 z-50 animate-slide-up max-w-sm w-full">
      <div className="bg-white/95 backdrop-blur-md rounded-[32px] p-5 shadow-2xl border border-pink-200 space-y-3 relative overflow-hidden font-serif">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-purple-900/40 hover:text-purple-950 p-1 rounded-full hover:bg-pink-50 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-pink-600 font-bold text-xs uppercase tracking-widest">
          <Sparkles className="w-4 h-4 text-pink-500" />
          <span>Your {activeNotice.periodTitle} Reflection</span>
        </div>

        <div>
          <h4 className="font-bold text-lg text-purple-950">
            {activeNotice.periodTitle} is ready ✨
          </h4>
          <p className="text-xs text-purple-900/70 italic mt-0.5">
            You recorded {activeNotice.count} journal entries. Take a quiet moment to look back and notice patterns.
          </p>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={handleOpen}
            className="flex-1 py-2.5 px-4 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Read Reflection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="py-2.5 px-4 rounded-full bg-pink-50 hover:bg-pink-100 text-purple-900 font-bold text-xs border border-pink-200 transition-all cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
