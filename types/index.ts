// ─── Status ─────────────────────────────────────────────────────────────────

export type AtestadoStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";
export type EmpresaTipo = "CONTRATANTE" | "CONTRATADA";
export type ConversationRole = "USER" | "ASSISTANT";

// ─── Entities ────────────────────────────────────────────────────────────────

export interface Atestado {
  id: string;
  s3Key: string;
  originalFilename: string;
  status: AtestadoStatus;
  errorMessage?: string;
  createdAt: string;
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
  trecho?: string;
  categoria?: string;
  codigo?: string;
  descricao: string;
  unidade?: string;
  quantidade?: number;
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

export interface QualificationSource {
  atestadoId: string;
  filename: string;
  obraNome: string;
  local?: string;
  dataInicio?: string;
  dataFim?: string;
  valor?: number;
  contratoNumero?: string;
}

export interface ResolvedDescricao {
  descricao: string;
  score: number;
}

export interface ServiceRequirement {
  query: string;
  minQuantidade?: number;
}

export interface ServiceCoverage {
  serviceQuery: string;
  resolvedDescricoes: string[];
  qualifyingAtestados: QualificationSource[];
  totalQuantidade?: number;
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

export interface QualificationRequest {
  services?: ServiceRequirement[];
  descricoes?: string[];
  minQuantidade?: number;
  filters?: QualificationFilters;
}

