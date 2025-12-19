import React from 'react';
import { Play, FileJson } from 'lucide-react';
import { clsx } from 'clsx';

type Workflow = {
    id: string;
    name: string;
    version: string;
};

type Props = {
    workflows: Workflow[];
    selectedId: string | null;
    onSelect: (id: string) => void;
};

export function WorkflowList({ workflows, selectedId, onSelect }: Props) {
    return (
        <div className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col">
            <div className="p-4 border-b border-gray-800">
                <h2 className="font-bold text-gray-100 flex items-center gap-2">
                    <FileJson size={20} />
                    Workflows
                </h2>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
                {workflows.map(w => (
                    <button
                        key={w.id}
                        onClick={() => onSelect(w.id)}
                        className={clsx(
                            "w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors",
                            selectedId === w.id ? "bg-gray-800 text-white" : "text-gray-400"
                        )}
                    >
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-gray-500 font-mono truncate">{w.id.substring(0, 8)}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
