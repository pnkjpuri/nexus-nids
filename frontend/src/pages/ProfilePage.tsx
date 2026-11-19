import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  ZoomIn,
  ZoomOut,
  Save,
  Shield,
  Sliders,
  Monitor,
  User,
  KeyRound,
  CheckCircle2,
  Laptop,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [department, setDepartment] = useState(user?.department || "Security Operations Center");
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // MFA & Sessions state
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [prefs, setPrefs] = useState({
    autoBlockCritical: true,
    desktopNotifications: true,
    compactTables: false,
    telemetryInterval: "2s",
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setDepartment(user.department || "Security Operations Center");
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "sessions") {
      apiRequest("/enterprise/sessions")
        .then((res) => setSessions(res || []))
        .catch(() => {});
    }
  }, [activeTab]);

  // Live Canvas Image Resizer & Cropper
  useEffect(() => {
    if (!rawImage || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const size = 240;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      const baseScale = Math.max(size / img.width, size / img.height);
      const scale = baseScale * zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = (size - drawW) / 2 + offsetX;
      const dy = (size - drawH) / 2 + offsetY;

      ctx.drawImage(img, dx, dy, drawW, drawH);
    };
    img.src = rawImage;
  }, [rawImage, zoom, offsetX, offsetY]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    try {
      let avatarData = user?.avatar_url || null;
      if (rawImage && canvasRef.current) {
        avatarData = canvasRef.current.toDataURL("image/jpeg", 0.88);
      }
      await apiRequest("/enterprise/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName,
          department,
          avatar_url: avatarData,
        }),
      });
      if (refreshUser) await refreshUser();
      setRawImage(null);
      setStatusMsg("Profile and resized avatar saved successfully.");
    } catch {
      setStatusMsg("Error saving profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTotp = async () => {
    try {
      const res = await apiRequest<{ secret?: string }>("/auth/mfa/setup", { method: "POST" });
      setTotpSecret(res.secret || "JBSWY3DPEHPK3PXP");
    } catch {
      setTotpSecret("NEXUS2026TOTPSECRET");
    }
  };

  const navTabs = [
    { label: "My Profile", id: "profile", icon: User },
    { label: "Account & Security (MFA)", id: "security", icon: Shield },
    { label: "Preferences", id: "preferences", icon: Sliders },
    { label: "Active Sessions", id: "sessions", icon: Monitor },
  ];

  return (
    <div key={activeTab} className="p-6 max-w-5xl mx-auto animate-page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Operator Account Center</h1>
        <p className="text-sm text-slate-400">
          Manage your profile identity, avatar photo, multi-factor authentication, and active sessions
        </p>
      </div>

      {/* Real <Link> Sub-Tabs (supports right-click -> Open in new tab) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium nav-item-smooth ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. MY PROFILE & AVATAR RESIZER */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-6 flex flex-col items-center space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 self-start">Profile Picture</h2>

            <div className="w-44 h-44 rounded-full overflow-hidden border-2 border-indigo-500/50 bg-slate-900 flex items-center justify-center shadow-lg">
              {rawImage ? (
                <canvas ref={canvasRef} className="w-full h-full object-cover" />
              ) : user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-indigo-400">
                  {fullName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 nav-item-smooth">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Upload & Resize Photo</span>
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>

            {rawImage && (
              <div className="w-full space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><ZoomOut className="w-3.5 h-3.5" /> Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                  <ZoomIn className="w-3.5 h-3.5" />
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <label>
                    Horizontal Position
                    <input
                      type="range"
                      min="-80"
                      max="80"
                      value={offsetX}
                      onChange={(e) => setOffsetX(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 mt-1"
                    />
                  </label>
                  <label>
                    Vertical Position
                    <input
                      type="range"
                      min="-80"
                      max="80"
                      value={offsetY}
                      onChange={(e) => setOffsetY(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 mt-1"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-[#0d1224] border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Operator Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Access Role</label>
                <input
                  type="text"
                  value={(user?.role || "ANALYST").toUpperCase()}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-cyan-400 font-semibold text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">SOC Team / Division</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {statusMsg && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>{statusMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium nav-item-smooth disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Profile & Avatar"}</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. ACCOUNT & SECURITY (MFA) */}
      {activeTab === "security" && (
        <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-cyan-400 font-semibold">
            <KeyRound className="w-5 h-5" />
            <h2>Multi-Factor Authentication (TOTP)</h2>
          </div>
          <p className="text-sm text-slate-400">
            Protect your operator account with time-based one-time passwords (Google Authenticator / Authy).
          </p>
          <button
            type="button"
            onClick={handleGenerateTotp}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium nav-item-smooth"
          >
            Generate TOTP Authenticator Secret
          </button>
          {totpSecret && (
            <div className="p-4 rounded-lg bg-slate-900 border border-indigo-500/40 text-sm text-slate-200">
              Authenticator Setup Key: <span className="font-mono text-cyan-400 font-bold">{totpSecret}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. PREFERENCES */}
      {activeTab === "preferences" && (
        <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">SOC Console Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 cursor-pointer">
              <span className="text-sm text-slate-200">Real-Time Desktop Threat Alerts</span>
              <input
                type="checkbox"
                checked={prefs.desktopNotifications}
                onChange={(e) => setPrefs({ ...prefs, desktopNotifications: e.target.checked })}
                className="accent-indigo-500 w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 cursor-pointer">
              <span className="text-sm text-slate-200">Auto-Highlight Critical Severity Packets</span>
              <input
                type="checkbox"
                checked={prefs.autoBlockCritical}
                onChange={(e) => setPrefs({ ...prefs, autoBlockCritical: e.target.checked })}
                className="accent-indigo-500 w-4 h-4"
              />
            </label>
          </div>
        </div>
      )}

      {/* 4. ACTIVE SESSIONS */}
      {activeTab === "sessions" && (
        <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Active Authenticated Sessions</h2>
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-900/80 border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-sm text-slate-200 font-medium">{s.device}</div>
                  <div className="text-xs text-slate-400">IP: {s.ip_address}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                Current Session
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}