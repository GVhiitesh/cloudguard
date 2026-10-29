/**
 * Types mirroring the CloudGuard backend responses.
 *
 * These are hand-written against the actual service return shapes in
 * `backend/src/modules/**`, not generated. If a backend response changes,
 * change it here too.
 */

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ResourceType = 'EC2' | 'RDS' | 'S3' | 'LAMBDA' | 'EBS' | 'OTHER';
export type Environment = 'DEV' | 'STAGING' | 'PROD';
export type ResourceStatus = 'RUNNING' | 'STOPPED';
export type Lifecycle = 'ACTIVE' | 'IDLE' | 'FLAGGED' | 'REVIEWED' | 'ARCHIVED';
export type AnomalyKind = 'COST_SPIKE' | 'USAGE_SPIKE' | 'IDLE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalyStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type BudgetScope = 'GLOBAL' | 'ENVIRONMENT' | 'OWNER';
export type BudgetState = 'OK' | 'WARNING' | 'PROJECTED_TO_EXCEED' | 'EXCEEDED';
export type Trend = 'up' | 'down' | 'flat';
export type RecommendationType = 'STOP' | 'DOWNSIZE' | 'DELETE_UNUSED';

export const LIFECYCLES: Lifecycle[] = ['ACTIVE', 'IDLE', 'FLAGGED', 'REVIEWED', 'ARCHIVED'];
export const RESOURCE_TYPES: ResourceType[] = ['EC2', 'RDS', 'S3', 'LAMBDA', 'EBS', 'OTHER'];
export const ENVIRONMENTS: Environment[] = ['DEV', 'STAGING', 'PROD'];
export const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH'];

/** Uniform error body from the backend's central error handler. */
export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

// --- Auth & users -----------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserDetail extends User {
  resourceCount: number;
}

