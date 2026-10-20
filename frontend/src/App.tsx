import React, { useState } from 'react';
import { 
  Shield, LayoutDashboard, AlertTriangle, Activity, BarChart2, 
  FileText, Sliders, Server, Settings, Search, Bell
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { Admin } from './pages/Admin';
import { Incidents } from './pages/Incidents';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'traffic', label: 'Traffic Monitor', icon: Activity },
    { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'rules', label: 'Rules', icon: Sliders },
    { id: 'system', label: 'System', icon: Server },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0a0d14] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0e131f] border-r border-slate-800/80 flex flex-col justify-between">
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide text-white">NIDS</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded ml-2 border border-indigo-500/30">v2.1.0</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Status Indicator */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-[#131927] border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <div className="text-xs font-semibold text-slate-200">System Status</div>
              <div className="text-[11px] text-emerald-400">All sensors active & monitoring</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Controls */}
        <header className="h-16 bg-[#0e131f] border-b border-slate-800/80 px-8 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP, threats, rule IDs..."
              className="w-full bg-[#131927] border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('alerts')}
              className="p-2 bg-[#131927] border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                A
              </div>
              <span className="text-sm font-medium text-slate-300">Admin Analyst</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Router */}
        <main className="flex-1 overflow-y-auto bg-[#0a0d14]">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'alerts' && <Alerts />}
          {activeTab === 'traffic' && <Incidents />}
          {activeTab === 'analysis' && <Incidents />}
          {activeTab === 'reports' && (
            <div className="p-8 space-y-4">
              <h1 className="text-xl font-bold text-white">Security Compliance Reports</h1>
              <p className="text-sm text-slate-400">Download automated threat impact analysis logs and compliance summaries.</p>
              <a 
                href="http://localhost:8000/api/v1/dashboard/export-report" 
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500 transition"
              >
                Download Full CSV Threat Log Report
              </a>
            </div>
          )}
          {activeTab === 'rules' && <Admin />}
          {activeTab === 'system' && <Admin />}
          {activeTab === 'settings' && <Admin />}
        </main>
      </div>
    </div>
  );
};