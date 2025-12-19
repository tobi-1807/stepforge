import { useState, useEffect } from "react";
import { Pause, Play, Square, Clock, AlertCircle } from "lucide-react";

type RunControlState = {
  signal: "pause" | "resume" | "cancel" | null;
  pausedAt?: string;
  failedSteps: Array<{ nodeId: string; error: string }>;
};

type RunEvent = {
  type: string;
  runId: string;
  [key: string]: any;
};

type Props = {
  runId: string | null;
  workflowName: string;
  events: RunEvent[];
  onClose: () => void;
};

export function ExecutionControlPanel({
  runId,
  workflowName,
  events,
  onClose,
}: Props) {
  const [controlState, setControlState] = useState<RunControlState | null>(
    null
  );
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(true); // Assume running when panel is shown
  const [duration, setDuration] = useState(0);
  const [startTime] = useState<number>(Date.now());

  // Fetch control state periodically
  useEffect(() => {
    if (!runId) return;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}/state`);
        if (res.ok) {
          const state = await res.json();
          setControlState(state);
          setIsPaused(state.signal === "pause");
        }
      } catch (e) {
        // Run might have completed
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 500);

    return () => clearInterval(interval);
  }, [runId]);

  // Track run status from events
  useEffect(() => {
    if (!events || events.length === 0) return;

    const lastEvent = events[events.length - 1];

    if (lastEvent.type === "run:end") {
      setIsRunning(false);
      onClose();
    }

    if (lastEvent.type === "run:paused") {
      setIsPaused(true);
    }

    if (lastEvent.type === "run:resumed") {
      setIsPaused(false);
    }
  }, [events, onClose]);

  // Update duration timer
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handlePause = async () => {
    if (!runId) return;
    try {
      await fetch(`/api/runs/${runId}/pause`, { method: "POST" });
    } catch (e) {
      console.error("Failed to pause:", e);
    }
  };

  const handleResume = async () => {
    if (!runId) return;
    try {
      await fetch(`/api/runs/${runId}/resume`, { method: "POST" });
    } catch (e) {
      console.error("Failed to resume:", e);
    }
  };

  const handleCancel = async () => {
    if (!runId) return;
    if (!confirm("Are you sure you want to cancel this workflow run?")) return;

    try {
      await fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
      setTimeout(onClose, 1000); // Close panel after cancel
    } catch (e) {
      console.error("Failed to cancel:", e);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!runId) return null;

  return (
    <div className="border-t border-gray-800 bg-gray-900 px-4 py-2">
      {/* Header with Status and Timer on one line */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {isRunning && !isPaused && (
              <>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Running</span>
              </>
            )}
            {isPaused && (
              <>
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-yellow-400">Paused</span>
              </>
            )}
            {!isRunning && (
              <>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                <span className="text-xs text-gray-400">Completed</span>
              </>
            )}
          </div>
          
          <span className="text-xs text-gray-500">•</span>
          
          <span className="text-xs text-gray-400">{workflowName}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} />
            <span className="font-mono">{formatDuration(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5">
            {!isPaused ? (
              <button
                onClick={handlePause}
                disabled={!isRunning}
                className="flex items-center gap-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
                title="Pause execution"
              >
                <Pause size={12} />
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                title="Resume execution"
              >
                <Play size={12} fill="currentColor" />
                Resume
              </button>
            )}

            <button
              onClick={handleCancel}
              disabled={!isRunning}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
              title="Cancel execution"
            >
              <Square size={12} />
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Failed Steps */}
      {controlState && controlState.failedSteps.length > 0 && (
        <div className="border border-red-800 bg-red-900/20 rounded p-2 mt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-xs font-semibold text-red-400">
              Failed Steps
            </span>
          </div>
          <div className="space-y-1">
            {controlState.failedSteps.map((step, idx) => (
              <div key={idx} className="text-xs">
                <div className="text-gray-300 font-mono">{step.nodeId}</div>
                <div className="text-red-400">{step.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
