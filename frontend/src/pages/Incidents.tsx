import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertCircle } from 'lucide-react';

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/incidents/correlated')
      .then((res) => res.json())
      .then((data) => setIncidents(data.active_correlated_incidents || []))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-2xl font-bold mb-6 text-amber-400 flex items-center gap-2">
        <ShieldAlert className="w-6 h-6" /> Correlated Threat Incidents
      </h1>
      <div className="grid grid-cols-1 gap-4">
        {incidents.length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
            No active correlated threat campaigns detected.
          </div>
        ) : (
          incidents.map((inc, i) => (
            <div key={i} className="p-6 bg-slate-900 border border-amber-500/30 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-rose-400">{inc.threat_classification}</span>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">
                  {inc.total_alerts} High-Frequency Events
                </span>
              </div>
              <p className="text-sm text-slate-300 mb-2">Targeting / Originating IP: <code className="text-cyan-400">{inc.source_ip}</code></p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-400" />
                Recommended Response: {inc.recommended_action}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};