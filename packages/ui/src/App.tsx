import { useState, useEffect } from 'react';
import { WorkflowList } from './components/WorkflowList';
import { GraphViewer } from './components/GraphViewer';
import { useEventStream } from './hooks/useEventStream';
import { Play } from 'lucide-react';

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

    const { nodeStates, events } = useEventStream(currentRunId);

    const fetchWorkflows = () => {
        fetch('/api/workflows')
            .then(res => res.json())
            .then(setWorkflows)
            .catch(console.error);
    };

    useEffect(() => {
        fetchWorkflows();

        // Setup WS for system events
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${proto}://${window.location.host}/ws`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'workflow:list_update') {
                console.log("Workflow list updated");
                fetchWorkflows();
                // Refresh graph if selected
                if (selectedId) {
                    fetch(`/api/workflows/${selectedId}/graph`)
                        .then(res => res.json())
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
            .then(res => res.json())
            .then(setGraph)
            .catch(console.error);
    }, [selectedId]);

    const handleRun = async () => {
        if (!selectedId) return;
        try {
            const res = await fetch('/api/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowId: selectedId })
            });
            const data = await res.json();
            setCurrentRunId(data.runId);
            console.log("Started run:", data.runId);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden font-sans">
            <WorkflowList
                workflows={workflows}
                selectedId={selectedId}
                onSelect={setSelectedId}
            />
            <div className="flex-1 flex flex-col relative">
                <header className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900">
                    <div className="font-semibold text-gray-200">
                        {selectedId ? workflows.find(w => w.id === selectedId)?.name : "Select a workflow"}
                    </div>
                    {selectedId && (
                        <button
                            onClick={handleRun}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Play size={16} fill="currentColor" />
                            Run Workflow
                        </button>
                    )}
                </header>

                <div className="flex-1 relative">
                    {graph ? (
                        <GraphViewer graph={graph} nodeStates={nodeStates} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-600">
                            No workflow selected or graph loaded
                        </div>
                    )}
                </div>

                {/* Detailed Logs Panel */}
                <div className="h-48 border-t border-gray-800 bg-gray-900 overflow-auto p-2 text-xs font-mono text-gray-400">
                    {events.map((e, i) => (
                        <div key={i} className="whitespace-pre-wrap py-0.5 border-b border-gray-800/50">
                            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>{" "}
                            {e.type === 'node:log' ? (
                                <span className={e.level === 'error' ? 'text-red-400' : 'text-gray-300'}>
                                    {e.nodeTitle ? `${e.nodeTitle}: ` : ''}{e.msg} {e.data ? JSON.stringify(e.data) : ''}
                                </span>
                            ) : (
                                <span className="text-blue-400">
                                    {e.type}
                                    <span className="text-white mx-1">
                                        {e.nodeTitle ? e.nodeTitle : e.nodeId}
                                    </span>
                                    {e.nodeTitle && e.nodeId && <span className="text-gray-500">({e.nodeId})</span>}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
