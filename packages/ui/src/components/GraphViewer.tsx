import React, { useEffect, useMemo } from 'react';
import { ReactFlow, useNodesState, useEdgesState, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StatusNode } from './StatusNode';
import { NodeStatus } from './NodeStatusIndicator';

// Local type definitions to avoid linking SDK for MVP UI
type GraphNode = {
    id: string;
    title: string;
    kind: string;
    [key: string]: any;
};

type Props = {
    graph: any;
    nodeStates: Record<string, string>;
    onNodeClick?: (nodeId: string) => void;
};

export function GraphViewer({ graph, nodeStates, onNodeClick }: Props) {
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

    const nodeTypes = useMemo(() => ({
        statusNode: StatusNode
    }), []);

    useEffect(() => {
        if (!graph) return;

        // Helper to find children
        const getChildren = (parentId: string): any[] => {
            return Object.values(graph.nodes).filter((n: any) => n.parentId === parentId);
        };

        const layoutNodes: any[] = [];
        let y = 0;
        const X_OFFSET = 250;
        const NODE_HEIGHT = 80; // Slightly taller for the new component
        const GAP = 40;
        const PADDING = 40;

        const nodeMap = graph.nodes;

        const processNode = (nodeId: string, currentY: number, parentId: string | undefined): number => {
            const node = nodeMap[nodeId];
            if (!node) return currentY;

            // Check if it's a group
            const children = getChildren(nodeId);

            if (node.kind === 'group') {
                let groupHeight = PADDING * 2;
                let childY = PADDING;

                const groupNode: any = {
                    id: node.id,
                    position: { x: X_OFFSET, y: currentY },
                    data: { label: node.title },
                    style: {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px dashed #555',
                        borderRadius: 8,
                        width: 250, // Wider for group
                        color: '#fff',
                        padding: 0,
                        zIndex: -1
                    },
                    parentId: parentId,
                };

                // Add group first (parent)
                layoutNodes.push(groupNode);

                // Process children
                children.forEach(child => {
                    layoutNodes.push({
                        id: child.id,
                        type: 'statusNode',
                        position: { x: PADDING / 2, y: childY },
                        data: { label: child.title, status: 'pending' },
                        parentId: node.id,
                        extent: 'parent',
                    });

                    childY += (NODE_HEIGHT + GAP);
                });

                groupHeight = childY; // padding included at start

                // Update group height
                groupNode.style.height = groupHeight;

                return currentY + groupHeight + GAP;

            } else {
                // Standard Step
                layoutNodes.push({
                    id: node.id,
                    type: 'statusNode',
                    position: { x: X_OFFSET, y: currentY },
                    data: { label: node.title, status: 'pending' },
                    parentId: parentId
                });
                return currentY + NODE_HEIGHT + GAP;
            }
        };

        getChildren(graph.rootId).forEach(n => {
            y = processNode(n.id, y, undefined);
        });

        const newEdges = graph.edges.map((e: any) => ({
            id: `${e.from}-${e.to}`,
            source: e.from,
            target: e.to,
            animated: true,
            style: { stroke: '#555' }
        }));

        setNodes(layoutNodes);
        setEdges(newEdges);

    }, [graph]);

    // Update node status based on state
    useEffect(() => {
        setNodes((nds) => nds.map((node) => {
            const status = nodeStates[node.id] as NodeStatus | undefined;
            // Only update if status changed or wasn't set (simple check)
            if (node.data && node.data.status !== status && status) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        status: status
                    }
                };
            }
            return node;
        }));
    }, [nodeStates, setNodes]);

    return (
        <div className="h-full w-full bg-gray-900">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => onNodeClick?.(node.id)}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}
