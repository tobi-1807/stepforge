import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api";

// Node dimension constants
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 80;
export const CHECK_NODE_WIDTH = 162;
export const CHECK_NODE_HEIGHT = 48;
export const CONTAINER_WIDTH = 250;
export const MAP_HEADER_HEIGHT = 90;
export const PADDING = 40;

const elk = new ELK();

// ELK layout options for hierarchical top-to-bottom layout
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "60",
  "elk.spacing.nodeNode": "40",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
};

// Container-specific layout options
const containerOptions = {
  "elk.padding": `[top=${MAP_HEADER_HEIGHT + PADDING},left=${
    (CONTAINER_WIDTH - NODE_WIDTH) / 2
  },bottom=${PADDING},right=${(CONTAINER_WIDTH - NODE_WIDTH) / 2}]`,
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "40",
};

// Group-specific layout options (no header)
const groupContainerOptions = {
  "elk.padding": `[top=${PADDING},left=${
    (CONTAINER_WIDTH - NODE_WIDTH) / 2
  },bottom=${PADDING},right=${(CONTAINER_WIDTH - NODE_WIDTH) / 2}]`,
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "40",
};

type GraphInput = {
  rootId: string;
  nodes: Record<string, any>;
  edges: Array<{ from: string; to: string }>;
};

type LayoutResult = {
  nodes: any[];
  edges: any[];
};

/**
 * Converts the workflow graph to ELK format with nested children
 */
function convertToElkGraph(graph: GraphInput): ElkNode {
  const nodeMap = graph.nodes;

  // Helper to get children of a node
  const getChildren = (parentId: string): any[] => {
    return Object.values(nodeMap).filter((n: any) => n.parentId === parentId);
  };

  // Build ELK node for a given graph node
  const buildElkNode = (node: any): ElkNode => {
    const children = getChildren(node.id);
    const isContainer = node.kind === "group" || node.kind === "map";

    if (isContainer && children.length > 0) {
      // Container node with children
      return {
        id: node.id,
        layoutOptions:
          node.kind === "map" ? containerOptions : groupContainerOptions,
        children: children.map((child) => buildElkNode(child)),
      };
    } else {
      // Leaf node (step or check)
      const isCheck = node.kind === "check";
      return {
        id: node.id,
        width: isCheck ? CHECK_NODE_WIDTH : NODE_WIDTH,
        height: isCheck ? CHECK_NODE_HEIGHT : NODE_HEIGHT,
      };
    }
  };

  // Get root-level nodes (direct children of rootId)
  const rootChildren = getChildren(graph.rootId);

  // Convert edges to ELK format
  const elkEdges: ElkExtendedEdge[] = graph.edges.map((e) => ({
    id: `${e.from}-${e.to}`,
    sources: [e.from],
    targets: [e.to],
  }));

  return {
    id: "root",
    layoutOptions: elkOptions,
    children: rootChildren.map((node) => buildElkNode(node)),
    edges: elkEdges,
  };
}

/**
 * Recursively extracts positioned nodes from ELK result
 */
function extractNodes(
  elkNode: ElkNode,
  graphNodes: Record<string, any>,
  parentId?: string,
  parentX: number = 0,
  parentY: number = 0
): any[] {
  const result: any[] = [];

  if (!elkNode.children) return result;

  for (const child of elkNode.children) {
    const graphNode = graphNodes[child.id];
    if (!graphNode) continue;

    const isContainer = graphNode.kind === "group" || graphNode.kind === "map";
    const hasChildren = child.children && child.children.length > 0;

    // Position is relative to parent for nested nodes
    const position = {
      x: child.x ?? 0,
      y: child.y ?? 0,
    };

    if (isContainer && hasChildren) {
      // Container node
      const containerNode: any = {
        id: graphNode.id,
        type: graphNode.kind === "map" ? "mapContainerNode" : undefined,
        position,
        data: {
          label: graphNode.title,
          status: "pending",
        },
        style: {
          width: child.width ?? CONTAINER_WIDTH,
          height: child.height ?? 200,
          zIndex: -1,
          ...(graphNode.kind === "group" && {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px dashed #555",
            borderRadius: 8,
            color: "#fff",
            padding: 0,
          }),
        },
        ...(parentId && { parentId, extent: "parent" as const }),
      };

      result.push(containerNode);

      // Process children with container as parent
      const childNodes = extractNodes(
        child,
        graphNodes,
        graphNode.id,
        (child.x ?? 0) + parentX,
        (child.y ?? 0) + parentY
      );
      result.push(...childNodes);
    } else {
      // Regular step or check node
      const isCheck = graphNode.kind === "check";
      const stepNode: any = {
        id: graphNode.id,
        type: isCheck ? "checkNode" : "statusNode",
        position,
        data: {
          label: graphNode.title,
          status: "pending",
          kind: graphNode.kind,
          message: graphNode.meta?.check?.message, // Pass check message for tooltip
          ...(parentId &&
            graphNodes[parentId]?.kind === "map" && {
              isMapTemplateStep: true,
              mapNodeId: parentId,
            }),
        },
        ...(parentId && { parentId, extent: "parent" as const }),
      };

      result.push(stepNode);
    }
  }

  return result;
}

/**
 * Applies ELK layout to the workflow graph and returns React Flow nodes/edges
 */
export async function layoutGraph(graph: GraphInput): Promise<LayoutResult> {
  if (!graph || !graph.nodes || Object.keys(graph.nodes).length === 0) {
    return { nodes: [], edges: [] };
  }

  try {
    // Convert to ELK format
    const elkGraph = convertToElkGraph(graph);

    // Run ELK layout
    const layoutedGraph = await elk.layout(elkGraph);

    // Extract positioned nodes
    const nodes = extractNodes(layoutedGraph, graph.nodes);

    // Convert edges to React Flow format
    const edges = graph.edges.map((e) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: "#555" },
    }));

    return { nodes, edges };
  } catch (error) {
    console.error("ELK layout error:", error);
    return { nodes: [], edges: [] };
  }
}
