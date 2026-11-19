import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface AuditLog {
  id: number;
  actor_email: string;
  actor_role: string;
  action: string;
  resource: string;
  details?: string;
  created_at: string;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      setAuditLogs([]);
      return;
    }

    apiRequest<AuditLog[]>("/enterprise/audit-logs")
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]));
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-6 mt-6">
      <h2 className="text-base font-semibold text-white mb-4">
        Immutable Security Audit Trail (Admin Only)
      </h2>
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
                <td className="py-2 px-3 text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </td>
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
  );
};

export default Settings;
