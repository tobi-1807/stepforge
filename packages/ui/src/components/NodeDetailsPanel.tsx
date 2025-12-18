import { useState } from 'react';
import { X, Repeat, CheckCircle, XCircle, Clock, AlertCircle, Filter } from 'lucide-react';
import { MapState, IterationSummary } from '../hooks/useEventStream';

type NodeData = {
    id: string;
    title: string;
    kind: string;
    meta?: {
        description?: string;
        tags?: string[];
        ui?: { icon?: string };
        aws?: { service?: string };
        map?: {
            onError?: 'fail-fast' | 'continue';
            maxConcurrency?: number;
        };
    };
};

type Props = {
    node: NodeData | null;
    mapState?: MapState;
    onClose: () => void;
};

type IterationFilter = 'all' | 'failed' | 'recent';

export function NodeDetailsPanel({ node, mapState, onClose }: Props) {
    const [filter, setFilter] = useState<IterationFilter>('all');

    if (!node) return null;

    // Check if this is a map node
    const isMapNode = node.kind === 'map';

    const hasMeta = node.meta && (
        node.meta.description ||
        (node.meta.tags && node.meta.tags.length > 0) ||
        node.meta.aws?.service
    );

    // Get filtered iterations for map nodes
    const getFilteredIterations = (): IterationSummary[] => {
        if (!mapState) return [];

        switch (filter) {
            case 'failed':
                return mapState.iterations.failures;
            case 'recent':
                return mapState.iterations.recent;
            case 'all':
            default:
                // Merge failures and recent, dedupe by iterationId
                const seen = new Set<string>();
                const merged: IterationSummary[] = [];

                // Add failures first
                for (const iter of mapState.iterations.failures) {
                    if (!seen.has(iter.iterationId)) {
                        seen.add(iter.iterationId);
                        merged.push(iter);
                    }
                }

                // Add recent that aren't already in failures
                for (const iter of mapState.iterations.recent) {
                    if (!seen.has(iter.iterationId)) {
                        seen.add(iter.iterationId);
                        merged.push(iter);
                    }
                }

                // Sort by index
                return merged.sort((a, b) => a.index - b.index);
        }
    };

    const filteredIterations = isMapNode ? getFilteredIterations() : [];

    // Format duration
    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-900 border-l border-gray-800 shadow-xl z-10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    {isMapNode && <Repeat size={14} className="text-purple-400" />}
                    <h3 className="text-sm font-semibold text-white">
                        {isMapNode ? 'Map Details' : 'Step Details'}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title */}
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
                    <p className="text-sm text-white mt-1">{node.title}</p>
                </div>

                {/* Node ID */}
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Node ID</label>
                    <p className="text-xs text-gray-400 mt-1 font-mono break-all">{node.id}</p>
                </div>

                {/* Kind */}
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                    <p className="text-sm text-white mt-1 capitalize">{node.kind}</p>
                </div>

                {/* Map-specific content */}
                {isMapNode && (
                    <>
                        {/* Map configuration */}
                        {node.meta?.map && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuration</label>
                                <div className="mt-1 space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Error Policy:</span>
                                        <span className="text-white">{node.meta.map.onError ?? 'fail-fast'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Concurrency:</span>
                                        <span className="text-white">{node.meta.map.maxConcurrency ?? 1}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Counts summary */}
                        {mapState?.counts && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</label>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <div className="bg-gray-800 rounded p-2 text-center">
                                        <div className="text-lg font-semibold text-white">{mapState.counts.total}</div>
                                        <div className="text-xs text-gray-400">Total</div>
                                    </div>
                                    <div className="bg-green-900/30 border border-green-800 rounded p-2 text-center">
                                        <div className="text-lg font-semibold text-green-400">{mapState.counts.completed}</div>
                                        <div className="text-xs text-gray-400">Done</div>
                                    </div>
                                    <div className="bg-red-900/30 border border-red-800 rounded p-2 text-center">
                                        <div className="text-lg font-semibold text-red-400">{mapState.counts.failed}</div>
                                        <div className="text-xs text-gray-400">Failed</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Iterations table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Iterations</label>
                                {/* Filter buttons */}
                                <div className="flex items-center gap-1">
                                    <Filter size={12} className="text-gray-500" />
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-2 py-0.5 text-xs rounded ${filter === 'all'
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('failed')}
                                        className={`px-2 py-0.5 text-xs rounded ${filter === 'failed'
                                            ? 'bg-red-900/50 text-red-400'
                                            : 'text-gray-400 hover:text-red-400'
                                            }`}
                                    >
                                        Failed
                                    </button>
                                    <button
                                        onClick={() => setFilter('recent')}
                                        className={`px-2 py-0.5 text-xs rounded ${filter === 'recent'
                                            ? 'bg-blue-900/50 text-blue-400'
                                            : 'text-gray-400 hover:text-blue-400'
                                            }`}
                                    >
                                        Recent
                                    </button>
                                </div>
                            </div>

                            {filteredIterations.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-xs">
                                    {mapState ? 'No iterations recorded yet' : 'Awaiting execution'}
                                </div>
                            ) : (
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {filteredIterations.map((iter) => (
                                        <IterationRow key={iter.iterationId} iteration={iter} formatDuration={formatDuration} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Non-map node content */}
                {!isMapNode && (
                    <>
                        {/* Description */}
                        {node.meta?.description && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                                <p className="text-sm text-gray-300 mt-1">{node.meta.description}</p>
                            </div>
                        )}

                        {/* Tags */}
                        {node.meta?.tags && node.meta.tags.length > 0 && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {node.meta.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-blue-900/30 border border-blue-800 rounded text-xs text-blue-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AWS Service */}
                        {node.meta?.aws?.service && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AWS Service</label>
                                <p className="text-sm text-orange-400 mt-1 font-medium">{node.meta.aws.service}</p>
                            </div>
                        )}

                        {/* Icon */}
                        {node.meta?.ui?.icon && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Icon</label>
                                <p className="text-sm text-gray-300 mt-1">{node.meta.ui.icon}</p>
                            </div>
                        )}

                        {/* No metadata message */}
                        {!hasMeta && (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No additional metadata available for this step.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Iteration row component
function IterationRow({ iteration, formatDuration }: { iteration: IterationSummary; formatDuration: (ms: number) => string }) {
    const [expanded, setExpanded] = useState(false);

    const statusIcon = {
        success: <CheckCircle size={12} className="text-green-400" />,
        failed: <XCircle size={12} className="text-red-400" />,
        skipped: <Clock size={12} className="text-gray-400" />,
    };

    const statusBg = {
        success: 'bg-gray-800/50',
        failed: 'bg-red-900/20 border border-red-800/50',
        skipped: 'bg-gray-800/30',
    };

    return (
        <div className={`rounded p-2 ${statusBg[iteration.status]}`}>
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => iteration.status === 'failed' && setExpanded(!expanded)}
            >
                {statusIcon[iteration.status]}
                <span className="text-xs text-white font-mono">
                    {iteration.key ?? `#${iteration.index}`}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                    {formatDuration(iteration.durationMs)}
                </span>
            </div>

            {/* Expanded error info */}
            {expanded && iteration.error && (
                <div className="mt-2 p-2 bg-red-950/50 rounded border border-red-800/50">
                    <div className="flex items-start gap-2">
                        <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-300 break-all">
                            {iteration.error.message}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
