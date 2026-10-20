import React, { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell 
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Download, RefreshCw } from 'lucide-react';

const mockTrafficData = [
  { time: 'May 14', normal: 24000, suspicious: 13000, malicious: 4000 },
  { time: 'May 15', normal: 32000, suspicious: 14500, malicious: 5200 },
  { time: 'May 16', normal: 31000, suspicious: 12000, malicious: 4800 },
  { time: 'May 17', normal: 35000, suspicious: 13500, malicious: 4100 },
  { time: 'May 18', normal: 40000, suspicious: 15200, malicious: 3900 },
  { time: 'May 19', normal: 38000, suspicious: 12800, malicious: 4600 },
  { time: 'May 20', normal: 36000, suspicious: 14100, malicious: 4300 },
];

const mockPieData = [
  { name: 'DDoS Attack', value: 802, color: '#3b82f6' },
  { name: 'Port Scan', value: 561, color: '#ef4444' },
  { name: 'SQL Injection', value: 450, color: '#f59e0b' },
  { name: 'XSS Attack', value: 312, color: '#10b981' },
  { name: 'Brute Force', value: 194, color: '#8b5cf6' },
];

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);

  const fetchSummary = () => {
    fetch('http://localhost:8000/api/v1/dashboard/summary')
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleExport = () => {
    window.location.href = 'http://localhost:8000/api/v1/dashboard/export-report';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Network Intrusion Detection System</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time threat traffic and asset exposure overview</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchSummary}
            className="flex items-center gap-2 bg-[#131927] border border-slate-800 hover:bg-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
        </div>
      </div>

      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#0e131f] border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Alerts</div>
          <div className="text-2xl font-bold text-white mt-1">{summary?.total_alerts ?? 2458}</div>
          <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> +12.5% vs last 7 days
          </div>
        </div>

        <div className="bg-[#0e131f] border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Critical Alerts</div>
          <div className="text-2xl font-bold text-white mt-1">{summary?.alerts_by_severity?.Critical ?? 156}</div>
          <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> +8.2% vs last 7 days
          </div>
        </div>

        <div className="bg-[#0e131f] border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Blocked Attacks</div>
          <div className="text-2xl font-bold text-white mt-1">1,324</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> +15.3% vs last 7 days
          </div>
        </div>

        <div className="bg-[#0e131f] border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Traffic Analyzed</div>
          <div className="text-2xl font-bold text-white mt-1">2.45 TB</div>
          <div className="flex items-center gap-1 text-[11px] text-indigo-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> +23.1% vs last 7 days
          </div>
        </div>

        <div className="bg-[#0e131f] border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Active Connections</div>
          <div className="text-2xl font-bold text-white mt-1">8,547</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
            <ArrowDownRight className="w-3.5 h-3.5" /> -5.4% vs last 7 days
          </div>
        </div>
      </div>

      {/* Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Line Chart */}
        <div className="lg:col-span-2 bg-[#0e131f] border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Traffic Overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrafficData}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#131927', borderColor: '#334155', color: '#fff' }} />
                <Area type="monotone" dataKey="normal" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Area type="monotone" dataKey="suspicious" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                <Area type="monotone" dataKey="malicious" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-[#0e131f] border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-slate-200 mb-2">Top Attack Types</h2>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mockPieData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {mockPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{summary?.total_alerts ?? 2458}</span>
              <span className="text-[10px] text-slate-400">Total</span>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            {mockPieData.map((item) => (
              <div key={item.name} className="flex justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span className="font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed Table & System Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0e131f] border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Recent Threat Stream Feed</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3">Severity</th>
                <th className="pb-3">Evidence</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary?.recent_alerts?.map((alert: any) => (
                <tr key={alert.id} className="hover:bg-slate-800/30">
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-slate-300">{alert.evidence}</td>
                  <td className="py-3 text-slate-400">{alert.status}</td>
                  <td className="py-3 text-slate-500">{new Date(alert.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System Resource Gauges */}
        <div className="bg-[#0e131f] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">System Status</h2>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>CPU Usage</span>
              <span className="text-slate-200 font-mono">32%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[32%]"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Memory Usage</span>
              <span className="text-slate-200 font-mono">65%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[65%]"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Disk Usage</span>
              <span className="text-slate-200 font-mono">78%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-[78%]"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Network I/O</span>
              <span className="text-slate-200 font-mono">45%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[45%]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};