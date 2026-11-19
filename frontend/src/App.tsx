import React, { useEffect, useRef, useState } from 'react';
import {
  Shield, LayoutDashboard, AlertTriangle, Activity, BarChart2,
  FileText, Sliders, Server, Settings, Download, Cpu, HardDrive,
  Database, CheckCircle2, Play, Lock, KeyRound, History, ShieldBan,
  Trash2, Plus, Camera, ZoomIn, ZoomOut, Save, User, Monitor, Laptop
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { TopNavbar } from './components/TopNavbar';
import { Dashboard } from './pages/Dashboard';
import { AlertsPage } from './pages/AlertsPage';
import { apiRequest } from './services/api';

const VALID_TABS = new Set([
  'dashboard', 'alerts', 'firewall', 'traffic', 'analysis',
  'reports', 'rules', 'system', 'settings',
  'profile', 'profile-security', 'profile-preferences', 'profile-sessions',
]);

const getInitialTab = (): string => {
  const hash = window.location.hash.replace('#', '').trim();
  return VALID_TABS.has(hash) ? hash : 'dashboard';
};

const NidsAuthenticatedShell: React.FC = () => {
  const { user, loading, refreshUser } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [rules, setRules] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ id: '', name: '', signature: '', severity: 'high' });
  const [testSig, setTestSig] = useState('(UNION\\s+SELECT|OR\\s+1=1)');
  const [testSample, setTestSample] = useState('GET /login?id=1 UNION SELECT password FROM users');
  const [testResult, setTestResult] = useState<any>(null);
  const [sysMetrics, setSysMetrics] = useState<any>(null);
  const [trafficFeed, setTrafficFeed] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [mfaSetup, setMfaSetup] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');

  // Profile & Avatar Resizer State
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Security Operations Center');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [prefs, setPrefs] = useState({
    desktopAlerts: true,
    autoHighlightCritical: true,
    liveSound: false,
  });
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const navigateToTab = (tabId: string) => {
    setActiveTab(tabId);
    if (window.location.hash !== `#${tabId}`) {
      window.history.pushState(null, '', `#${tabId}`);
    }
  };

  useEffect(() => {
    const onHashChange = () => setActiveTab(getInitialTab());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.email?.split('@')[0] || '');
      setDepartment(user.department || 'Security Operations Center');
    }
  }, [user]);

  // Draw resized & cropped avatar preview on 220x220 canvas
  useEffect(() => {
    if (!rawImage || !avatarCanvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = avatarCanvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const size = 220;
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

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'rules') {
      apiRequest('/rules').then(setRules).catch(() => {});
    } else if (activeTab === 'firewall') {
      apiRequest('/firewall/blocked-ips').then(setBlockedIps).catch(() => {});
    } else if (activeTab === 'system') {
      apiRequest('/system/metrics').then(setSysMetrics).catch(() => {});
    } else if (activeTab === 'traffic' || activeTab === 'analysis') {
      apiRequest('/alerts?limit=50').then(setTrafficFeed).catch(() => {});
    } else if (activeTab === 'settings' || activeTab === 'profile-sessions') {
      apiRequest('/auth/sessions').then(setSessions).catch(() => {});
      // STRICT ADMIN-ONLY CHECK for Audit Logs
      if (activeTab === 'settings' && user.role?.toLowerCase() === 'admin') {
        apiRequest('/audit-logs').then(setAuditLogs).catch(() => setAuditLogs([]));
      }
    }
  }, [activeTab, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-slate-300 flex items-center justify-center text-sm">
        Verifying NEXUS NIDS Security Session...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isAdmin = user.role?.toLowerCase() === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'firewall', label: 'Firewall', icon: ShieldBan },
    { id: 'traffic', label: 'Traffic Monitor', icon: Activity },
    { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'rules', label: 'Rules', icon: Sliders },
    { id: 'system', label: 'System', icon: Server },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleToggleRule = async (ruleId: string) => {
    const updated = await apiRequest(`/rules/${ruleId}/toggle`, { method: 'PATCH' });
    setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.id || !newRule.name || !newRule.signature) return;
    const created = await apiRequest('/rules', {
      method: 'POST',
      body: JSON.stringify(newRule),
    });
    setRules((prev) => [created, ...prev]);
    setNewRule({ id: '', name: '', signature: '', severity: 'high' });
  };

  const handleUnblockIp = async (ipId: number) => {
    await apiRequest(`/firewall/blocked-ips/${ipId}`, { method: 'DELETE' });
    setBlockedIps((prev) => prev.filter((item) => item.id !== ipId));
  };

  const handleTestRule = async () => {
    const res = await apiRequest('/rules/test', {
      method: 'POST',
      body: JSON.stringify({ signature: testSig, sample_packet: testSample }),
    });
    setTestResult(res);
  };

  const handleGenerateMfa = async () => {
    const data = await apiRequest('/auth/mfa/setup', { method: 'POST' });
    setMfaSetup(data);
  };

  const handleEnableMfa = async () => {
    await apiRequest('/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ code: mfaCode }),
    });
    setMfaSetup(null);
  };

  const handleRevokeSessions = async () => {
    await apiRequest('/auth/sessions/revoke-others', { method: 'POST' });
    const updated = await apiRequest('/auth/sessions');
    setSessions(updated);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setSavingProfile(true);
    setProfileStatus('');
    try {
      let finalAvatar = user.avatar_url || null;
      if (rawImage && avatarCanvasRef.current) {
        finalAvatar = avatarCanvasRef.current.toDataURL('image/jpeg', 0.88);
      }
      await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          department,
          avatar_url: finalAvatar,
        }),
      });
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
      setRawImage(null);
      setProfileStatus('Profile & resized avatar saved successfully.');
    } catch {
      setProfileStatus('Failed to save profile updates.');
    } finally {
      setSavingProfile(false);
    }
  };

  const profileSubTabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'profile-security', label: 'Account & Security (MFA)', icon: Shield },
    { id: 'profile-preferences', label: 'Preferences', icon: Sliders },
    { id: 'profile-sessions', label: 'Active Sessions', icon: Monitor },
  ];

  return (
    <div className="flex h-screen bg-[#0a0d14] text-slate-100 font-sans overflow-hidden">
      <aside className="w-64 bg-[#0e131f] border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              navigateToTab('dashboard');
            }}
            className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors"
          >
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide text-white">NIDS</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded ml-2 border border-indigo-500/30">
                v2.1.0
              </span>
            </div>
          </a>

          {/* Real <a href="#..."> links enable native browser right-click (Open in new tab / incognito) */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToTab(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 translate-x-0.5'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-[#131927] border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-slate-200">System Status</div>
              <div className="text-[11px] text-emerald-400">All sensors active & monitoring</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigate={navigateToTab}
        />

        {/* key={activeTab} + animate-page-enter gives smooth transition on every tab switch */}
        <main key={activeTab} className="flex-1 overflow-y-auto bg-[#0a0d14] p-6 animate-page-enter">
          {activeTab === 'dashboard' && <Dashboard />}

          {activeTab === 'alerts' && <AlertsPage />}

          {activeTab === 'firewall' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white">Active Mitigation & Firewall Blocklist</h1>
                  <p className="text-xs text-slate-400">
                    Persistent PostgreSQL IP drop list enforced in real time on /api/v1/ingest
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="http://localhost:8000/api/v1/firewall/export?format=suricata"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Suricata Rules
                  </a>
                  <a
                    href="http://localhost:8000/api/v1/firewall/export?format=csv"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </a>
                  <span className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-mono">
                    {blockedIps.length} Active Drop Rules
                  </span>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Blocked Source IP</th>
                      <th className="py-3 px-4">Mitigation Reason</th>
                      <th className="py-3 px-4">Blocked By</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {blockedIps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No IPs currently blocked. Click "Block IP" on any alert to enforce automatic packet drops.
                        </td>
                      </tr>
                    ) : (
                      blockedIps
                        .filter((b) => !searchQuery || JSON.stringify(b).toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono text-slate-400">#{item.id}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-red-400">{item.ip_address}</td>
                            <td className="py-3 px-4 text-slate-200">{item.reason || 'Manual SOC Block'}</td>
                            <td className="py-3 px-4 text-slate-400">{item.blocked_by || 'System'}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {item.created_at ? new Date(item.created_at).toLocaleString() : 'Active'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                disabled={user.role !== 'admin' && user.role !== 'analyst'}
                                onClick={() => handleUnblockIp(item.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-200 hover:text-red-400 border border-slate-700 hover:border-red-500/40 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Unblock IP
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Live Packet & Connection Monitor</h1>
                <p className="text-xs text-slate-400">Real-time socket telemetry, protocol inspection & flow status</p>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Protocol</th>
                      <th className="py-3 px-4">Source IP:Port</th>
                      <th className="py-3 px-4">Destination IP:Port</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Flow Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {trafficFeed
                      .filter((t) => !searchQuery || JSON.stringify(t).toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((pkt) => (
                        <tr key={pkt.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-400">{new Date(pkt.timestamp).toLocaleTimeString()}</td>
                          <td className="py-2.5 px-4 text-cyan-400">{pkt.protocol}</td>
                          <td className="py-2.5 px-4">{pkt.src_ip}:{pkt.src_port}</td>
                          <td className="py-2.5 px-4">{pkt.dest_ip}:{pkt.dest_port}</td>
                          <td className="py-2.5 px-4 font-sans text-slate-200">{pkt.event_type}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                                pkt.status === 'blocked' || pkt.severity === 'critical'
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {pkt.status === 'blocked' ? 'BLOCKED' : 'ALLOWED / LOGGED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Threat Intelligence & Protocol Analysis</h1>
                <p className="text-xs text-slate-400">Protocol distribution, top attacking hosts & multi-stage threat correlation</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4 text-slate-200">Protocol Distribution</h3>
                  {['TCP', 'UDP', 'ICMP', 'HTTP', 'TLS'].map((proto) => {
                    const count = trafficFeed.filter((t) => (t.protocol || '').toUpperCase() === proto).length;
                    const pct = trafficFeed.length ? Math.round((count / trafficFeed.length) * 100) : 0;
                    return (
                      <div key={proto} className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono text-cyan-400">{proto}</span>
                          <span className="text-slate-400">{count} packets ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4 text-slate-200">Top Source IPs</h3>
                  <div className="space-y-2.5 text-xs font-mono">
                    {Array.from(new Set(trafficFeed.map((t) => t.src_ip))).slice(0, 6).map((ip) => {
                      const hits = trafficFeed.filter((t) => t.src_ip === ip).length;
                      return (
                        <div key={ip} className="flex justify-between items-center p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800">
                          <span className="text-slate-200">{ip}</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{hits} events</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Security Compliance & Incident Reports</h1>
                <p className="text-xs text-slate-400">Export real PostgreSQL telemetry logs in CSV or printable PDF summary formats</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Daily Threat Summary', 'Weekly SOC Compliance Audit', 'Monthly Sensor & Incident Digest'].map((title) => (
                  <div key={title} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{title}</h3>
                      <p className="text-xs text-slate-400 mt-1">Includes severity breakdown, source IPs, rule IDs & mitigation status.</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href="http://localhost:8000/api/v1/reports/export?format=csv"
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> CSV Export
                      </a>
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium"
                      >
                        Print / PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">IDS Detection Signatures & Rule Engine</h1>
                <p className="text-xs text-slate-400">Create custom detection rules, manage active signatures, and test regex patterns</p>
              </div>

              <form onSubmit={handleCreateRule} className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Custom IDS Detection Rule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    value={newRule.id}
                    onChange={(e) => setNewRule({ ...newRule, id: e.target.value })}
                    placeholder="Rule ID (e.g. NIDS-XSS-501)"
                    className="bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                    required
                  />
                  <input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="Rule Name (e.g. XSS Script Tag)"
                    className="bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs"
                    required
                  />
                  <input
                    value={newRule.signature}
                    onChange={(e) => setNewRule({ ...newRule, signature: e.target.value })}
                    placeholder="Regex (e.g. <script>.*?</script>)"
                    className="bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      value={newRule.severity}
                      onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                      className="bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs flex-1"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white"
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Live Signature Regex Tester
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={testSig}
                    onChange={(e) => setTestSig(e.target.value)}
                    placeholder="Regex signature..."
                    className="bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                  <input
                    value={testSample}
                    onChange={(e) => setTestSample(e.target.value)}
                    placeholder="Sample packet payload..."
                    className="bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestRule}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
                  >
                    Test Signature
                  </button>
                  {testResult && (
                    <span className={`text-xs font-semibold ${testResult.matched ? 'text-red-400' : 'text-emerald-400'}`}>
                      {testResult.matched ? 'MATCHED THREAT SIGNATURE' : 'CLEAN (NO MATCH)'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Rule ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Signature</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {rules.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono text-indigo-400">{r.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-200">{r.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{r.signature}</td>
                        <td className="py-3 px-4 uppercase text-[11px]">{r.severity}</td>
                        <td className="py-3 px-4">
                          <button
                            disabled={!isAdmin}
                            onClick={() => handleToggleRule(r.id)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              r.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            } disabled:opacity-50`}
                          >
                            {r.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">System Health & Sensor Telemetry</h1>
                <p className="text-xs text-slate-400">Real-time container resource utilization, packet counters & PostgreSQL status</p>
              </div>
              {sysMetrics ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>CPU UTILIZATION</span>
                      <Cpu className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{sysMetrics.cpu_percent}%</div>
                  </div>
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>MEMORY USAGE</span>
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{sysMetrics.memory_percent}%</div>
                    <div className="text-[11px] text-slate-400 mt-1">{sysMetrics.memory_used_gb} / {sysMetrics.memory_total_gb} GB</div>
                  </div>
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>POSTGRESQL DB</span>
                      <Database className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{sysMetrics.db_status}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{sysMetrics.total_events_stored} stored events</div>
                  </div>
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>DROPPED PACKETS</span>
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{sysMetrics.packets_dropped}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Last ingest: {sysMetrics.last_ingestion_timestamp || 'Idle'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Loading host telemetry...</p>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Security Settings, MFA & Governance</h1>
                <p className="text-xs text-slate-400">
                  Configure TOTP Two-Factor Authentication, active sessions{isAdmin ? ' & RBAC audit records' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-cyan-400">
                    <KeyRound className="w-4 h-4" /> Multi-Factor Authentication (TOTP)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Status: <strong className="text-slate-200">{user.mfa_enabled ? 'Enabled' : 'Not Configured'}</strong>
                  </p>
                  {!user.mfa_enabled && !mfaSetup && (
                    <button
                      onClick={handleGenerateMfa}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
                    >
                      Generate TOTP Authenticator Secret
                    </button>
                  )}
                  {mfaSetup && (
                    <div className="space-y-3 bg-[#0B0F19] p-4 rounded-lg border border-slate-800 text-xs">
                      <p className="text-slate-300">Secret Key: <code className="text-cyan-400 font-mono">{mfaSetup.secret}</code></p>
                      <div className="flex gap-2">
                        <input
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="bg-[#111827] border border-slate-700 rounded px-3 py-1.5 font-mono"
                        />
                        <button
                          onClick={handleEnableMfa}
                          className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium"
                        >
                          Verify & Enable
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-indigo-400">
                      <Lock className="w-4 h-4" /> Active Sessions ({sessions.length})
                    </h3>
                    <button
                      onClick={handleRevokeSessions}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Terminate Other Sessions
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {sessions.map((s) => (
                      <div key={s.id} className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 flex justify-between">
                        <span className="truncate max-w-xs text-slate-300">{s.user_agent}</span>
                        <span className="text-emerald-400 font-mono">{s.current ? 'Current' : s.ip_address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ADMIN ONLY: Analysts cannot see login/logout audit logs */}
              {isAdmin && (
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                    <History className="w-4 h-4 text-amber-400" /> Immutable Security Audit Trail (Admin Only)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Actor</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Action</th>
                          <th className="py-2 px-3">Resource</th>
                          <th className="py-2 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-2 px-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-2 px-3 text-slate-200">{log.actor_email}</td>
                            <td className="py-2 px-3 uppercase text-indigo-400">{log.actor_role}</td>
                            <td className="py-2 px-3 text-cyan-400">{log.action}</td>
                            <td className="py-2 px-3 text-slate-300">{log.resource}</td>
                            <td className="py-2 px-3 text-slate-400 font-sans">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED PROFILE & ACCOUNT SUB-PAGES */}
          {activeTab.startsWith('profile') && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Operator Account & Profile Center</h1>
                <p className="text-xs text-slate-400">
                  Edit your operator profile, upload & resize your avatar photo, configure MFA, and inspect sessions
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                {profileSubTabs.map((sub) => {
                  const Icon = sub.icon;
                  const active = activeTab === sub.id;
                  return (
                    <a
                      key={sub.id}
                      href={`#${sub.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToTab(sub.id);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{sub.label}</span>
                    </a>
                  );
                })}
              </div>

              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col items-center space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 self-start">
                      Profile Picture
                    </h2>

                    <div className="w-44 h-44 rounded-full overflow-hidden border-2 border-indigo-500/50 bg-[#0B0F19] flex items-center justify-center shadow-lg">
                      {rawImage ? (
                        <canvas ref={avatarCanvasRef} className="w-full h-full object-cover" />
                      ) : user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-indigo-400">
                          {fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>

                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors">
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <span>Upload & Resize Photo</span>
                      <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                    </label>

                    {rawImage && (
                      <div className="w-full space-y-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
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
                        <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-400">
                          <label>
                            Pan X
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
                            Pan Y
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

                  <div className="md:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-white">Operator Identity Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={user.email || ''}
                          disabled
                          className="w-full px-3.5 py-2 rounded-lg bg-[#0B0F19]/50 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Assigned Role</label>
                        <input
                          type="text"
                          value={(user.role || 'ANALYST').toUpperCase()}
                          disabled
                          className="w-full px-3.5 py-2 rounded-lg bg-[#0B0F19]/50 border border-slate-800 text-cyan-400 font-semibold text-xs cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">SOC Unit / Department</label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {profileStatus && (
                      <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 rounded-lg">
                        {profileStatus}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingProfile ? 'Saving...' : 'Save Profile & Avatar'}</span>
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'profile-security' && (
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-cyan-400">
                    <KeyRound className="w-4 h-4" /> Multi-Factor Authentication (TOTP)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Status: <strong className="text-slate-200">{user.mfa_enabled ? 'Enabled' : 'Not Configured'}</strong>
                  </p>
                  {!user.mfa_enabled && !mfaSetup && (
                    <button
                      onClick={handleGenerateMfa}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
                    >
                      Generate TOTP Authenticator Secret
                    </button>
                  )}
                  {mfaSetup && (
                    <div className="space-y-3 bg-[#0B0F19] p-4 rounded-lg border border-slate-800 text-xs">
                      <p className="text-slate-300">Secret Key: <code className="text-cyan-400 font-mono">{mfaSetup.secret}</code></p>
                      <div className="flex gap-2">
                        <input
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="bg-[#111827] border border-slate-700 rounded px-3 py-1.5 font-mono"
                        />
                        <button
                          onClick={handleEnableMfa}
                          className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium"
                        >
                          Verify & Enable
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile-preferences' && (
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white">SOC Console Display & Alert Preferences</h3>
                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 cursor-pointer text-xs">
                    <span>Real-time Desktop Threat Notifications</span>
                    <input
                      type="checkbox"
                      checked={prefs.desktopAlerts}
                      onChange={(e) => setPrefs({ ...prefs, desktopAlerts: e.target.checked })}
                      className="accent-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 cursor-pointer text-xs">
                    <span>Auto-Highlight Critical Severity Threats</span>
                    <input
                      type="checkbox"
                      checked={prefs.autoHighlightCritical}
                      onChange={(e) => setPrefs({ ...prefs, autoHighlightCritical: e.target.checked })}
                      className="accent-indigo-500"
                    />
                  </label>
                </div>
              )}

              {activeTab === 'profile-sessions' && (
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Active Authenticated Sessions ({sessions.length})</h3>
                    <button onClick={handleRevokeSessions} className="text-xs text-red-400 hover:underline">
                      Terminate Other Sessions
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {sessions.map((s) => (
                      <div key={s.id} className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 truncate max-w-lg">
                          <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="truncate text-slate-300">{s.user_agent}</span>
                        </div>
                        <span className="text-emerald-400 font-mono">{s.current ? 'Current' : s.ip_address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NidsAuthenticatedShell />
    </AuthProvider>
  );
};

export default App;