import React, { useState } from "react";
import { FileJson, Plus, FolderOpen, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Workflow = {
  id: string;
  name: string;
  version: string;
};

type Props = {
  workflows: Workflow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateExample?: () => Promise<string | null>;
  isLoading?: boolean;
};

export function WorkflowList({
  workflows,
  selectedId,
  onSelect,
  onCreateExample,
  isLoading,
}: Props) {
  const [creating, setCreating] = useState(false);

  const handleCreateExample = async () => {
    if (!onCreateExample || creating) return;
    setCreating(true);
    try {
      const workflowId = await onCreateExample();
      if (workflowId) {
        onSelect(workflowId);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-bold text-gray-100 flex items-center gap-2">
          <FileJson size={20} />
          Workflows
        </h2>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <FolderOpen size={24} className="text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 mb-1">No workflows yet</p>
            <p className="text-xs text-gray-500 mb-4">
              Create your first workflow to get started
            </p>
            {onCreateExample && (
              <button
                onClick={handleCreateExample}
                disabled={creating}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded transition-colors cursor-pointer"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create example
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          workflows.map((w) => (
            <button
              key={w.id}
              onClick={() => onSelect(w.id)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors",
                selectedId === w.id
                  ? "bg-gray-800 text-white"
                  : "text-gray-400",
                "cursor-pointer"
              )}
            >
              <div className="font-medium">{w.name}</div>
              <div className="text-xs text-gray-500 font-mono truncate">
                {w.id.substring(0, 8)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
