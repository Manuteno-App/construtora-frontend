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
  chunkId?: string;
  originalFilename?: string;
  pageNumber?: number;
  similarity?: number;
}

export interface QuantitativoRow {
  descricao: string;
  unidade: string | null;
  total: number;
  atestados: string[];
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
