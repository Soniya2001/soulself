import React, { useState } from "react";
import { Shield, Lock, CheckCircle2, XCircle, AlertTriangle, Play, X, User, Database, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

interface DataIsolationTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestLog {
  id: string;
  name: string;
  status: "pending" | "running" | "passed" | "blocked";
  message: string;
}

export const DataIsolationTestModal: React.FC<DataIsolationTestModalProps> = ({ isOpen, onClose }) => {
  const { user, signInAsDemo, logout } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);

  if (!isOpen) return null;

  const runSecurityIsolationTests = async () => {
    setIsRunning(true);
    const newLogs: TestLog[] = [];

    const addLog = (name: string, status: "passed" | "blocked" | "running", message: string) => {
      newLogs.push({
        id: `${Date.now()}-${Math.random()}`,
        name,
        status,
        message,
      });
      setLogs([...newLogs]);
    };

    try {
      if (!user) {
        addLog("Authentication Check", "blocked", "No user authenticated. Please log in first.");
        setIsRunning(false);
        return;
      }

      // Test 1: Verify current authenticated UID access
      addLog("Own Data Access", "running", `Testing authorized access for current UID: ${user.uid.slice(0, 8)}...`);
      try {
        const ownCol = collection(db, "users", user.uid, "journals");
        const ownSnap = await getDocs(ownCol);
        addLog(
          "Own Data Access",
          "passed",
          `SUCCESS: Authenticated user can securely read their own collection (${ownSnap.docs.length} entries found).`
        );
      } catch (err: any) {
        addLog("Own Data Access", "blocked", `FAILED: Could not read own entries: ${err.message}`);
      }

      // Test 2: Attempt Unauthorized Cross-User Read (Simulate User B trying to read User A or an arbitrary UID)
      const foreignUid = user.uid === "user-a-test" ? "user-b-test" : "arbitrary-other-user-999";
      addLog(
        "Cross-User Isolation (IDOR Defense)",
        "running",
        `Simulating unauthorized read on foreign path: /users/${foreignUid}/journals...`
      );

      try {
        const foreignCol = collection(db, "users", foreignUid, "journals");
        await getDocs(foreignCol);
        addLog(
          "Cross-User Isolation (IDOR Defense)",
          "blocked",
          "SECURITY BREACH: Foreign collection read was unexpectedly allowed!"
        );
      } catch (err: any) {
        // PERMISSION_DENIED is the expected, correct result!
        addLog(
          "Cross-User Isolation (IDOR Defense)",
          "passed",
          `PASSED: Firestore Security Rules blocked foreign read with error: "${err.code || err.message}".`
        );
      }

      // Test 3: Attempt Unauthorized Cross-User Write
      addLog(
        "Cross-User Write Prevention",
        "running",
        `Simulating unauthorized malicious write to /users/${foreignUid}/journals/malicious-doc...`
      );

      try {
        const foreignDoc = doc(db, "users", foreignUid, "journals", "malicious-test-doc");
        await setDoc(foreignDoc, { title: "Malicious Injection", content: "Should be blocked" });
        addLog(
          "Cross-User Write Prevention",
          "blocked",
          "SECURITY BREACH: Foreign document write was unexpectedly allowed!"
        );
      } catch (err: any) {
        addLog(
          "Cross-User Write Prevention",
          "passed",
          `PASSED: Firestore Security Rules strictly rejected malicious cross-user write: "${err.code || err.message}".`
        );
      }

      // Test 4: Root Collection Wildcard Access Defense
      addLog("Root Collection Defense", "running", "Attempting query across root /journals or /conversations...");
      try {
        const rootCol = collection(db, "journals");
        await getDocs(rootCol);
        addLog(
          "Root Collection Defense",
          "blocked",
          "SECURITY BREACH: Root level collection read was not rejected!"
        );
      } catch (err: any) {
        addLog(
          "Root Collection Defense",
          "passed",
          `PASSED: Root wildcard match is denied by security rules: "${err.code || err.message}".`
        );
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-[36px] shadow-2xl border border-pink-200/80 p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-purple-950">
                Security & Data Isolation Suite
              </h3>
              <p className="text-xs text-purple-900/60 font-sans">
                Section 13 Verification: UID authorization & cross-user boundary tests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-pink-50 text-purple-900/60 hover:text-purple-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Identity Box */}
        <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-purple-900/60 block">
              Active Firebase Identity
            </span>
            <span className="font-bold text-purple-950 text-sm">
              {user?.displayName || user?.email || "Anonymous User"}
            </span>
            <span className="text-[11px] text-purple-900/50 block font-mono mt-0.5">
              UID: {user?.uid || "Not Signed In"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => signInAsDemo("User A (Soniya)")}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-pink-100 border border-pink-200 text-[11px] font-semibold text-purple-950 transition-all cursor-pointer"
            >
              Switch to User A
            </button>
            <button
              onClick={() => signInAsDemo("User B (Alex)")}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-purple-100 border border-purple-200 text-[11px] font-semibold text-purple-950 transition-all cursor-pointer"
            >
              Switch to User B
            </button>
          </div>
        </div>

        {/* Test Trigger Button */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
            Live Security Rule Probes
          </span>
          <button
            id="run-security-isolation-probes-btn"
            onClick={runSecurityIsolationTests}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs tracking-wider uppercase shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {isRunning ? "Testing Security Boundaries..." : "Run Isolation Tests"}
          </button>
        </div>

        {/* Logs Output Container */}
        <div className="flex-1 overflow-y-auto space-y-3 bg-[#FAF7F9] p-4 rounded-2xl border border-pink-100/80 min-h-[220px]">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-purple-900/40 p-6">
              <Database className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs">
                Click "Run Isolation Tests" to verify that Cloud Firestore and security rules
                strictly isolate each user's journals and conversations.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white rounded-xl border border-pink-100/70 shadow-2xs text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-purple-950">{log.name}</span>
                  {log.status === "passed" && (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                    </span>
                  )}
                  {log.status === "blocked" && (
                    <span className="flex items-center gap-1 text-red-600 font-bold text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> REJECTED
                    </span>
                  )}
                  {log.status === "running" && (
                    <span className="text-pink-600 animate-pulse text-[11px]">Probing...</span>
                  )}
                </div>
                <p className="text-[#6A546E] leading-relaxed">{log.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-pink-100 flex items-center justify-between text-[11px] text-purple-900/60">
          <span>Enforces Firestore rules: `request.auth.uid == userId`</span>
          <button onClick={onClose} className="font-semibold text-pink-600 hover:underline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
