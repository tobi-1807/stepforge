export type StepFn = (ctx: StepContext) => Promise<void>;

export type StepContext = {
    nodeId: string;
    runId: string;
    log: {
        info(msg: string, data?: any): void;
        warn(msg: string, data?: any): void;
        error(msg: string, data?: any): void;
        debug(msg: string, data?: any): void;
    };
    progress(update: any): void;
    artifact(a: any): void;
    output(value: unknown): void;
    isCancelled(): boolean;
    throwIfCancelled(): void;
    run: {
        get<T>(key: string): T | undefined;
        set<T>(key: string, value: T): void;
        require<T>(key: string): T;
    };
};

export type WorkflowBuilder = {
    step(title: string, fn: StepFn, options?: any): void;
    group(title: string, build: (b: WorkflowBuilder) => void, options?: any): void;
    // Internal use only - for recursing
    _getInternalState?(): any;
};

export type InputParameter = {
    name: string;
    type: 'string' | 'number' | 'boolean';
    label: string;
    description?: string;
    required?: boolean;
    default?: string | number | boolean;
};

export type WorkflowDefinition = {
    name: string;
    inputs?: InputParameter[];
    build: (wf: WorkflowBuilder) => void;
};

export type GraphNode = {
    id: string;
    kind: "root" | "group" | "step";
    title: string;
    parentId?: string | null;
    deps?: string[];
    meta?: {
        description?: string;
        tags?: string[];
        ui?: { icon?: string };
        aws?: { service?: string };
    };
};

export type GraphEdge = {
    from: string;
    to: string;
    type: "sequence" | "depends_on";
};

export type WorkflowGraph = {
    workflowId: string;
    name: string;
    version: string;
    rootId: string;
    nodes: Record<string, GraphNode>;
    edges: GraphEdge[];
};
