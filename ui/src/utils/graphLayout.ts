// Node dimension constants
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 80;
export const CHECK_NODE_WIDTH = 160;
export const CHECK_NODE_HEIGHT = 48;
export const CONTAINER_WIDTH = 250;
export const MAP_HEADER_HEIGHT = 90;
export const PADDING = 40;

// Layout spacing constants
const LAYER_SPACING = 60; // Vertical spacing between layers
const NODE_SPACING = 40; // Horizontal spacing between nodes

type GraphInput = {
  rootId: string;
  nodes: Record<string, any>;
  edges: Array<{ from: string; to: string }>;
};

type LayoutResult = {
  nodes: any[];
  edges: any[];
};

type LayoutNode = {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  children?: LayoutNode[];
};

/**
 * Builds a hierarchy of nodes based on parentId relationships
 */
function buildHierarchy(
  graph: GraphInput,
  parentId: string | null
): LayoutNode[] {
  const nodeMap = graph.nodes;
  const children = Object.values(nodeMap).filter(
    (n: any) => n.parentId === parentId
  );

  return children.map((node: any) => {
    const isCheck = node.kind === "check";
    const isContainer = node.kind === "group" || node.kind === "map";

    const layoutNode: LayoutNode = {
      id: node.id,
      width: isCheck ? CHECK_NODE_WIDTH : NODE_WIDTH,
      height: isCheck ? CHECK_NODE_HEIGHT : NODE_HEIGHT,
    };

    if (isContainer) {
      const childNodes = buildHierarchy(graph, node.id);
      if (childNodes.length > 0) {
        layoutNode.children = childNodes;
      }
    }

    return layoutNode;
  });
}

/**
 * Performs topological sort and assigns nodes to layers
 */
function assignLayers(
  nodes: LayoutNode[],
  edges: Array<{ from: string; to: string }>
): Map<number, LayoutNode[]> {
  const layers = new Map<number, LayoutNode[]>();
  const nodeToLayer = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Build adjacency list and calculate in-degrees
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);
    if (fromNode && toNode) {
      adjacency.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
  });

  // Find nodes with no incoming edges (starting nodes)
  const queue: string[] = [];
  nodes.forEach((node) => {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
      nodeToLayer.set(node.id, 0);
    }
  });

  // Process nodes layer by layer
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLayer = nodeToLayer.get(nodeId) || 0;

    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach((neighborId) => {
      const currentNeighborLayer = nodeToLayer.get(neighborId) || 0;
      const newLayer = Math.max(currentNeighborLayer, currentLayer + 1);
      nodeToLayer.set(neighborId, newLayer);

      inDegree.set(neighborId, (inDegree.get(neighborId) || 0) - 1);
      if (inDegree.get(neighborId) === 0) {
        queue.push(neighborId);
      }
    });
  }

  // If some nodes weren't assigned (no edges), put them in layer 0
  nodes.forEach((node) => {
    if (!nodeToLayer.has(node.id)) {
      nodeToLayer.set(node.id, 0);
    }
  });

  // Group nodes by layer
  nodes.forEach((node) => {
    const layer = nodeToLayer.get(node.id) || 0;
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)?.push(node);
  });

  return layers;
}

/**
 * Positions nodes within their assigned layers
 */
function layoutLayers(layers: Map<number, LayoutNode[]>): void {
  let currentY = 0;

  // Sort layers by layer number
  const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayerKeys.forEach((layerNum) => {
    const layerNodes = layers.get(layerNum) || [];

    // Calculate total width of this layer
    const totalWidth =
      layerNodes.reduce((sum, node) => sum + node.width, 0) +
      (layerNodes.length - 1) * NODE_SPACING;

    // Position nodes horizontally, centered
    let currentX = -totalWidth / 2;
    let maxHeight = 0;

    layerNodes.forEach((node) => {
      node.x = currentX;
      node.y = currentY;
      currentX += node.width + NODE_SPACING;
      maxHeight = Math.max(maxHeight, node.height);
    });

    currentY += maxHeight + LAYER_SPACING;
  });
}

/**
 * Converts layout nodes to React Flow format
 */
