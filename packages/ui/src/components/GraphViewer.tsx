import React, { useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StatusNode } from "./StatusNode";
import { MapContainerNode } from "./MapContainerNode";
import { NodeStatus } from "./NodeStatusIndicator";
import { MapState } from "../hooks/useEventStream";

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
  mapStates: Record<string, MapState>;
  onNodeClick?: (nodeId: string) => void;
};

export function GraphViewer({
  graph,
  nodeStates,
  mapStates,
  onNodeClick,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  const nodeTypes = useMemo(
    () => ({
      statusNode: StatusNode,
      mapContainerNode: MapContainerNode,
    }),
    []
  );

  useEffect(() => {
    if (!graph) return;

    // Helper to find children
    const getChildren = (parentId: string): any[] => {
      return Object.values(graph.nodes).filter(
        (n: any) => n.parentId === parentId
      );
    };

    const layoutNodes: any[] = [];
    let y = 0;
    const X_OFFSET = 250;
    const NODE_HEIGHT = 80; // Slightly taller for the new component
    const GAP = 40;
    const PADDING = 40;
    const MAP_HEADER_HEIGHT = 90; // Extra height for map header with counts
    const CONTAINER_WIDTH = 250;
    const CHILD_NODE_WIDTH = 180; // StatusNode is w-[180px]
    const CHILD_CENTER_X = (CONTAINER_WIDTH - CHILD_NODE_WIDTH) / 2; // Center children horizontally

    const nodeMap = graph.nodes;

    const processNode = (
      nodeId: string,
      currentY: number,
      parentId: string | undefined
    ): number => {
      const node = nodeMap[nodeId];
      if (!node) return currentY;

      // Check if it's a container (group or map)
      const children = getChildren(nodeId);

      if (node.kind === "group") {
        let groupHeight = PADDING * 2;
        let childY = PADDING;

        const groupNode: any = {
          id: node.id,
          position: { x: X_OFFSET, y: currentY },
          data: { label: node.title },
          style: {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px dashed #555",
            borderRadius: 8,
            width: CONTAINER_WIDTH,
            color: "#fff",
            padding: 0,
            zIndex: -1,
          },
          parentId: parentId,
        };

        // Add group first (parent)
        layoutNodes.push(groupNode);

        // Process children
        children.forEach((child) => {
          layoutNodes.push({
            id: child.id,
            type: "statusNode",
            position: { x: CHILD_CENTER_X, y: childY },
            data: { label: child.title, status: "pending" },
            parentId: node.id,
            extent: "parent",
          });

          childY += NODE_HEIGHT + GAP;
        });

        groupHeight = childY;

        // Update group height
        groupNode.style.height = groupHeight;

        return currentY + groupHeight + GAP;
      } else if (node.kind === "map") {
        // Map container node
        let mapHeight = PADDING * 2 + MAP_HEADER_HEIGHT;
        let childY = MAP_HEADER_HEIGHT + PADDING;

        const mapNode: any = {
          id: node.id,
          type: "mapContainerNode",
          position: { x: X_OFFSET, y: currentY },
          data: {
            label: node.title,
            status: "pending",
            // counts and spotlight will be updated in the status effect
          },
          style: {
            width: CONTAINER_WIDTH,
            zIndex: -1,
          },
          parentId: parentId,
        };

        // Add map node first
        layoutNodes.push(mapNode);

        // Process template step children
        children.forEach((child) => {
          layoutNodes.push({
            id: child.id,
            type: "statusNode",
            position: { x: CHILD_CENTER_X, y: childY },
            data: {
              label: child.title,
              status: "pending",
              isMapTemplateStep: true,
              mapNodeId: node.id,
            },
            parentId: node.id,
            extent: "parent",
          });

          childY += NODE_HEIGHT + GAP;
        });

        mapHeight = childY;

        // Update map container style with calculated height
        mapNode.style.height = mapHeight;

        return currentY + mapHeight + GAP;
      } else {
        // Standard Step
        layoutNodes.push({
          id: node.id,
          type: "statusNode",
          position: { x: X_OFFSET, y: currentY },
          data: { label: node.title, status: "pending" },
          parentId: parentId,
        });
        return currentY + NODE_HEIGHT + GAP;
      }
    };

    getChildren(graph.rootId).forEach((n) => {
      y = processNode(n.id, y, undefined);
    });

    const newEdges = graph.edges.map((e: any) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: "#555" },
    }));

    setNodes(layoutNodes);
    setEdges(newEdges);
  }, [graph]);

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

        // Standard node status update
        const status = nodeStates[node.id] as NodeStatus | undefined;
        if (node.data && node.data.status !== status && status) {
          return {
            ...node,
            data: {
              ...node.data,
              status: status,
            },
          };
        }
        return node;
      })
    );
  }, [nodeStates, mapStates, setNodes]);

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
