export type RunControlSignal = "pause" | "resume" | "cancel";

export type RunControlState = {
  signal: RunControlSignal | null;
  pausedAt?: string; // nodeId where paused
  failedSteps: Array<{ nodeId: string; error: string }>;
  outputs: Record<string, any>;
  mapOutputs: Record<string, Record<string, Record<string, any>>>;
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
type RequiredInputParam<T extends InputParameter> = T extends { required: true }
  ? T
  : T extends { default: infer _D }
  ? T
  : never;

/** Extract InputParameters that are optional */
type OptionalInputParam<T extends InputParameter> =
  T extends RequiredInputParam<T> ? never : T;

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
  {
    [K in RequiredInputParam<TDefs[number]>["name"]]: InputTypeFor<TDefs, K>;
  } & // Optional properties
  { [K in OptionalInputParam<TDefs[number]>["name"]]?: InputTypeFor<TDefs, K> };

/** Default inputs type when no inputs are defined or inference fails */
export type AnyInputs = Record<string, any>;

export type StepFn<TInputs = AnyInputs> = (
  ctx: StepContext<TInputs>
) => Promise<void>;

// ─────────────────────────────────────────────────────────────────────────────
// Check types
// ─────────────────────────────────────────────────────────────────────────────

/** Function signature for check predicates (sync or async, returns boolean) */
export type CheckFn<TInputs = AnyInputs> = (
  ctx: StepContext<TInputs>
) => Promise<boolean> | boolean;

/** Options for check nodes */
export type CheckNodeOptions = {
  /** Message shown in UI when check fails */
  message?: string;
  /** If true, failure marks workflow as warning but continues execution */
  softFail?: boolean;
  /** Retry configuration (same as step retries) */
  retry?: RetryOptions;
  /** Optional hard timeout in milliseconds */
  timeoutMs?: number;
};

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
export type LoopContext<TItem = unknown> = {
  mapNodeId: string;
  iterationId: string;
  index: number;
  key?: string;
  item: TItem;
};

/** Builder passed to the map's build function for defining template steps */
export type LoopBuilder<TInputs = AnyInputs, TItem = unknown> = {
  step(
    title: string,
    fn: IterationStepFn<TInputs, TItem>,
    options?: StepNodeOptions
  ): void;
  /** Define a check/assertion that verifies a condition for each iteration */
  check(
    title: string,
    fn: IterationCheckFn<TInputs, TItem>,
    options?: CheckNodeOptions
  ): void;
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

/** Options for retrying a step */
export type RetryOptions = {
  maxAttempts: number;
  backoffMs?: number;
};

/** Options for step nodes */
export type StepNodeOptions = {
  description?: string;
  tags?: string[];
  ui?: { icon?: string };
  aws?: { service?: string };
  retry?: RetryOptions;
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
  sleep(ms: number): Promise<void>;
  run: RunStore;
  /** Current attempt number (1-based) */
  attempt: number;
  /** Maximum number of attempts allowed for this step */
  maxAttempts: number;
};

/** Context provided to steps defined inside a map template. Guaranteed LoopContext and RunStore. */
export type IterationStepContext<
  TInputs = AnyInputs,
  TItem = unknown
> = StepContext<TInputs> & {
  loop: LoopContext<TItem>;
  iteration: RunStore;
};

/** Function signature for steps defined inside a map template. */
export type IterationStepFn<TInputs = AnyInputs, TItem = unknown> = (
  ctx: IterationStepContext<TInputs, TItem>
) => Promise<void>;

/** Function signature for checks defined inside a map template. */
export type IterationCheckFn<TInputs = AnyInputs, TItem = unknown> = (
  ctx: IterationStepContext<TInputs, TItem>
) => Promise<boolean> | boolean;

export type WorkflowBuilder<TInputs = AnyInputs> = {
  step(title: string, fn: StepFn<TInputs>, options?: StepNodeOptions): void;
  /**
   * Define a check/assertion that verifies a condition.
   *
   * - Returns `true` → check passes
   * - Returns `false` → check fails (with optional message)
   * - Throws → check errors (different semantics from failure)
   *
   * @param title - Static title for the check node
   * @param fn - Predicate function (sync or async) that returns boolean
   * @param options - Optional check configuration (message, softFail, retry, timeout)
   */
  check(title: string, fn: CheckFn<TInputs>, options?: CheckNodeOptions): void;
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
   * @param build - Function that defines template steps.
   *                IMPORTANT: Use `ctx.loop.item` and `ctx.loop.index` inside
   *                the `loop.step()` callbacks for runtime values.
   */
  map<T>(
    title: string,
    opts: MapOptions<T, TInputs>,
    build: (loop: LoopBuilder<TInputs, T>) => void
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
  kind: "root" | "group" | "step" | "map" | "check";
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
    // Check-specific metadata
    check?: {
      message?: string;
      softFail?: boolean;
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
  attempt?: number;
  maxAttempts?: number;
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
