import React, { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface DashboardSummary {
  total_alerts: number;
  critical_alerts: number;
  blocked_attacks: number;
  traffic_analyzed_gb: number;
  active_connections: number;
  attack_distribution: Record<string, number>;
  traffic_timeline: { timestamp: string; value: number }[];
}

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:8000/api/v1/dashboard/summary', {
        headers
      });

      if (response.status === 401) {
        setError('Authentication required. Please log in via Swagger UI (http://localhost:8000/docs) or obtain a token.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data: DashboardSummary = await response.json();
      setSummary(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to sync dashboard telemetry:', err);
      setError('Failed to connect to backend NIDS server on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const attackDistribution: Record<string, number> = summary?.attack_distribution || {};
  const attackCounts: number[] = Object.values(attackDistribution);
  const totalAttackCount: number = attackCounts.reduce((sum: number, val: number) => sum + val, 0);

  const formatTraffic = (gb: number = 0): string => {
    if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-6 font-sans">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Network Intrusion Detection System
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
              LIVE STREAM
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time threat traffic and asset exposure overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-sm font-medium transition"
          >
            <LucideIcons.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <a
            href="http://localhost:8000/api/v1/dashboard/export-report"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20"
          >
            <LucideIcons.Download className="w-4 h-4" />
            Export Report
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-center gap-2">
          <LucideIcons.ShieldAlert className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Alerts</span>
            <LucideIcons.ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{summary?.total_alerts ?? 0}</div>
          <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1 font-mono">
            <LucideIcons.TrendingUp className="w-3 h-3" /> Real-time active logs
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Critical Alerts</span>
            <LucideIcons.ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500">{summary?.critical_alerts ?? 0}</div>
          <p className="text-xs text-rose-400/80 mt-2 flex items-center gap-1 font-mono">
            High Severity Threats
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Blocked Attacks</span>
            <LucideIcons.Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{summary?.blocked_attacks ?? 0}</div>
          <p className="text-xs text-emerald-400/80 mt-2 flex items-center gap-1 font-mono">
            Mitigated at Gateway
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Traffic Analyzed</span>
            <LucideIcons.Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTraffic(summary?.traffic_analyzed_gb)}
          </div>
          <p className="text-xs text-cyan-400/80 mt-2 flex items-center gap-1 font-mono">
            Processed Telemetry
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Connections</span>
            <LucideIcons.Server className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{summary?.active_connections ?? 0}</div>
          <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1 font-mono">
            Live Monitored Nodes
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <LucideIcons.Activity className="w-4 h-4 text-indigo-400" />
            Live Threat Traffic Pipeline
          </h3>
          <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 border-b border-slate-800">
            {summary?.traffic_timeline && summary.traffic_timeline.length > 0 ? (
              summary.traffic_timeline.map((point, idx) => {
                const maxVal = Math.max(...summary.traffic_timeline.map(p => p.value), 1);
                const heightPct = Math.max((point.value / maxVal) * 100, 8);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div 
                      className="w-full bg-indigo-600/80 hover:bg-indigo-500 rounded-t transition-all"
                      style={{ height: `${heightPct}%` }}
                      title={`${point.timestamp}: ${point.value} events`}
                    />
                    <span className="text-[10px] text-slate-500 rotate-45 origin-left font-mono">
                      {point.timestamp}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-mono">
                Waiting for background telemetry stream...
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Top Attack Types */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <LucideIcons.Radio className="w-4 h-4 text-rose-400" />
              Top Attack Types
            </h3>

            <div className="my-6 p-6 bg-slate-950/80 border border-slate-800/60 rounded-xl text-center">
              <span className="text-4xl font-extrabold text-white tracking-tight font-mono">
                {totalAttackCount}
              </span>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                Aggregated Ingested Events
              </p>
            </div>

            <div className="space-y-3">
              {Object.keys(attackDistribution).length > 0 ? (
                Object.entries(attackDistribution).map(([type, count]) => {
                  const percentage = totalAttackCount > 0 ? ((count / totalAttackCount) * 100).toFixed(1) : '0';
                  return (
                    <div key={type} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{type}</span>
                        <span className="text-slate-400 font-mono">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 text-center font-mono py-4">
                  No attack telemetry records found in PostgreSQL database.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sensor Pipeline Active
            </span>
            <span>Refreshed every 3s</span>
          </div>
        </div>
      </div>
    </div>
  );
};