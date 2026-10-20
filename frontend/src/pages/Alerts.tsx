import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/alerts/')
      .then((res) => res.json())
      .then((data) => setAlerts(data || []))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
        <AlertTriangle className="w-6 h-6" /> Threat Alerts Directory
      </h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="p-4">Severity</th>
              <th className="p-4">Evidence</th>
              <th className="p-4">Impact (C / I / A)</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {alerts.map((a) => (
              <tr key={a.id} className="hover:bg-slate-800/40">
                <td className="p-4 font-semibold text-amber-400">{a.severity}</td>
                <td className="p-4 font-mono text-slate-300">{a.evidence_summary}</td>
                <td className="p-4 text-xs font-mono text-cyan-400">
                  {a.cia_confidentiality_impact} / {a.cia_integrity_impact} / {a.cia_availability_impact}
                </td>
                <td className="p-4 text-slate-400">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};