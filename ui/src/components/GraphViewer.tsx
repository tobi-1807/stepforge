import React, { useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { StatusNode } from "./StatusNode";
import { CheckNode } from "./CheckNode";
import { MapContainerNode } from "./MapContainerNode";
import { NodeStatus } from "./NodeStatusIndicator";
import { MapState, CheckResult } from "../hooks/useEventStream";
import { layoutGraph } from "../utils/graphLayout";

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
  nodeAttempts?: Record<string, { attempt: number; maxAttempts?: number }>;
  mapStates: Record<string, MapState>;
  checkResults?: Record<string, CheckResult>;
  onNodeClick?: (nodeId: string) => void;
};

export function GraphViewer({
  graph,
  nodeStates,
  nodeAttempts = {},
  mapStates,
  checkResults = {},
  onNodeClick,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({
      statusNode: StatusNode,
      checkNode: CheckNode,
      mapContainerNode: MapContainerNode,
    }),
    []
  );

  // Apply layout when graph changes
  useEffect(() => {
    if (!graph) return;

    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutGraph(graph);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // Zoom to fit the new graph after layout
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 800, maxZoom: 1 });
    });
  }, [graph, setNodes, setEdges, fitView]);

  // Update node status based on state (existing logic + map enhancements)
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        // Handle map container nodes
        if (node.type === "mapContainerNode") {
          const mapState = mapStates[node.id];
          const status = nodeStates[node.id] as NodeStatus | undefined;

          const newData = {
            ...node.data,
            status: status ?? node.data.status,
            counts: mapState?.counts,
            spotlight: mapState?.spotlight,
          };

          // Only update if something changed
          if (
            node.data.status !== newData.status ||
            node.data.counts !== newData.counts ||
            node.data.spotlight !== newData.spotlight
          ) {
            return {
              ...node,
              data: newData,
            };
          }
          return node;
        }

        // Handle template steps within maps - highlight when spotlight is active
        if (node.data?.isMapTemplateStep && node.data?.mapNodeId) {
          const mapState = mapStates[node.data.mapNodeId];
          const isSpotlightActive =
            mapState?.spotlight?.activeTemplateNodeId === node.id;
          const status = nodeStates[node.id] as NodeStatus | undefined;

          // If spotlight is pointing to this template step, show it as "running"
          // Otherwise, keep it pending or use whatever status is recorded
          const effectiveStatus = isSpotlightActive
            ? "running"
            : status ?? "pending";

          if (
            node.data.status !== effectiveStatus ||
            node.data.isSpotlightActive !== isSpotlightActive
          ) {
            return {
              ...node,
              data: {
                ...node.data,
                status: effectiveStatus,
                isSpotlightActive,
              },
            };
          }
          return node;
        }

        // Standard node status update (including check nodes)
        const status = nodeStates[node.id] as NodeStatus | undefined;
        const attemptInfo = nodeAttempts[node.id];
        const checkResult = checkResults[node.id];

        if (
          node.data &&
          (node.data.status !== status ||
            node.data.attempt !== attemptInfo?.attempt ||
            node.data.checkResult !== checkResult)
        ) {
          return {
            ...node,
            data: {
              ...node.data,
              status: status || node.data.status,
              attempt: attemptInfo?.attempt,
              maxAttempts: attemptInfo?.maxAttempts,
              checkResult: checkResult,
            },
          };
        }
        return node;
      })
    );
  }, [nodeStates, nodeAttempts, mapStates, checkResults, setNodes]);

  return (
    <div className="h-full w-full bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        nodeTypes={nodeTypes}
        fitView={false}
        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background />
        <Controls
          style={{
            backgroundColor: "#1f2937",
            borderColor: "#374151",
          }}
          className="[&>button]:bg-gray-800 [&>button]:text-white [&>button]:border-gray-600 [&>button:hover]:bg-gray-700 [&>button>svg]:fill-white"
        />
        <MiniMap
          style={{ backgroundColor: "#1f2937" }}
          nodeColor="#374151"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  );
}
