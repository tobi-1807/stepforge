import { useEffect, useState, useCallback } from 'react';

export type RunEvent = {
    type: string;
    runId: string;
    nodeId?: string;
    nodeTitle?: string;
    status?: string;
    msg?: string;
    [key: string]: any;
};

// ─────────────────────────────────────────────────────────────────────────────
// Map state types (mirror SDK types for UI consumption)
// ─────────────────────────────────────────────────────────────────────────────

export type MapCounts = {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    skipped: number;
};

export type MapSpotlight = {
    iterationId: string;
    index: number;
    key?: string;
    activeTemplateNodeId?: string;
};

export type IterationSummary = {
    iterationId: string;
    index: number;
    key?: string;
    status: 'success' | 'failed' | 'skipped';
    durationMs: number;
    error?: { message: string; stack?: string };
};

export type MapState = {
    counts: MapCounts;
    spotlight?: MapSpotlight;
    status?: 'running' | 'success' | 'failed' | 'canceled';
    iterations: {
        failures: IterationSummary[];
        recent: IterationSummary[];
    };
};

// Retention limits
const MAX_RECENT_ITERATIONS = 200;

export function useEventStream(runId: string | null) {
    const [events, setEvents] = useState<RunEvent[]>([]);
    const [nodeStates, setNodeStates] = useState<Record<string, string>>({});
    const [mapStates, setMapStates] = useState<Record<string, MapState>>({});
    const [nodeOutputs, setNodeOutputs] = useState<Record<string, any>>({});
    const [mapOutputs, setMapOutputs] = useState<Record<string, Record<string, Record<string, any>>>>({});

    useEffect(() => {
        // If no runId, we can still listen to ALL events if we want, 
        // but typically we listen to the server broadcast.
        // The server broadcasts ALL events to connected clients in MVP.
        // So we just connect once.

        // In strict mode react, this might fire twice.
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${proto}://${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        if (runId) {
            fetch(`/api/runs/${runId}/state`)
                .then(res => res.json())
                .then(state => {
                    if (state.outputs) setNodeOutputs(state.outputs);
                    if (state.mapOutputs) setMapOutputs(state.mapOutputs);
                    // We could also set nodeStates here if the daemon tracked it more comprehensively,
                    // but for now we focus on outputs as requested.
                })
                .catch(err => console.error("Failed to fetch initial run state:", err));
        }

        ws.onmessage = (msg) => {
            try {
                const event = JSON.parse(msg.data) as RunEvent;
                if (runId && event.runId !== runId) return; // filter for current run

                setEvents(prev => [...prev, event]);

                // Handle node:* events (existing behavior)
                if (event.type === 'node:start') {
                    setNodeStates(prev => ({ ...prev, [event.nodeId!]: 'running' }));
                } else if (event.type === 'node:end') {
                    setNodeStates(prev => ({ ...prev, [event.nodeId!]: event.status || 'unknown' }));
                } else if (event.type === "node:output") {
                    if (event.mapNodeId && event.iterationId) {
                        setMapOutputs((prev) => ({
                            ...prev,
                            [event.mapNodeId]: {
                                ...(prev[event.mapNodeId] || {}),
                                [event.iterationId]: {
                                    ...(prev[event.mapNodeId]?.[event.iterationId] || {}),
                                    [event.nodeId!]: event.data,
                                },
                            },
                        }));
                    } else {
                        setNodeOutputs((prev) => ({
                            ...prev,
                            [event.nodeId!]: event.data,
                        }));
                    }
                } else if (event.type === 'run:start') {
                    setEvents([]); // clear on new run start if same ID?
                    setNodeStates({});
                    setMapStates({});
                    setNodeOutputs({});
                    setMapOutputs({});
                }

                // Handle map:* events
                if (event.type === 'map:start') {
                    const mapNodeId = event.mapNodeId as string;
                    setMapStates(prev => ({
                        ...prev,
                        [mapNodeId]: {
                            counts: event.counts as MapCounts,
                            status: 'running',
                            iterations: { failures: [], recent: [] },
                        },
                    }));
                } else if (event.type === 'map:progress') {
                    const mapNodeId = event.mapNodeId as string;
                    setMapStates(prev => {
                        const existing = prev[mapNodeId];
                        if (!existing) return prev;
                        return {
                            ...prev,
                            [mapNodeId]: {
                                ...existing,
                                counts: event.counts as MapCounts,
                                spotlight: event.spotlight as MapSpotlight | undefined,
                            },
                        };
                    });
                } else if (event.type === 'map:end') {
                    const mapNodeId = event.mapNodeId as string;
                    setMapStates(prev => {
                        const existing = prev[mapNodeId];
                        if (!existing) return prev;
                        return {
                            ...prev,
                            [mapNodeId]: {
                                ...existing,
                                counts: event.counts as MapCounts,
                                status: event.status as 'success' | 'failed' | 'canceled',
                                spotlight: undefined, // Clear spotlight when done
                            },
                        };
                    });
                } else if (event.type === 'map:item:end') {
                    const mapNodeId = event.mapNodeId as string;
                    const iterationSummary: IterationSummary = {
                        iterationId: event.iterationId as string,
                        index: event.index as number,
                        key: event.key as string | undefined,
                        status: event.status as 'success' | 'failed' | 'skipped',
                        durationMs: event.durationMs as number,
                        error: event.error as { message: string; stack?: string } | undefined,
                    };

                    setMapStates(prev => {
                        const existing = prev[mapNodeId];
                        if (!existing) return prev;

                        const newIterations = { ...existing.iterations };

                        // Add to failures if failed
                        if (iterationSummary.status === 'failed') {
                            newIterations.failures = [...newIterations.failures, iterationSummary];
                        }

                        // Add to recent (with rolling window)
                        newIterations.recent = [
                            ...newIterations.recent.slice(-(MAX_RECENT_ITERATIONS - 1)),
                            iterationSummary,
                        ];

                        return {
                            ...prev,
                            [mapNodeId]: {
                                ...existing,
                                iterations: newIterations,
                            },
                        };
                    });
                }

            } catch (e) {
                console.error("WS Parse error", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [runId]);

    const clearEvents = useCallback(() => {
        setEvents([]);
        setMapStates({});
        setNodeOutputs({});
        setMapOutputs({});
    }, []);

    return { events, nodeStates, mapStates, nodeOutputs, mapOutputs, clearEvents };
}
