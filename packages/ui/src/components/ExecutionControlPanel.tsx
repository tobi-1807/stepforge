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
      // Auto-close panel after a short delay when run completes
      setTimeout(() => {
        onClose();
      }, 3000);
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
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Execution Control
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{workflowName}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={14} />
          <span className="font-mono">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {isRunning && !isPaused && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400">Running</span>
            </>
          )}
          {isPaused && (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-yellow-400">Paused</span>
              {controlState?.pausedAt && (
                <span className="text-xs text-gray-500">
                  at {controlState.pausedAt}
                </span>
              )}
            </>
          )}
          {!isRunning && (
            <>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Completed</span>
            </>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 mb-4">
        {!isPaused ? (
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
          >
            <Pause size={14} />
            Pause
          </button>
        ) : (
          <button
            onClick={handleResume}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
          >
            <Play size={14} fill="currentColor" />
            Resume
          </button>
        )}

        <button
          onClick={handleCancel}
          disabled={!isRunning}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
        >
          <Square size={14} />
          Cancel
        </button>
      </div>

      {/* Failed Steps */}
      {controlState && controlState.failedSteps.length > 0 && (
        <div className="border border-red-800 bg-red-900/20 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">
              Failed Steps
            </span>
          </div>
          <div className="space-y-2">
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
