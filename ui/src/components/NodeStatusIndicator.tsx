import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type NodeStatus = 'pending' | 'running' | 'success' | 'failure';

interface NodeStatusIndicatorProps {
    status?: NodeStatus;
    children: React.ReactNode;
    className?: string;
}

export function NodeStatusIndicator({ status = 'pending', children, className }: NodeStatusIndicatorProps) {
    return (
        <div className={cn("relative group", className)}>
            {/* Status Border/Glow Effect */}
            <div
                className={cn(
                    "absolute -inset-[2px] rounded-lg transition-all duration-300 pointer-events-none",
                    status === 'running' && "bg-blue-500/50 animate-pulse",
                    status === 'success' && "bg-green-500/50",
                    status === 'failure' && "bg-red-500/50",
                    status === 'pending' && "bg-transparent"
                )}
            />

            {/* Main Content */}
            <div className={cn(
                "relative bg-white rounded-lg border border-slate-200 shadow-sm transition-colors",
                status === 'running' && "border-blue-200",
                status === 'success' && "border-green-200",
                status === 'failure' && "border-red-200"
            )}>
                {children}
            </div>

            {/* Status Badge (Top Right) */}
            {status !== 'pending' && (
                <div className={cn(
                    "absolute -top-3 -right-3 p-1 rounded-full bg-white shadow-md border z-20",
                    status === 'running' && "border-blue-500 text-blue-600",
                    status === 'success' && "border-green-500 text-green-600",
                    status === 'failure' && "border-red-500 text-red-600"
                )}>
                    {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {status === 'failure' && <XCircle className="w-4 h-4" />}
                </div>
            )}
        </div>
    );
}
