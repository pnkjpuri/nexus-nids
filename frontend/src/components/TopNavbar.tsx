import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  User,
  Shield,
  Sliders,
  Monitor,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface TopNavbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNavigate: (tab: string) => void;
}

export function TopNavbar({ searchQuery, onSearchChange, onNavigate }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Operator";
  const displayRole = (user?.role || "ANALYST").toUpperCase();

  return (
    <header className="h-16 bg-[#0a0f1e]/95 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Global Threat Search */}
      <form onSubmit={(event) => event.preventDefault()} className="w-full max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search IP, threats, rule IDs..."
          className="w-full bg-[#11182d] border border-slate-800 focus:border-indigo-500/60 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none nav-item-smooth"
        />
      </form>

      {/* Right Actions & Profile Menu */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate("alerts")}
          title="View Live Alerts"
          className="p-2 rounded-lg bg-[#11182d] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 nav-item-smooth relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5" />
        </button>

        <div className="h-6 w-px bg-slate-800" />

        {/* Profile Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-slate-800/50 nav-item-smooth text-left"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover border border-indigo-500/50"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center text-sm font-semibold text-indigo-300">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-medium text-white">{displayName}</div>
              <div className="text-[11px] font-semibold tracking-wider text-cyan-400">
                {displayRole}
              </div>
            </div>
          </button>

          {/* Dropdown with Real <Link> Tags for Native Right-Click (New Tab / Incognito) */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0e1428] border border-slate-800 shadow-2xl overflow-hidden animate-page-enter z-50">
              <div className="p-4 border-b border-slate-800/90 bg-[#121933]/60">
                <div className="text-base font-semibold text-white truncate">{displayName}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {displayRole}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>
              </div>

              <div className="py-1.5 flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate("dashboard");
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-indigo-500/15 hover:text-white nav-item-smooth"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate("settings");
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-indigo-500/15 hover:text-white nav-item-smooth"
                >
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Account & Security (MFA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate("settings");
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-indigo-500/15 hover:text-white nav-item-smooth"
                >
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Preferences</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate("settings");
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-indigo-500/15 hover:text-white nav-item-smooth"
                >
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Active Sessions</span>
                </button>
              </div>

              <div className="border-t border-slate-800/90 p-1.5">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/15 nav-item-smooth"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}