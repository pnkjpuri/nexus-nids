import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { apiRequest } from "../services/api";

interface TelemetryPoint {
  time: string;
  pps: number;
  threats: number;
  src_ip: string;
  vector: string;
}

export default function LiveTrafficPipeline() {
  const [points, setPoints] = useState<TelemetryPoint[]>([]);

  useEffect(() => {
    const fetchStream = async () => {
      try {
        const res = await apiRequest<TelemetryPoint[]>("/dashboard/telemetry/live");
        if (Array.isArray(res)) {
          setPoints(res.slice(-24));
        }
      } catch {
        // Fallback tick if endpoint is warming up
      }
    };

    fetchStream();
    const timer = setInterval(fetchStream, 2000);
    return () => clearInterval(timer);
  }, []);

  const maxPps = Math.max(...points.map((p) => p.pps), 1500);
  const latest = points[points.length - 1];

  return (
    <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="text-base font-semibold text-white">Live Threat Traffic Pipeline</h3>
        </div>
        {latest && (
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded bg-indigo-500/15 text-indigo-300 font-mono">
              {latest.pps} pkt/s
            </span>
            <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-400 font-medium">
              {latest.vector} ({latest.src_ip})
            </span>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-sm text-slate-500 font-mono">
          Connecting to telemetry stream...
        </div>
      ) : (
        <div className="h-44 flex items-end gap-1.5 pt-4 px-2 border-b border-slate-800/80">
          {points.map((pt, idx) => {
            const heightPct = Math.max(12, Math.round((pt.pps / maxPps) * 100));
            const isThreat = pt.threats > 6;
            return (
              <div
                key={`${pt.time}-${idx}`}
                title={`${pt.time} | ${pt.pps} pkt/s | ${pt.vector} (${pt.src_ip})`}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t transition-all duration-300 ${
                    isThreat
                      ? "bg-gradient-to-t from-rose-600/80 to-amber-400"
                      : "bg-gradient-to-t from-indigo-600/70 to-cyan-400"
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}