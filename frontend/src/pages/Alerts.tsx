import React, { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface AlertItem {
  id: string;
  timestamp: string;
  rule_id: string;
  signature: string;
  severity: number;
  source_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  cia_impact: {
    confidentiality: number;
    integrity: number;
    availability: number;
  };
}

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const fetchAlerts = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/alerts/', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts. Status: ${response.status}`);
      }

      const data: AlertItem[] = await response.json();
      setAlerts(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching alerts:', err);
      setError('Unable to load alerts from backend NIDS server.');
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, newStatus: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/v1/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchAlerts();
      }
    } catch (err: unknown) {
      console.error('Failed to update alert status:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === 'HIGH') return alert.severity >= 3;
    if (filterSeverity === 'MEDIUM') return alert.severity === 2;
    if (filterSeverity === 'LOW') return alert.severity === 1;
    return true;
  });

  const getSeverityBadge = (severity: number): React.ReactNode => {
    if (severity >= 3) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          HIGH
        </span>
      );
    }
    if (severity === 2) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        LOW
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Threat Alerts Console
            <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono">
              {filteredAlerts.length} Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time security event feed parsed by Suricata engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 font-medium outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-sm font-medium transition"
          >
            <LucideIcons.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <LucideIcons.ShieldAlert className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50 text-xs uppercase tracking-wider font-medium">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Signature / Rule</th>
              <th className="p-4">Source IP</th>
              <th className="p-4">Destination IP</th>
              <th className="p-4">Protocol</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4 font-mono text-xs text-slate-400">{alert.timestamp}</td>
                  <td className="p-4">{getSeverityBadge(alert.severity)}</td>
                  <td className="p-4 font-semibold text-white">{alert.signature}</td>
                  <td className="p-4 font-mono text-indigo-400">{alert.source_ip}:{alert.source_port}</td>
                  <td className="p-4 font-mono text-emerald-400">{alert.destination_ip}:{alert.destination_port}</td>
                  <td className="p-4 uppercase text-xs font-mono text-slate-400">{alert.protocol}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      alert.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      alert.status === 'ACKNOWLEDGED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {alert.status === 'NEW' && (
                      <button
                        onClick={() => updateAlertStatus(alert.id, 'ACKNOWLEDGED')}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded transition mr-2"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => updateAlertStatus(alert.id, 'RESOLVED')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded transition"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500 font-mono text-sm">
                  No active threat alerts matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};