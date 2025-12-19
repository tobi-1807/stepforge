import { useState, useEffect } from "react";
import { WorkflowList } from "./components/WorkflowList";
import { GraphViewer } from "./components/GraphViewer";
import { RunConfigModal } from "./components/RunConfigModal";
import { NodeDetailsPanel } from "./components/NodeDetailsPanel";
import { ExecutionControlPanel } from "./components/ExecutionControlPanel";
import { useEventStream } from "./hooks/useEventStream";
import { Play, Trash2, Layers, FileCode2, RefreshCw } from "lucide-react";

type Workflow = {
  id: string;
  name: string;
  version: string;
};

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graph, setGraph] = useState<any>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { nodeStates, mapStates, events, clearEvents } =
    useEventStream(currentRunId);

  const fetchWorkflows = (isInitial = false) => {
    fetch("/api/workflows")
      .then((res) => res.json())
      .then((data) => {
        setWorkflows(data);
        if (isInitial) setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isInitial) setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkflows(true);

    // Setup WS for system events
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "workflow:list_update") {
        console.log("Workflow list updated");
        fetchWorkflows();
        // Refresh graph if selected
        if (selectedId) {
          fetch(`/api/workflows/${selectedId}/graph`)
            .then((res) => res.json())
            .then(setGraph)
            .catch(console.error);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [selectedId]); // Re-subscribe when selectedId changes to capture it in closure (or use ref)

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/workflows/${selectedId}/graph`)
      .then((res) => res.json())
      .then(setGraph)
      .catch(console.error);
  }, [selectedId]);

  const handleRunClick = () => {
    setShowConfigModal(true);
  };

  const handleRunSubmit = async (inputs: Record<string, any>) => {
    if (!selectedId) return;
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: selectedId, inputs }),
      });
      const data = await res.json();
      setCurrentRunId(data.runId);
      setShowConfigModal(false);
      console.log("Started run:", data.runId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (!graph) return;
    const node = graph.nodes[nodeId];
    if (node) {
      setSelectedNode(node);
    }
  };

  const handleCreateExample = async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/workflows/create-example", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.workflowId) {
        // Fetch updated workflow list
        fetchWorkflows();
        return data.workflowId;
      }
      return null;
    } catch (e) {
      console.error("Failed to create example workflow:", e);
      return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden font-sans">
      <WorkflowList
        workflows={workflows}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreateExample={handleCreateExample}
        isLoading={isLoading}
      />
      <div className="flex-1 flex flex-col relative">
        <header className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900">
          <div className="font-semibold text-gray-200">
            {selectedId
              ? workflows.find((w) => w.id === selectedId)?.name
              : "Select a workflow"}
          </div>
          {selectedId && (
            <button
              onClick={handleRunClick}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Play size={16} fill="currentColor" />
              Run Workflow
            </button>
          )}
        </header>

        <div className="flex-1 relative">
          {graph ? (
            <>
              <GraphViewer
                graph={graph}
                nodeStates={nodeStates}
                mapStates={mapStates}
                onNodeClick={handleNodeClick}
              />
              <NodeDetailsPanel
                node={selectedNode}
                mapState={
                  selectedNode?.kind === "map"
                    ? mapStates[selectedNode.id]
                    : undefined
                }
                onClose={() => setSelectedNode(null)}
              />
            </>
          ) : !isLoading && workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                <Layers size={32} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Welcome to Stepforge
              </h2>
              <p className="text-gray-400 max-w-md mb-6">
                Build and run code-first workflows with a visual graph. Create
                your first workflow using the sidebar button, or add{" "}
                <code className="text-blue-400 bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                  .forge.ts
                </code>{" "}
                files to your workspace.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw size={14} />
                Watching for file changes...
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-xl bg-gray-800/50 flex items-center justify-center mb-4">
                <FileCode2 size={28} className="text-gray-500" />
              </div>
              <p className="text-gray-400 mb-1">Select a workflow</p>
              <p className="text-sm text-gray-500">
                Choose a workflow from the sidebar to view its graph
              </p>
            </div>
          )}
        </div>

        {/* Execution Control Panel */}
        {currentRunId && (
          <ExecutionControlPanel
            runId={currentRunId}
            workflowName={
              workflows.find((w) => w.id === selectedId)?.name || ""
            }
            events={events}
            onClose={() => setCurrentRunId(null)}
          />
        )}

        {/* Detailed Logs Panel */}
        <div className="h-48 border-t border-gray-800 bg-gray-900 flex flex-col">
          <div className="h-8 border-b border-gray-800 flex items-center justify-between px-3 bg-gray-900/50">
            <span className="text-xs font-semibold text-gray-400">Logs</span>
            {events.length > 0 && (
              <button
                onClick={clearEvents}
                className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 text-xs"
                title="Clear logs"
              >
                <Trash2 size={14} />
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2 text-xs font-mono text-gray-400">
            {events.map((e, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap py-0.5 border-b border-gray-800/50"
              >
                <span className="text-gray-500">
                  [{new Date().toLocaleTimeString()}]
                </span>{" "}
                {e.type === "node:log" ? (
                  <span
                    className={
                      e.level === "error" ? "text-red-400" : "text-gray-300"
                    }
                  >
                    {e.nodeTitle ? `${e.nodeTitle}: ` : ""}
                    {e.msg} {e.data ? JSON.stringify(e.data) : ""}
                  </span>
                ) : (
                  <span className="text-blue-400">
                    {e.type}
                    <span className="text-white mx-1">
                      {e.nodeTitle ? e.nodeTitle : e.nodeId}
                    </span>
                    {e.nodeTitle && e.nodeId && (
                      <span className="text-gray-500">({e.nodeId})</span>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && selectedId && (
        <RunConfigModal
          workflowId={selectedId}
          workflowName={workflows.find((w) => w.id === selectedId)?.name || ""}
          onClose={() => setShowConfigModal(false)}
          onSubmit={handleRunSubmit}
        />
      )}
    </div>
  );
}
