import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type InputParameter = {
    name: string;
    type: 'string' | 'number' | 'boolean';
    label: string;
    description?: string;
    required?: boolean;
    default?: string | number | boolean;
};

type Props = {
    workflowId: string;
    workflowName: string;
    onClose: () => void;
    onSubmit: (inputs: Record<string, any>) => void;
};

export function RunConfigModal({ workflowId, workflowName, onClose, onSubmit }: Props) {
    const [inputs, setInputs] = useState<InputParameter[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/workflows/${workflowId}/details`)
            .then(res => res.json())
            .then(data => {
                setInputs(data.inputs || []);

                // Initialize with default values
                const defaults: Record<string, any> = {};
                data.inputs?.forEach((input: InputParameter) => {
                    if (input.default !== undefined) {
                        defaults[input.name] = input.default;
                    }
                });
                setValues(defaults);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load workflow details');
                setLoading(false);
            });
    }, [workflowId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const missing = inputs
            .filter(input => input.required && !values[input.name])
            .map(input => input.label);

        if (missing.length > 0) {
            setError(`Required fields: ${missing.join(', ')}`);
            return;
        }

        onSubmit(values);
    };

    const handleChange = (name: string, value: any) => {
        setValues(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-lg w-full mx-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-white">Configure Run</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 max-h-96 overflow-y-auto">
                        <div className="mb-4">
                            <p className="text-sm text-gray-400">
                                Workflow: <span className="text-white font-medium">{workflowName}</span>
                            </p>
                        </div>

                        {loading && (
                            <div className="text-center py-8 text-gray-400">
                                Loading configuration...
                            </div>
                        )}

                        {!loading && inputs.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                No configuration required for this workflow.
                            </div>
                        )}

                        {!loading && inputs.length > 0 && (
                            <div className="space-y-4">
                                {inputs.map(input => (
                                    <div key={input.name}>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            {input.label}
                                            {input.required && <span className="text-red-400 ml-1">*</span>}
                                        </label>

                                        {input.description && (
                                            <p className="text-xs text-gray-500 mb-2">{input.description}</p>
                                        )}

                                        {input.type === 'string' && (
                                            <input
                                                type="text"
                                                value={values[input.name] || ''}
                                                onChange={e => handleChange(input.name, e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder={input.default as string || ''}
                                            />
                                        )}

                                        {input.type === 'number' && (
                                            <input
                                                type="number"
                                                value={values[input.name] || ''}
                                                onChange={e => handleChange(input.name, parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder={input.default?.toString() || ''}
                                            />
                                        )}

                                        {input.type === 'boolean' && (
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={values[input.name] || false}
                                                    onChange={e => handleChange(input.name, e.target.checked)}
                                                    className="w-4 h-4 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-400">
                                                    {input.default !== undefined ? `Default: ${input.default}` : 'Enabled'}
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Run
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
