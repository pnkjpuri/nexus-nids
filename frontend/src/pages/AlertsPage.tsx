import React, { useEffect, useState } from "react";
import { ShieldAlert, Eye } from "lucide-react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES: Record<string, string> = {
  detected: "bg-red-500/15 text-red-400 border-red-500/30",
  investigating: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  mitigated: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  blocked: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  resolved: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
};

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [ipFilter, setIpFilter] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  const fetchAlerts = async () => {
    const params = new URLSearchParams();
    if (severity !== "all") params.set("severity", severity);
    if (status !== "all") params.set("status", status);
    if (ipFilter) params.set("ip", ipFilter);
    const data = await apiRequest(`/alerts?${params.toString()}`);
    setAlerts(data);
  };

  useEffect(() => {
    fetchAlerts();
  }, [severity, status, ipFilter]);

  const updateStatus = async (alertId: number, newStatus: string) => {
    await apiRequest(`/alerts/${alertId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    fetchAlerts();
    if (selectedAlert?.id === alertId) {
      setSelectedAlert({ ...selectedAlert, status: newStatus });
    }
  };

  const canModify = user?.role === "admin" || user?.role === "analyst";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Security Alerts & Incident Triage</h2>
          <p className="text-xs text-slate-400">
            Separate tracking for active detections versus blocked or resolved events
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="detected">Detected (Active)</option>
            <option value="investigating">Investigating</option>
            <option value="mitigated">Mitigated</option>
            <option value="blocked">Blocked</option>
            <option value="resolved">Resolved</option>
          </select>

          <input
            type="text"
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            placeholder="Filter IP address..."
            className="bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          />
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4">ID</th>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Severity</th>
              <th className="py-3.5 px-4">Signature / Rule</th>
              <th className="py-3.5 px-4">Source → Destination</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {alerts.map((a) => (
              <tr key={a.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3 px-4 font-mono text-slate-400">#{a.id}</td>
                <td className="py-3 px-4 text-slate-300">
                  {new Date(a.timestamp).toLocaleTimeString()}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded uppercase font-semibold text-[10px] ${
                      a.severity === "critical"
                        ? "bg-red-500/20 text-red-400"
                        : a.severity === "high"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-cyan-500/15 text-cyan-400"
                    }`}
                  >
                    {a.severity}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-200">{a.event_type}</div>
                  <div className="text-[11px] font-mono text-indigo-400">{a.rule_id}</div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">
                  {a.src_ip} → {a.dest_ip}:{a.dest_port}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] capitalize ${
                      STATUS_STYLES[a.status] || STATUS_STYLES.detected
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-1.5">
                  <button
                    onClick={() => setSelectedAlert(a)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect
                  </button>
                  {canModify && a.status === "detected" && (
                    <button
                      onClick={() => updateStatus(a.id, "investigating")}
                      className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    >
                      Investigate
                    </button>
                  )}
                  {canModify && a.status !== "resolved" && (
                    <button
                      onClick={() => updateStatus(a.id, "resolved")}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Investigation Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                Alert #{selectedAlert.id} Investigation
              </h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="bg-[#0B0F19] border border-slate-800 rounded-lg p-4 text-xs space-y-2 font-mono">
              <p><span className="text-slate-500">Rule ID:</span> {selectedAlert.rule_id}</p>
              <p><span className="text-slate-500">Signature:</span> {selectedAlert.event_type}</p>
              <p><span className="text-slate-500">Source:</span> {selectedAlert.src_ip}:{selectedAlert.src_port}</p>
              <p><span className="text-slate-500">Target:</span> {selectedAlert.dest_ip}:{selectedAlert.dest_port} ({selectedAlert.protocol})</p>
              <p><span className="text-slate-500">Details:</span> {selectedAlert.description}</p>
            </div>
            {canModify && (
              <div className="flex flex-wrap gap-2 pt-2">
                {["investigating", "mitigated", "blocked", "resolved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => updateStatus(selectedAlert.id, st)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs capitalize hover:bg-indigo-600/30"
                  >
                    Mark {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
