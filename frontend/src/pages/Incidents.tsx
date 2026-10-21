import React, { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface CorrelatedIncident {
  id: string;
  title: string;
  source_ip: string;
  target_ip: string;
  severity: number;
  stage_count: number;
  created_at: string;
  status: string;
  stages: {
    timestamp: string;
    signature: string;
    protocol: string;
  }[];
}

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<CorrelatedIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/incidents/correlated', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch correlated incidents. Status: ${response.status}`);
      }

      const data: CorrelatedIncident[] = await response.json();
      setIncidents(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching correlated incidents:', err);
      setError('Unable to fetch correlated threat incidents from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityBadge = (severity: number): React.ReactNode => {
    if (severity >= 3) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          CRITICAL INCIDENT
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        SUSPICIOUS CORRELATION
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Incident Response & Correlation Engine
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
              {incidents.length} Correlated
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Algorithmic grouping of multi-stage attack vectors across time windows
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-sm font-medium transition"
        >
          <LucideIcons.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Engine
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <LucideIcons.ShieldAlert className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {incidents.length > 0 ? (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {getSeverityBadge(incident.severity)}
                    <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {incident.id} • Detected: {incident.created_at}
                  </p>
                </div>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-md border border-slate-700">
                  {incident.stage_count} Attack Stages
                </span>
              </div>

              <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 mb-4 text-sm font-mono">
                <span className="text-indigo-400 font-bold">ATTACKER: {incident.source_ip}</span>
                <LucideIcons.TrendingUp className="w-4 h-4 text-rose-500 rotate-90" />
                <span className="text-emerald-400 font-bold">TARGET: {incident.target_ip}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Correlated Attack Sequence Timeline:
                </h4>
                {incident.stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded text-xs border border-slate-800/80"
                  >
                    <span className="text-slate-300 font-medium">{stage.signature}</span>
                    <div className="flex items-center gap-4">
                      <span className="uppercase text-slate-400 font-mono">{stage.protocol}</span>
                      <span className="text-slate-500 font-mono">{stage.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-12 text-center text-slate-500 font-mono text-sm">
            No correlated multi-stage attack scenarios detected in current log window.
          </div>
        )}
      </div>
    </div>
  );
};