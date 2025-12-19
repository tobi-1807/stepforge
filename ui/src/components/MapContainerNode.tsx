import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { MapCounts, MapSpotlight } from "../hooks/useEventStream";
import { Repeat, CheckCircle, XCircle, Loader2 } from "lucide-react";

type MapContainerNodeData = {
  label: string;
  status?:
    | "pending"
    | "running"
    | "success"
    | "failed"
    | "failure"
    | "canceled";
  counts?: MapCounts;
  spotlight?: MapSpotlight;
};

type MapContainerNodeType = Node<MapContainerNodeData>;

export const MapContainerNode = memo(
  ({ data }: NodeProps<MapContainerNodeType>) => {
    const { label, status, counts, spotlight } = data;

    // Determine border color based on status
    const getBorderColor = () => {
      switch (status) {
        case "running":
          return "border-blue-500";
        case "success":
          return "border-green-500";
        case "failed":
        case "failure":
          return "border-red-500";
        case "canceled":
          return "border-yellow-500";
        default:
          return "border-purple-500/50";
      }
    };

    // Calculate progress percentage
    const progress =
      counts && counts.total > 0
        ? ((counts.completed + counts.failed + counts.skipped) / counts.total) *
          100
        : 0;

    return (
      // Full-height container that fills React Flow's allocated space
      <div
        className={`h-full w-full rounded-lg border-2 border-dashed ${getBorderColor()} bg-purple-950/20 transition-colors`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-slate-400"
        />

        {/* Header - fixed at top */}
        <div className="px-3 py-2 bg-gray-900/80 rounded-t-md border-b border-purple-500/30 flex items-center gap-2">
          <Repeat size={14} className="text-purple-400" />
          <span className="text-sm font-medium text-white truncate">
            {label}
          </span>
          {status === "running" && (
            <Loader2 size={14} className="text-blue-400 animate-spin ml-auto" />
          )}
          {status === "success" && (
            <CheckCircle size={14} className="text-green-400 ml-auto" />
          )}
          {(status === "failed" || status === "failure") && (
            <XCircle size={14} className="text-red-400 ml-auto" />
          )}
        </div>

        {/* Counts summary - below header */}
        {counts && (
          <div className="px-3 py-2 bg-gray-900/60 border-b border-purple-500/20 space-y-1.5">
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background:
                    counts.failed > 0
                      ? "linear-gradient(90deg, #22c55e 0%, #22c55e var(--success), #ef4444 var(--success), #ef4444 100%)"
                      : "#22c55e",
                  ["--success" as any]: `${
                    (counts.completed /
                      Math.max(counts.completed + counts.failed, 1)) *
                    100
                  }%`,
                }}
              />
            </div>

            {/* Counts */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-400">
                {counts.completed}/{counts.total}
              </span>
              {counts.failed > 0 && (
                <span className="text-red-400">{counts.failed} failed</span>
              )}
              {counts.running > 0 && (
                <span className="text-blue-400">{counts.running} running</span>
              )}
            </div>

            {/* Spotlight info */}
            {spotlight && (
              <div className="text-xs text-gray-400 truncate">
                Current:{" "}
                <span className="text-white">
                  {spotlight.key ?? `#${spotlight.index}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fallback when no counts yet */}
        {!counts && (
          <div className="px-3 py-1.5 bg-gray-900/60 border-b border-purple-500/20 text-xs text-gray-500">
            Awaiting execution
          </div>
        )}

        {/* The rest of the space is where children (template steps) will be rendered by React Flow */}
        {/* This empty space with the semi-transparent background visually wraps the children */}

        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-slate-400"
        />
      </div>
    );
  }
);
