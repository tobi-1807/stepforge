export type RunControlSignal = "pause" | "resume" | "cancel";

export type RunControlState = {
  signal: RunControlSignal | null;
  pausedAt?: string; // nodeId where paused
  failedSteps: Array<{ nodeId: string; error: string }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Input type inference utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Maps InputParameter type strings to TypeScript types */
type InputTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

/** Extract InputParameters that are required (required: true OR has default) */
type RequiredInputParam<T extends InputParameter> =
  T extends { required: true }
  ? T
  : T extends { default: infer _D }
  ? T
  : never;

/** Extract InputParameters that are optional */
type OptionalInputParam<T extends InputParameter> = T extends RequiredInputParam<T>
  ? never
  : T;

/** Get the TypeScript type for a specific input name from the definitions */
type InputTypeFor<
  TDefs extends readonly InputParameter[],
  Name extends string
> = InputTypeMap[Extract<TDefs[number], { name: Name }>["type"]];

/**
 * Infer a strongly-typed inputs object from an `inputs` array definition.
 * - Properties with `required: true` or `default` are non-optional
 * - Other properties are optional (may be undefined)
 *
 * Usage: Use `inputs: [...] as const` to preserve literal types for inference.
 */
export type InferInputs<TDefs extends readonly InputParameter[]> =
  // Required properties (required: true OR has default)
  { [K in RequiredInputParam<TDefs[number]>["name"]]: InputTypeFor<TDefs, K> } &
  // Optional properties
  { [K in OptionalInputParam<TDefs[number]>["name"]]?: InputTypeFor<TDefs, K> };

/** Default inputs type when no inputs are defined or inference fails */
export type AnyInputs = Record<string, any>;

export type StepFn<TInputs = AnyInputs> = (ctx: StepContext<TInputs>) => Promise<void>;

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
export type MapItemsContext<TInputs = AnyInputs> = {
  runId: string;
  /** User-provided workflow inputs (read-only, strongly typed when using `as const`) */
  inputs: TInputs;
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
export type LoopBuilder<TInputs = AnyInputs> = {
  step(title: string, fn: IterationStepFn<TInputs>, options?: StepNodeOptions): void;
  // group() can be added later if needed
};

/** Options for wf.map() */
export type MapOptions<T, TInputs = AnyInputs> = {
  /** Function that returns the items to iterate over (evaluated at runtime) */
  items: (ctx: MapItemsContext<TInputs>) => Promise<T[]> | T[];
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

export type StepContext<TInputs = AnyInputs> = {
  nodeId: string;
  runId: string;
  /** User-provided workflow inputs (read-only, strongly typed when using `as const`) */
  inputs: TInputs;
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

  /**
   * Present when executing inside a map iteration.
   * @deprecated Use `IterationStepContext` for guaranteed access inside map templates.
   */
  loop?: LoopContext;

  /**
   * Iteration-scoped scratch store.
   * @deprecated Use `IterationStepContext` for guaranteed access inside map templates.
   */
  iteration?: RunStore;
};

/** Context provided to steps defined inside a map template. Guaranteed LoopContext and RunStore. */
export type IterationStepContext<TInputs = AnyInputs> = StepContext<TInputs> & {
  loop: LoopContext;
  iteration: RunStore;
};

/** Function signature for steps defined inside a map template. */
export type IterationStepFn<TInputs = AnyInputs> = (
  ctx: IterationStepContext<TInputs>
) => Promise<void>;

export type WorkflowBuilder<TInputs = AnyInputs> = {
  step(title: string, fn: StepFn<TInputs>, options?: StepNodeOptions): void;
  group(
    title: string,
    build: (b: WorkflowBuilder<TInputs>) => void,
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
    opts: MapOptions<T, TInputs>,
    build: (item: T, index: number, loop: LoopBuilder<TInputs>) => void
  ): void;
  // Internal use only - for recursing
  _getInternalState?(): any;
};

export type InputParameter = {
  readonly name: string;
  readonly type: "string" | "number" | "boolean";
  readonly label: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly default?: string | number | boolean;
};

/**
 * Workflow definition with strongly-typed inputs.
 *
 * Use `inputs: [...] as const` to enable automatic type inference for `ctx.inputs`.
 *
 * @template TInputsDef - The literal type of the inputs array (inferred from `as const`)
 */
export type WorkflowDefinition<
  TInputsDef extends readonly InputParameter[] = readonly InputParameter[]
> = {
  name: string;
  inputs?: TInputsDef;
  build: (wf: WorkflowBuilder<InferInputs<TInputsDef>>) => void;
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
