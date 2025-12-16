import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { NodeStatusIndicator, NodeStatus } from './NodeStatusIndicator';

type StatusNodeData = {
    label: string;
    status?: NodeStatus;
};

// Define the full Node type
type StatusNode = Node<StatusNodeData>;

export const StatusNode = memo(({ data }: NodeProps<StatusNode>) => {
    return (
        <NodeStatusIndicator status={data.status}>
            <div className="w-[180px] p-4 text-center font-medium cursor-pointer">
                <Handle type="target" position={Position.Top} className="!bg-slate-400" />
                <div className="text-sm text-slate-900">{data.label}</div>
                <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
            </div>
        </NodeStatusIndicator>
    );
});
