import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { apiRequest } from "../services/api";

interface TimelinePoint {
  timestamp: string;
  value: number;
}

interface DashboardTelemetryResponse {
  traffic_timeline?: TimelinePoint[];
  total_alerts?: number;
}

export default function LiveTrafficPipeline() {
  const [points, setPoints] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    const fetchStream = async () => {
      try {
        const res = await apiRequest<DashboardTelemetryResponse | TimelinePoint[]>(
          "/dashboard/telemetry/live"
        );
        if (Array.isArray(res)) {
          setPoints(res.slice(-24));
        } else if (res && Array.isArray(res.traffic_timeline)) {
          setPoints(res.traffic_timeline.slice(-24));
        }
      } catch {
        // Keep last rendered points if polling briefly fails
      }
    };

    fetchStream();
    const timer = setInterval(fetchStream, 3000);
    return () => clearInterval(timer);
  }, []);

  const maxVal = Math.max(...points.map((p) => p.value), 5);
  const latest = points[points.length - 1];

  return (
    <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="text-base font-semibold text-white">Live Alert Activity Pipeline</h3>
        </div>
        {latest && (
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded bg-indigo-500/15 text-indigo-300 font-mono">
              {latest.value} alerts @ {latest.timestamp}
            </span>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-sm text-slate-500 font-mono">
          No recorded alerts yet. Click "Test Detection (Simulated)" on Dashboard to test.
        </div>
      ) : (
        <div className="h-44 flex items-end gap-1.5 pt-4 px-2 border-b border-slate-800/80">
          {points.map((pt, idx) => {
            const heightPct = Math.max(12, Math.round((pt.value / maxVal) * 100));
            const isSpike = pt.value >= 3;
            return (
              <div
                key={`${pt.timestamp}-${idx}`}
                title={`${pt.timestamp} | ${pt.value} alert(s)`}
                className="flex-1 flex flex-col items-center gap-1 group h-full justify-end"
              >
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t transition-all duration-300 ${
                    isSpike
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