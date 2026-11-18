import React, { useEffect, useState } from "react";
import {
  Bell,
  Search,
  User,
  ShieldCheck,
  Sliders,
  MonitorSmartphone,
  LogOut,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface TopNavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (tab: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  searchQuery,
  onSearchChange,
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sevFilter, setSevFilter] = useState("all");

  const loadNotifications = async () => {
    try {
      const data = await apiRequest("/notifications");
      setNotifications(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 5000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredNotifs = notifications.filter((n) =>
    sevFilter === "all" ? true : n.severity === sevFilter
  );

  const handleMarkAllRead = async () => {
    await apiRequest("/notifications/read-all", { method: "POST" });
    loadNotifications();
  };

  const handleClearAll = async () => {
    await apiRequest("/notifications/clear", { method: "DELETE" });
    loadNotifications();
  };

  return (
    <>
      <header className="h-16 bg-[#0B0F19] border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search IP, threats, rule IDs..."
            className="w-full bg-[#111827] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Interactive Notification Center */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative p-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-slate-700 text-slate-300"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold">Security Notifications</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark read
                    </button>
                    {user?.role === "admin" && (
                      <button
                        onClick={handleClearAll}
                        className="text-xs text-red-400 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-3.5 py-2 border-b border-slate-800/70 flex gap-1.5 text-xs">
                  {["all", "critical", "high", "medium"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSevFilter(s)}
                      className={`px-2 py-1 rounded capitalize ${
                        sevFilter === s
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800/70 text-slate-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                  {filteredNotifs.length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-500">No security notifications.</p>
                  ) : (
                    filteredNotifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          onNavigate(n.target_route || "alerts");
                          setNotifOpen(false);
                        }}
                        className={`w-full text-left p-3.5 hover:bg-slate-800/50 transition ${
                          !n.is_read ? "bg-indigo-500/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                            {n.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Interactive Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#111827] transition"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold text-sm flex items-center justify-center">
                {user?.full_name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-slate-200">{user?.full_name || "Admin Analyst"}</p>
                <p className="text-[10px] uppercase tracking-wider text-cyan-400">{user?.role || "admin"}</p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 border-b border-slate-800">
                  <p className="text-sm font-semibold text-slate-100">{user?.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {user?.role}
                    </span>
                    {user?.is_verified && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-1.5 text-xs">
                  <button
                    onClick={() => {
                      onNavigate("settings");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
                  >
                    <User className="w-4 h-4 text-slate-400" /> My Profile
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("settings");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
                  >
                    <ShieldCheck className="w-4 h-4 text-cyan-400" /> Account & Security (MFA)
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("settings");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
                  >
                    <Sliders className="w-4 h-4 text-slate-400" /> Preferences
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("settings");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
                  >
                    <MonitorSmartphone className="w-4 h-4 text-slate-400" /> Active Sessions
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setSignOutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      {signOutConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-slate-100 mb-2">Confirm Sign Out</h3>
            <p className="text-xs text-slate-400 mb-5">
              This will invalidate your active server-side session cookie and redirect you to the login portal.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setSignOutConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSignOutConfirm(false);
                  await logout();
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-medium text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};