/** Owner sub-object embedded in resource responses. */
export interface OwnerRef {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// --- Resources --------------------------------------------------------------

export interface Tag {
  id: string;
  key: string;
  value: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  provider: string;
  region: string;
  environment: Environment;
  status: ResourceStatus;
  lifecycle: Lifecycle;
  ownerId: string;
  owner: OwnerRef;
  estCostPerDay: number;
  healthScore: number;
  metadata: Record<string, unknown> | null;
  idleSince: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface ResourceFilters {
  type?: ResourceType;
  environment?: Environment;
  lifecycle?: Lifecycle;
  status?: ResourceStatus;
  ownerId?: string;
  /** "key" or "key:value" */
  tag?: string;
  q?: string;
  sort?: 'createdAt' | 'name' | 'estCostPerDay' | 'healthScore';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ResourceInput {
  name: string;
  type: ResourceType;
  provider?: string;
  region: string;
  environment: Environment;
  status?: ResourceStatus;
  ownerId?: string;
  estCostPerDay?: number;
  metadata?: Record<string, unknown>;
  tags?: Array<{ key: string; value: string }>;
}

export interface LifecycleChangeResponse {
  resource: Resource;
  allowedNext: Lifecycle[];
}

// --- Metrics ----------------------------------------------------------------

export interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  storageUsed: number;
  cost: number;
}

export interface MetricsResponse {
  resourceId: string;
  granularity: 'raw' | 'hour' | 'day';
  count: number;
  data: MetricPoint[];
}

// --- Anomalies --------------------------------------------------------------

/** Slim resource embedded in anomaly rows. */
export interface AnomalyResourceRef {
  id: string;
  name: string;
  type: ResourceType;
  environment: Environment;
  lifecycle: Lifecycle;
}

export interface Anomaly {
  id: string;
  resourceId: string;
  resource: AnomalyResourceRef;
  kind: AnomalyKind;
  severity: Severity;
  expected: number;
  actual: number;
  /** z-score for spikes, threshold gap for idle. */
  deviation: number;
  status: AnomalyStatus;
  message: string;
  detectedAt: string;
}

/** Anomalies nested inside the twin response carry no `resource` sub-object. */
export type TwinAnomaly = Omit<Anomaly, 'resource'>;

export interface AnomalyFilters {
  status?: AnomalyStatus;
  severity?: Severity;
  kind?: AnomalyKind;
  resourceId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// --- Idle -------------------------------------------------------------------

export interface IdleEvidence {
  windowDays: number;
  cpuThreshold: number;
  dataPoints: number;
  avgCpu: number;
  maxCpu: number;
  avgCost: number;
  idleSince: string | null;
  idleDays: number | null;
  stillRunning: boolean;
}

export interface IdleEntry {
  resource: Pick<
    Resource,
    | 'id'
    | 'name'
    | 'type'
    | 'environment'
    | 'region'
    | 'status'
    | 'lifecycle'
    | 'estCostPerDay'
    | 'healthScore'
    | 'tags'
  > & { owner: Pick<OwnerRef, 'id' | 'name' | 'email'> };
  evidence: IdleEvidence;
  wastedSpendPerMonth: number;
  recommendations: Recommendation[];
}

export interface IdleResponse {
  count: number;
  totalWastedSpendPerMonth: number;
  data: IdleEntry[];
}

// --- Recommendations --------------------------------------------------------

export interface Recommendation {
  id: string;
  resourceId: string;
  type: RecommendationType | string;
  reason: string;
  estSaving: number;
  applied: boolean;
  createdAt: string;
}

export interface RecommendationWithResource extends Recommendation {
  resource: Pick<
    Resource,
    'id' | 'name' | 'type' | 'environment' | 'lifecycle' | 'status' | 'estCostPerDay'
  >;
}

export interface RecommendationsResponse extends Paginated<RecommendationWithResource> {
  potentialMonthlySaving: number;
}

export interface ApplyRecommendationInput {
  lifecycle?: Lifecycle;
  stopResource?: boolean;
}

// --- Digital twin -----------------------------------------------------------

export interface HealthDeduction {
  reason: string;
  delta: number;
}

export interface UsageSummary {
  windowDays: number;
  dataPoints: number;
  avgCpu: number;
  avgMemory: number;
  avgCost: number;
  totalCost: number;
  projectedMonthlyCost: number;
  trend: Trend;
}

export interface Twin {
  resource: Resource;
  healthScore: number;
  healthBreakdown: HealthDeduction[];
  lifecycle: Lifecycle;
  allowedNext: Lifecycle[];
  usageSummary: UsageSummary;
  history: MetricPoint[];
  anomalies: TwinAnomaly[];
  recommendations: Recommendation[];
  tags: Tag[];
}

// --- Budgets ----------------------------------------------------------------

export interface Budget {
  id: string;
  scope: BudgetScope;
  scopeValue: string | null;
  limitPerMonth: number;
  createdAt: string;
}

export interface BudgetStatusEntry {
  budget: Budget;
  spendToDate: number;
  projectedMonthEnd: number;
  limitPerMonth: number;
  remaining: number;
  utilizationPct: number;
  projectedUtilizationPct: number;
  state: BudgetState;
}

export interface BudgetStatusResponse {
  asOf: string;
  monthStart: string;
  data: BudgetStatusEntry[];
}

export interface BudgetInput {
  scope: BudgetScope;
  scopeValue?: string;
  limitPerMonth: number;
}

// --- Alerts -----------------------------------------------------------------

export interface Alert {
  id: string;
  userId: string | null;
  kind: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AlertsResponse extends Paginated<Alert> {
  unread: number;
}

// --- Audit ------------------------------------------------------------------

export interface AuditLog {
  id: string;
  actorId: string;
  actor: { id: string; name: string; email?: string; role?: Role } | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

// --- Analytics --------------------------------------------------------------

export interface AnalyticsSummary {
  totalResources: number;
  resourcesByLifecycle: Partial<Record<Lifecycle, number>>;
  resourcesByStatus: Partial<Record<ResourceStatus, number>>;
  openAnomalies: number;
  anomaliesBySeverity: Partial<Record<Severity, number>>;
  idleResources: number;
  actualCostLast30Days: number;
  estimatedMonthlyCost: number;
  avgCpuLast30Days: number;
  avgHealthScore: number;
  potentialMonthlySaving: number;
  openRecommendations: number;
}

export interface CostTrendResponse {
  days: number;
  series: Array<{ date: string; cost: number }>;
  total: number;
  avgPerDay: number;
  trend: Trend;
}

export interface UtilizationBucket {
  label: string;
  count: number;
  resources: Array<{ id: string; name: string; avgCpu: number }>;
}

export interface UtilizationResponse {
  windowDays: number;
  buckets: UtilizationBucket[];
  resourcesWithoutData: number;
  overallAvgCpu: number;
  overallAvgMemory: number;
}

export interface ByEnvironmentResponse {
  windowDays: number;
  data: Array<{
    environment: Environment;
    resourceCount: number;
    actualCost: number;
    estimatedMonthlyCost: number;
    avgCpu: number;
    avgHealthScore: number;
  }>;
}

// --- Simulator --------------------------------------------------------------

export interface InjectInput {
  resourceId: string;
  costMultiplier?: number;
  cpu?: number;
  runDetection?: boolean;
}

export interface DetectionResult {
  scannedResources: number;
  created: number;
  skipped: number;
  durationMs: number;
}

export interface InjectResponse {
  injected: MetricPoint & { resourceId: string };
  detection: DetectionResult | null;
}
