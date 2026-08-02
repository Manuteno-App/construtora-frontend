// ─── Status ─────────────────────────────────────────────────────────────────

export type AtestadoStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";
export type EmpresaTipo = "CONTRATANTE" | "CONTRATADA";
export type ConversationRole = "USER" | "ASSISTANT";
export type UnitFamilyStatus = "ACTIVE" | "INACTIVE";
export type UnitStatus = "ACTIVE" | "INACTIVE";
export type UnitOrigin = "SYSTEM" | "AI" | "USER";
export type TechnicalConversionStatus = "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE";

// ─── Entities ────────────────────────────────────────────────────────────────

export interface Atestado {
  id: string;
  s3Key: string;
  originalFilename: string;
  status: AtestadoStatus;
  errorMessage?: string;
  createdAt: string;
  lastReprocessedAt?: string;
  obras?: Obra[];
}

export interface Obra {
  id: string;
  atestadoId: string;
  nome: string;
  local?: string;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
  valor?: number;
  art?: string;
  contratos?: Contrato[];
  servicosExecutados?: ServicoExecutado[];
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  tipo?: EmpresaTipo;
}

export interface Contrato {
  id: string;
  obraId: string;
  empresaId: string;
  numero?: string;
  data?: string;
  valor?: number;
  empresa?: Empresa;
}

export interface ServicoExecutado {
  id: string;
  atestadoId: string;
  obraId?: string;
  categoria?: string;
  codigo?: string;
  descricao: string;
  unidade?: string;
  unitId?: string;
  unitSymbolRaw?: string;
  normalizedServiceKey?: string;
  manualOverride?: boolean;
  quantidade?: number;
}

export interface UnitFamily {
  id: string;
  name: string;
  slug: string;
  status: UnitFamilyStatus;
}

export interface MeasurementUnit {
  id: string;
  name: string;
  canonicalSymbol: string;
  normalizedSymbol: string;
  aliasesJson: string;
  familyId: string;
  family?: UnitFamily;
  status: UnitStatus;
  origin: UnitOrigin;
}

export interface MathematicalConversion {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  factor: number;
  type: "MATHEMATICAL";
  ruleOrigin: UnitOrigin;
  isActive: boolean;
  sourceUnit?: MeasurementUnit;
  targetUnit?: MeasurementUnit;
}

export interface TechnicalConversion {
  id: string;
  serviceDescription: string;
  normalizedServiceKey: string;
  sourceUnitId: string;
  targetUnitId: string;
  factor: number;
  ruleOrigin: UnitOrigin;
  status: TechnicalConversionStatus;
  evidence?: Record<string, unknown>;
  sourceUnit?: MeasurementUnit;
  targetUnit?: MeasurementUnit;
}

export interface Chunk {
  id: string;
  atestadoId: string;
  originalFilename: string;
  content: string;
  chunkIndex: number;
  pageNumber?: number;
}

export interface ConversationTurn {
  id: string;
  sessionId: string;
  role: ConversationRole;
  content: string;
  sources?: SourceRef[];
  createdAt: string;
}

export interface SourceRef {
  atestadoId: string;
  filename: string;
  pagina?: number;
  trecho?: string;
}

