import { X } from 'lucide-react';

type NodeData = {
    id: string;
    title: string;
    kind: string;
    meta?: {
        description?: string;
        tags?: string[];
        ui?: { icon?: string };
        aws?: { service?: string };
    };
};

type Props = {
    node: NodeData | null;
    onClose: () => void;
};

export function NodeDetailsPanel({ node, onClose }: Props) {
    if (!node) return null;

    const hasMeta = node.meta && (
        node.meta.description ||
        (node.meta.tags && node.meta.tags.length > 0) ||
        node.meta.aws?.service
    );

    return (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-900 border-l border-gray-800 shadow-xl z-10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white">Step Details</h3>
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
            </div>
        </div>
    );
}
