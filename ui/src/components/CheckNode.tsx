import React, { memo, useState } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Circle,
} from "lucide-react";
import { NodeStatus } from "./NodeStatusIndicator";
import { CheckResult } from "../hooks/useEventStream";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CheckNodeData = {
  label: string;
  status?: NodeStatus;
  attempt?: number;
  maxAttempts?: number;
  checkResult?: CheckResult;
  message?: string; // From meta.check.message
};

type CheckNode = Node<CheckNodeData>;

// Get icon based on status and result
function getCheckIcon(status?: NodeStatus, checkResult?: CheckResult) {
  if (status === "running") {
    return <Loader2 size={14} className="animate-spin text-blue-500" />;
  }

  // Warning status takes priority (softFail case)
  if (status === "warning") {
    return <AlertTriangle size={14} className="text-yellow-500" />;
  }

  if (checkResult) {
    if (checkResult.result === "pass") {
      return <CheckCircle2 size={14} className="text-green-500" />;
    }
    if (checkResult.result === "fail") {
      return <XCircle size={14} className="text-red-500" />;
    }
    if (checkResult.result === "error") {
      return <AlertTriangle size={14} className="text-orange-500" />;
    }
  }

  if (status === "success") {
    return <CheckCircle2 size={14} className="text-green-500" />;
  }

  if (status === "failure") {
    return <XCircle size={14} className="text-red-500" />;
  }

  // Skipped or pending
  return <Circle size={14} className="text-gray-400" />;
}

// Get status color classes
function getStatusClasses(status?: NodeStatus, checkResult?: CheckResult) {
  if (status === "running") {
    return {
      bg: "bg-blue-500/20 border-blue-600",
      text: "text-blue-500",
    };
  }

  if (checkResult) {
    if (checkResult.result === "pass") {
      return {
        bg: "bg-green-500/20 border-green-600",
        text: "text-green-500",
      };
    }
    if (checkResult.result === "fail") {
      return {
        bg: "bg-red-500/20 border-red-600",
        text: "text-red-500",
      };
    }
    if (checkResult.result === "error") {
      return {
        bg: "bg-orange-500/20 border-orange-600",
        text: "text-orange-500",
      };
    }
  }

  if (status === "warning") {
    return {
      bg: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-900",
    };
  }

  if (status === "success") {
    return {
      bg: "bg-green-50 border-green-200",
      text: "text-green-900",
    };
  }

  if (status === "failure") {
    return {
      bg: "bg-red-50 border-red-200",
      text: "text-red-900",
    };
  }

  // Default (pending/skipped)
  return {
    bg: "bg-gray-700/50 border-gray-600",
    text: "text-gray-400",
  };
}

export const CheckNode = memo(({ data }: NodeProps<CheckNode>) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const status = data.status || "pending";
  const checkResult = data.checkResult;
  const message = checkResult?.message || data.message;

  const statusClasses = getStatusClasses(status, checkResult);
  const icon = getCheckIcon(status, checkResult);

  // Show retry badge only when running and has attempts
  const showRetryBadge =
    status === "running" &&
    data.attempt !== undefined &&
    data.attempt > 0 &&
    data.maxAttempts !== undefined &&
    data.maxAttempts > 1;

  return (
    <div
      className="relative group"
      onMouseEnter={() => message && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-2 !h-2 z-10"
      />

      <div
        className={cn(
          statusClasses.bg,
          "flex items-center gap-2 px-3 py-2 rounded-full border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer backdrop-blur-sm",
          "min-w-[140px] max-w-[160px]"
        )}
      >
        {/* Icon */}
        <div className="flex-shrink-0">{icon}</div>

        {/* Label */}
        <span
          className={cn(statusClasses.text, "text-xs font-medium truncate")}
        >
          {data.label}
        </span>

        {/* Retry badge */}
        {showRetryBadge && (
          <div className="flex-shrink-0 px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-bold text-gray-300 border border-gray-700">
            {data.attempt}/{data.maxAttempts}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-2 !h-2"
      />
    </div>
  );
});

CheckNode.displayName = "CheckNode";
