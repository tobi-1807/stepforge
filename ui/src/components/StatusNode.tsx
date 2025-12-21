import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { ShieldCheck } from "lucide-react";
import { NodeStatusIndicator, NodeStatus } from "./NodeStatusIndicator";

type StatusNodeData = {
  label: string;
  status?: NodeStatus;
  attempt?: number;
  maxAttempts?: number;
  kind?: string;
};

// Define the full Node type
type StatusNode = Node<StatusNodeData>;

export const StatusNode = memo(({ data }: NodeProps<StatusNode>) => {
  const isCheck = data.kind === "check";

  return (
    <NodeStatusIndicator
      status={data.status}
      attempt={data.attempt}
      maxAttempts={data.maxAttempts}
    >
      <div className="w-[180px] p-4 text-center font-medium cursor-pointer">
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-slate-400"
        />
        <div className="flex items-center justify-center gap-1.5">
          {isCheck && (
            <ShieldCheck size={14} className="text-cyan-500 flex-shrink-0" />
          )}
          <span className="text-sm text-slate-900">{data.label}</span>
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-slate-400"
        />
      </div>
    </NodeStatusIndicator>
  );
});
