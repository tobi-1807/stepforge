import { useEffect, useState } from 'react';

export type RunEvent = {
    type: string;
    runId: string;
    nodeId?: string;
    nodeTitle?: string;
    status?: string;
    msg?: string;
    [key: string]: any;
};

export function useEventStream(runId: string | null) {
    const [events, setEvents] = useState<RunEvent[]>([]);
    const [nodeStates, setNodeStates] = useState<Record<string, string>>({});

    useEffect(() => {
        // If no runId, we can still listen to ALL events if we want, 
        // but typically we listen to the server broadcast.
        // The server broadcasts ALL events to connected clients in MVP.
        // So we just connect once.

        // In strict mode react, this might fire twice.
        const ws = new WebSocket('ws://localhost:3000');

        ws.onmessage = (msg) => {
            try {
                const event = JSON.parse(msg.data) as RunEvent;
                if (runId && event.runId !== runId) return; // filter for current run

                setEvents(prev => [...prev, event]);

                if (event.type === 'node:start') {
                    setNodeStates(prev => ({ ...prev, [event.nodeId!]: 'running' }));
                } else if (event.type === 'node:end') {
                    setNodeStates(prev => ({ ...prev, [event.nodeId!]: event.status || 'unknown' }));
                } else if (event.type === 'run:start') {
                    setEvents([]); // clear on new run start if same ID?
                    setNodeStates({});
                }

            } catch (e) {
                console.error("WS Parse error", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [runId]);

    const clearEvents = () => {
        setEvents([]);
    };

    return { events, nodeStates, clearEvents };
}