function convertToReactFlow(
  layoutNodes: LayoutNode[],
  graph: GraphInput,
  parentId?: string
): any[] {
  const result: any[] = [];

  layoutNodes.forEach((layoutNode) => {
    const graphNode = graph.nodes[layoutNode.id];
    if (!graphNode) return;

    const isContainer = graphNode.kind === "group" || graphNode.kind === "map";
    const hasChildren = layoutNode.children && layoutNode.children.length > 0;

    const position = {
      x: layoutNode.x || 0,
      y: layoutNode.y || 0,
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
          width: layoutNode.width,
          height: layoutNode.height,
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

      // Process children
      const childNodes = convertToReactFlow(
        layoutNode.children || [],
        graph,
        graphNode.id
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
          message: graphNode.meta?.check?.message,
          ...(parentId &&
            graph.nodes[parentId]?.kind === "map" && {
              isMapTemplateStep: true,
              mapNodeId: parentId,
            }),
        },
        ...(parentId && { parentId, extent: "parent" as const }),
      };

      result.push(stepNode);
    }
  });

  return result;
}

/**
 * Calculates container dimensions recursively (bottom-up)
 */
function calculateContainerDimensions(
  node: LayoutNode,
  graph: GraphInput
): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  // First, recursively calculate dimensions for nested containers
  node.children.forEach((child) => {
    const childGraphNode = graph.nodes[child.id];
    const isChildContainer =
      childGraphNode.kind === "group" || childGraphNode.kind === "map";
    if (isChildContainer && child.children) {
      calculateContainerDimensions(child, graph);
    }
  });

  // Now layout this container's children
  const childIds = new Set(node.children.map((c) => c.id));
  const childEdges = graph.edges.filter(
    (e) => childIds.has(e.from) && childIds.has(e.to)
  );

  const layers = assignLayers(node.children, childEdges);
  layoutLayers(layers);

  // Calculate bounds of all children
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  node.children.forEach((child) => {
    const x = child.x || 0;
    const y = child.y || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + child.width);
    maxY = Math.max(maxY, y + child.height);
  });

  // Calculate container padding
  const graphNode = graph.nodes[node.id];
  const isMap = graphNode.kind === "map";
  const topPadding = isMap ? MAP_HEADER_HEIGHT + PADDING : PADDING;
  const sidePadding = (CONTAINER_WIDTH - NODE_WIDTH) / 2;

  // Adjust children positions to account for padding (relative to container origin)
  node.children.forEach((child) => {
    child.x = (child.x || 0) - minX + sidePadding;
    child.y = (child.y || 0) - minY + topPadding;
  });

  // Set container dimensions
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  node.width = Math.max(CONTAINER_WIDTH, contentWidth + 2 * sidePadding);
  node.height = contentHeight + topPadding + PADDING;
}

/**
 * Applies custom layout to the workflow graph and returns React Flow nodes/edges
 */
export function layoutGraph(graph: GraphInput): LayoutResult {
  if (!graph || !graph.nodes || Object.keys(graph.nodes).length === 0) {
    return { nodes: [], edges: [] };
  }

  try {
    // Build hierarchy from root
    const rootNodes = buildHierarchy(graph, graph.rootId);

    // First, calculate container dimensions recursively (bottom-up)
    // This ensures containers have correct sizes before positioning
    rootNodes.forEach((node) => {
      const graphNode = graph.nodes[node.id];
      const isContainer =
        graphNode.kind === "group" || graphNode.kind === "map";
      if (isContainer && node.children) {
        calculateContainerDimensions(node, graph);
      }
    });

    // Get edges at root level
    const rootNodeIds = new Set(rootNodes.map((n) => n.id));
    const rootEdges = graph.edges.filter(
      (e) => rootNodeIds.has(e.from) && rootNodeIds.has(e.to)
    );

    // Now assign layers and position root-level nodes with correct dimensions
    const layers = assignLayers(rootNodes, rootEdges);
    layoutLayers(layers);

    // Convert to React Flow format
    const nodes = convertToReactFlow(rootNodes, graph);

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
    console.error("Layout error:", error);
    return { nodes: [], edges: [] };
  }
}
