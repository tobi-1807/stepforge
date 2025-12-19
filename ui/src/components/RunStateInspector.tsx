import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';

type Props = {
    runId: string | null;
};

export function RunStateInspector({ runId }: Props) {
    const [runState, setRunState] = useState<Record<string, any>>({});
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!runId) return;

        const ws = new WebSocket('ws://localhost:3000');

        ws.onmessage = (msg) => {
            try {
                const event = JSON.parse(msg.data);

                if (event.runId !== runId) return;

                // Track state changes from logs that mention ctx.run.set
                if (event.type === 'node:log' && event.msg) {
                    // This is a simple approach - in production you'd want explicit state events
                    const setMatch = event.msg.match(/Set (\w+):/);
                    if (setMatch) {
                        const key = setMatch[1];
                        setRecentlyChanged(prev => new Set(prev).add(key));
                        setTimeout(() => {
                            setRecentlyChanged(prev => {
                                const next = new Set(prev);
                                next.delete(key);
                                return next;
                            });
                        }, 2000);
                    }
                }

                // Extract state from control state events
                if (event.type === 'run:control_state' && event.state) {
                    // In a real implementation, you'd emit state snapshots
                    // For now, we'll display what we can infer
                }
            } catch (e) {
                console.error("WS Parse error", e);
            }
        };

        return () => ws.close();
    }, [runId]);

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const renderValue = (value: any): string => {
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    const entries = Object.entries(runState);

    if (!runId || entries.length === 0) {
        return (
            <div className="border-t border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Database size={16} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-white">Run State</h3>
                </div>
                <div className="text-xs text-gray-500 text-center py-4">
                    No state variables yet
                </div>
            </div>
        );
    }

    return (
        <div className="border-t border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white">Run State</h3>
                <span className="text-xs text-gray-500">({entries.length} variables)</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
                {entries.map(([key, value]) => {
                    const isExpanded = expandedKeys.has(key);
                    const isRecent = recentlyChanged.has(key);
                    const isObject = typeof value === 'object' && value !== null;

                    return (
                        <div
                            key={key}
                            className={`rounded p-2 transition-colors ${isRecent ? 'bg-blue-900/30 border border-blue-800' : 'bg-gray-800/50'
                                }`}
                        >
                            <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => isObject && toggleExpand(key)}
                            >
                                {isObject ? (
                                    isExpanded ? (
                                        <ChevronDown size={14} className="text-gray-400" />
                                    ) : (
                                        <ChevronRight size={14} className="text-gray-400" />
                                    )
                                ) : (
                                    <div className="w-3.5" />
                                )}
                                <span className="text-xs font-mono text-blue-300">{key}</span>
                                <span className="text-xs text-gray-500">
                                    {typeof value === 'string' ? 'string' :
                                        typeof value === 'number' ? 'number' :
                                            typeof value === 'boolean' ? 'boolean' : 'object'}
                                </span>
                            </div>

                            {(!isObject || isExpanded) && (
                                <div className="mt-1 ml-5 text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
                                    {renderValue(value)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
