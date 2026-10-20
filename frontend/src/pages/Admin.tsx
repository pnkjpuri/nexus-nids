import React from 'react';
import { Settings, UserCheck, Cpu } from 'lucide-react';

export const Admin: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
        <Settings className="w-6 h-6" /> System Administration & Sensors
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" /> User Roles & Access Control
          </h2>
          <p className="text-sm text-slate-400">RBAC Policy Enforced: <span className="text-emerald-400 font-semibold">Active</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" /> Sensor Nodes
          </h2>
          <p className="text-sm text-slate-400">Suricata Engine Node: <span className="text-emerald-400 font-semibold">ONLINE (127.0.0.1)</span></p>
        </div>
      </div>
    </div>
  );
};