export interface QuantitativoRow {
  descricao: string;
  unidade: string | null;
  unitId?: string | null;
  total: number;
  atestados: string[];
  atestadoRefs: { id: string; filename: string }[];
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface AtestadoListResponse {
  items: Atestado[];
  total: number;
}

export interface UploadResponse {
  atestadoId: string;
  status: AtestadoStatus;
}

export interface UploadBatchResponse {
  results: Array<{
    atestadoId: string;
    status: AtestadoStatus;
    originalFilename: string;
  }>;
}

export interface StatusResponse {
  atestadoId: string;
  status: AtestadoStatus;
  originalFilename: string;
  createdAt: string;
  errorMessage?: string;
}

export interface QueryRequest {
  query: string;
  sessionId?: string;
  filters?: {
    periodo?: { de: string; ate: string };
    estado?: string;
    obraId?: string;
    empresaId?: string;
  };
}

export interface QueryResponse {
  answer: string;
  sources: SourceRef[];
  notFound: boolean;
}

// ─── Qualification ────────────────────────────────────────────────────────────

export interface QualificationFilters {
  dataInicio?: string;
  dataFim?: string;
  localidade?: string;
  minValor?: number;
}

export interface ServicoBuscado {
  descricao: string;
  matchType?: ServiceMatchType;
  quantidade?: number;
  unidade?: string;
  unitId?: string;
  unidadeOriginal?: string;
  quantidadeConvertida?: number;
  unidadeComparada?: string;
  conversionKind?: "DIRECT" | "MATHEMATICAL" | "TECHNICAL";
  conversionFactor?: number;
  itemCode?: string;
  pageNumber?: number;
  matchConfidence?: "HIGH" | "MEDIUM";
}
export type ServiceMatchType = "EXATA" | "POR_TERMOS" | "TEXTUAL_FORTE";


export interface QualificationSource {
  atestadoId: string;
  lastReprocessedAt?: string;
  filename: string;
  obraNome: string;
  local?: string;
  dataInicio?: string;
  dataFim?: string;
  valor?: number;
  contratoNumero?: string;
  servicos?: ServicoBuscado[];
  selectionRole?: "MEETS_ALONE" | "USED_IN_SUM" | "USED_WITH_APPROXIMATION" | "AVAILABLE_UNUSED";
  hasCaveat?: boolean;
}

export interface ResolvedDescricao {
  descricao: string;
  score: number;
  unidadeSugerida?: string;
}

export interface ServiceRequirement {
  criterionKey?: string;
  query: string;
  minQuantidade?: number;
  unidade?: string;
  proofMode?: ProofMode;
  maxAtestados?: number;
}

export type ProofMode = "ONE" | "MANY" | "MAX";

export type QualificationFailureReason =
  | "NO_MATCHES"
  | "INSUFFICIENT_QUANTITY"
  | "MAX_ATESTADOS_EXCEEDED";

export interface ServiceCoverage {
  criterionKey?: string;
  serviceQuery: string;
  resolvedDescricoes: string[];
  matchingAtestados?: QualificationSource[];
  qualifyingAtestados: QualificationSource[];
  selectedAtestados?: QualificationSource[];
  totalQuantidade?: number;
  selectedTotalQuantidade?: number;
  availableTotalQuantidade?: number;
  matchingAtestadosCount?: number;
  quantidadeExigida?: number;
  percentualCobertura?: number;
  status?: "ATENDIDO" | "PARCIAL" | "NAO_ATENDIDO";
  usedAtestadosCount?: number;
  proofModeApplied?: ProofMode;
  maxAtestados?: number;
  withinLimit?: boolean;
  qualified?: boolean;
  failureReason?: QualificationFailureReason;
  covered: boolean;
}

export interface BundleCoverageResult {
  minimumSet: QualificationSource[];
  coverageByService: ServiceCoverage[];
  fullyQualified: boolean;
}

export interface CumulativeResult {
  atestados: QualificationSource[];
  totalQuantidade: number;
  meetsMinimum: boolean;
  minQuantidade: number;
}

export interface BundleEvaluationRequest {
  bundleMode: ProofMode;
  maxAtestados?: number;
  services: ServiceRequirement[];
  filters?: QualificationFilters;
}

export interface BundleEvaluationResult {
  bundleModeApplied: ProofMode;
  maxAtestados?: number;
  selectedAtestados: QualificationSource[];
  usedAtestadosCount: number;
  coverageByService: ServiceCoverage[];
  fullyQualified: boolean;
  exceededMaxAtestados: boolean;
  candidateAtestados?: QualificationSource[];
  conjunctionCandidateCount?: number;
  bestCandidateCoverageCount?: number;
  totalAtestadosBase?: number;
  matchingAtestadosCount?: number;
  elapsedMs?: number;
}

export interface QualificationRequest {
  services?: ServiceRequirement[];
  descricoes?: string[];
  minQuantidade?: number;
  filters?: QualificationFilters;
}
