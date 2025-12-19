export type RunControlSignal = "pause" | "resume" | "cancel";

export type RunControlState = {
  signal: RunControlSignal | null;
  pausedAt?: string; // nodeId where paused
  failedSteps: Array<{ nodeId: string; error: string }>;
};

export type StepFn = (ctx: StepContext) => Promise<void>;

// ─────────────────────────────────────────────────────────────────────────────
// Loop / Map types
// ─────────────────────────────────────────────────────────────────────────────

/** Run-scoped store interface (shared between StepContext and MapItemsContext) */
export type RunStore = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  require<T>(key: string): T;
};

/** Context provided to the `items()` function in wf.map() */
export type MapItemsContext = {
  runId: string;
  /** User-provided workflow inputs (read-only) */
  inputs: Record<string, any>;
  run: RunStore;
  log: {
    info(msg: string, data?: any): void;
    warn(msg: string, data?: any): void;
    error(msg: string, data?: any): void;
    debug(msg: string, data?: any): void;
  };
};

/** Loop context available on StepContext when executing inside a map */
export type LoopContext = {
  mapNodeId: string;
  iterationId: string;
  index: number;
  key?: string;
  item?: unknown;
};

/** Builder passed to the map's build function for defining template steps */
export type LoopBuilder = {
  step(title: string, fn: StepFn, options?: StepNodeOptions): void;
  // group() can be added later if needed
};

/** Options for wf.map() */
export type MapOptions<T> = {
  /** Function that returns the items to iterate over (evaluated at runtime) */
  items: (ctx: MapItemsContext) => Promise<T[]> | T[];
  /** Optional function to derive a display key for each item */
  key?: (item: T, index: number) => string;
  /** Max concurrency (MVP: must be 1 or omitted) */
  maxConcurrency?: number;
  /** Error policy: fail-fast (default) stops on first error, continue keeps going */
  onError?: "fail-fast" | "continue";
};

/** Options for step nodes */
export type StepNodeOptions = {
  description?: string;
  tags?: string[];
  ui?: { icon?: string };
  aws?: { service?: string };
};

export type StepContext = {
  nodeId: string;
  runId: string;
  /** User-provided workflow inputs (read-only) */
  inputs: Record<string, any>;
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
  isPaused(): boolean;
  waitIfPaused(): Promise<void>;
  run: RunStore;
  /** Present when executing inside a map iteration */
  loop?: LoopContext;
  /** Iteration-scoped scratch store (present only inside map template steps) */
  iteration?: RunStore;
};

export type WorkflowBuilder = {
  step(title: string, fn: StepFn, options?: StepNodeOptions): void;
  group(
    title: string,
    build: (b: WorkflowBuilder) => void,
    options?: StepNodeOptions
  ): void;
  /**
   * Define a map/loop construct that iterates over items at runtime.
   * Template steps are defined once and executed for each item sequentially.
   * 
   * @param title - Static title for the map node (do not interpolate item values)
   * @param opts - Map options including items() function and optional key()
   * @param build - Function that defines template steps using the LoopBuilder
   */
  map<T>(
    title: string,
    opts: MapOptions<T>,
    build: (item: T, index: number, loop: LoopBuilder) => void
  ): void;
  // Internal use only - for recursing
  _getInternalState?(): any;
};

export type InputParameter = {
  name: string;
  type: "string" | "number" | "boolean";
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
  kind: "root" | "group" | "step" | "map";
  title: string;
  parentId?: string | null;
  deps?: string[];
  meta?: {
    description?: string;
    tags?: string[];
    ui?: { icon?: string };
    aws?: { service?: string };
    // Map-specific metadata
    map?: {
      onError?: "fail-fast" | "continue";
      maxConcurrency?: number;
    };
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

// ─────────────────────────────────────────────────────────────────────────────
// Map event types
// ─────────────────────────────────────────────────────────────────────────────

/** Aggregate counts for a map node */
export type MapCounts = {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  skipped: number;
};

/** Spotlight payload showing current iteration position */
export type MapSpotlight = {
  iterationId: string;
  index: number;
  key?: string;
  activeTemplateNodeId?: string;
};

/** Serialized error for event payloads */
export type SerializedError = {
  message: string;
  stack?: string;
};

/** Iteration summary for UI retention */
export type IterationSummary = {
  iterationId: string;
  index: number;
  key?: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: SerializedError;
};

// Map events
export type MapStartEvent = {
  type: "map:start";
  runId: string;
  mapNodeId: string;
  total: number;
  at: string;
  counts: MapCounts;
};

export type MapProgressEvent = {
  type: "map:progress";
  runId: string;
  mapNodeId: string;
  at: string;
  counts: MapCounts;
  spotlight?: MapSpotlight;
};

export type MapEndEvent = {
  type: "map:end";
  runId: string;
  mapNodeId: string;
  at: string;
  status: "success" | "failed" | "canceled";
  counts: MapCounts;
};

export type MapItemStartEvent = {
  type: "map:item:start";
  runId: string;
  mapNodeId: string;
  at: string;
  iterationId: string;
  index: number;
  key?: string;
};

export type MapItemEndEvent = {
  type: "map:item:end";
  runId: string;
  mapNodeId: string;
  at: string;
  iterationId: string;
  index: number;
  key?: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: SerializedError;
};

export type MapTemplateStepStartEvent = {
  type: "map:templateStep:start";
  runId: string;
  mapNodeId: string;
  at: string;
  iterationId: string;
  templateNodeId: string;
};

export type MapTemplateStepEndEvent = {
  type: "map:templateStep:end";
  runId: string;
  mapNodeId: string;
  at: string;
  iterationId: string;
  templateNodeId: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: SerializedError;
};

export type MapLogEvent = {
  type: "map:log";
  runId: string;
  mapNodeId: string;
  at: string;
  iterationId: string;
  templateNodeId?: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  data?: any;
};

/** Union of all map-related events */
export type MapEvent =
  | MapStartEvent
  | MapProgressEvent
  | MapEndEvent
  | MapItemStartEvent
  | MapItemEndEvent
  | MapTemplateStepStartEvent
  | MapTemplateStepEndEvent
  | MapLogEvent;
