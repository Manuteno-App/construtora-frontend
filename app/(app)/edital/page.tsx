"use client";

import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import type {
  BundleEvaluationRequest,
  BundleEvaluationResult,
  ProofMode,
  QualificationFilters,
  QualificationSource,
  ResolvedDescricao,
  ServiceCoverage,
  ServiceRequirement,
  ServicoBuscado,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CriterionEntry {
  id: number;
  query: string;
  minQuantidade: string;
  unidade: string;
  proofMode: ProofMode;
  maxAtestados: string;
}

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const MODE_LABEL: Record<ProofMode, string> = {
  ONE: "1 atestado",
  MANY: "N atestados",
  MAX: "X atestados",
};

let nextCriterionId = 0;

const newCriterion = (): CriterionEntry => ({
  id: ++nextCriterionId,
  query: "",
  minQuantidade: "",
  unidade: "",
  proofMode: "ONE",
  maxAtestados: "",
});

function ServiceAutocomplete({
  value,
  onChange,
  placeholder = "Serviço ou material executado (ex: Pavimentação asfáltica…)",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery<ResolvedDescricao[]>({
    queryKey: ["qualification-resolve", value],
    queryFn: () =>
      api.get<ResolvedDescricao[]>("/qualification/resolve", { params: { q: value } }).then((r) => r.data),
    enabled: value.trim().length >= 3,
    staleTime: 60_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
      />
      {open && suggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md max-h-48 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s.descricao}
              className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.descricao);
                setOpen(false);
              }}
            >
              <span>{s.descricao}</span>
              <span className="ml-2 text-xs text-gray-400">score: {s.score.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourceRow({
  source,
  openingPdf,
  onOpen,
}: {
  source: QualificationSource;
  openingPdf: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[180px]" title={source.filename}>
          {source.filename}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{source.obraNome}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{source.local ?? "—"}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{source.dataInicio ?? "—"}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{source.dataFim ?? "—"}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {source.valor != null ? `R$ ${source.valor.toLocaleString("pt-BR")}` : "—"}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{source.contratoNumero ?? "—"}</td>
        <td />
        <td />
        <td />
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => onOpen(source.atestadoId)}
            disabled={openingPdf === source.atestadoId}
            className="text-xs flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-40"
          >
            <ExternalLink size={12} />
            {openingPdf === source.atestadoId ? "Abrindo…" : "PDF"}
          </button>
        </td>
      </tr>
      {source.servicos?.map((s: ServicoBuscado, i: number) => (
        <tr key={`${source.atestadoId}-${i}`} className="bg-gray-50/50">
          <td colSpan={7} />
          <td className="px-4 py-1 text-xs text-gray-500 italic max-w-[200px] truncate" title={s.descricao}>
            {s.descricao}
          </td>
          <td className="px-4 py-1 text-xs text-right font-mono text-gray-700">
            {(s.quantidadeConvertida ?? s.quantidade) != null
              ? (s.quantidadeConvertida ?? s.quantidade)!.toLocaleString("pt-BR", { maximumFractionDigits: 4 })
              : "—"}
          </td>
          <td className="px-4 py-1 text-xs text-gray-500">{s.unidadeComparada ?? s.unidade ?? "—"}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

const SOURCE_HEADERS = ["Arquivo", "Obra", "Local", "Início", "Fim", "Valor", "Contrato", "Serviço buscado", "Qtd", "Un", ""];

function SourceTable({
  sources,
  openingPdf,
  onOpen,
}: {
  sources: QualificationSource[];
  openingPdf: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {SOURCE_HEADERS.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sources.map((s) => (
            <SourceRow key={s.atestadoId} source={s} openingPdf={openingPdf} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusAppearance(coverage: ServiceCoverage) {
  if (coverage.qualified) {
    return { label: "Coberto", className: "bg-green-100 text-green-700" };
  }
  if (coverage.failureReason === "MAX_ATESTADOS_EXCEEDED") {
    return { label: "Excede limite", className: "bg-red-100 text-red-700" };
  }
  if (coverage.failureReason === "INSUFFICIENT_QUANTITY") {
    return { label: "Insuficiente", className: "bg-yellow-100 text-yellow-700" };
  }
  return { label: "Não coberto", className: "bg-yellow-100 text-yellow-700" };
}

function failureText(coverage: ServiceCoverage) {
  if (coverage.failureReason === "MAX_ATESTADOS_EXCEEDED") {
    return "O critério encontrou cobertura técnica, mas estourou o limite máximo de atestados.";
  }
  if (coverage.failureReason === "INSUFFICIENT_QUANTITY") {
    return "Os atestados encontrados não somam a quantidade mínima exigida.";
  }
  if (coverage.failureReason === "NO_MATCHES") {
    return "Nenhum atestado compatível foi encontrado para este critério.";
  }
  return null;
}

export default function EditalPage() {
  const [bundleMode, setBundleMode] = useState<ProofMode>("MANY");
  const [bundleMaxAtestados, setBundleMaxAtestados] = useState("");
  const [criteria, setCriteria] = useState<CriterionEntry[]>(() => [newCriterion()]);
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [minValorStr, setMinValorStr] = useState("");
  const [submitted, setSubmitted] = useState<BundleEvaluationRequest | null>(null);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const rowRulesDisabled = bundleMode !== "MANY";

  const { data, isLoading, isFetching } = useQuery<BundleEvaluationResult>({
    queryKey: ["qual-evaluate-bundle", submitted],
    queryFn: () =>
      api.post<BundleEvaluationResult>("/qualification/evaluate-bundle", submitted!).then((r) => r.data),
    enabled: submitted !== null,
  });

  const updateCriterion = (
    id: number,
    field: "query" | "minQuantidade" | "unidade" | "maxAtestados",
    value: string,
  ) => setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const setCriterionMode = (id: number, proofMode: ProofMode) =>
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, proofMode } : c)));

  const addCriterion = () => setCriteria((prev) => [...prev, newCriterion()]);
  const removeCriterion = (id: number) => setCriteria((prev) => prev.filter((c) => c.id !== id));

  const parsePositiveInteger = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = criteria.filter((c) => c.query.trim());
    if (!valid.length) {
      toast.error("Informe ao menos um serviço.");
      return;
    }

    const localidade = [municipio.trim(), estado].filter(Boolean).join(", ") || undefined;

    let dataInicio: string | undefined;
    let dataFim: string | undefined;
    const periodoMatch = periodo.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
    if (periodoMatch) {
      dataInicio = `${periodoMatch[1]}-01-01`;
      dataFim = `${periodoMatch[2]}-12-31`;
    }

    const cleanFilters: QualificationFilters = {
      ...(localidade ? { localidade } : {}),
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
      ...(minValorStr ? { minValor: parseFloat(minValorStr) } : {}),
    };

    let maxAtestados: number | undefined;
    if (bundleMode === "MAX") {
      maxAtestados = parsePositiveInteger(bundleMaxAtestados) ?? undefined;
      if (!maxAtestados) {
        toast.error("Informe um limite global de atestados maior que zero.");
        return;
      }
    }

    const services: ServiceRequirement[] = [];
    for (const criterion of valid) {
      const service: ServiceRequirement = {
        query: criterion.query.trim(),
        minQuantidade: parseFloat(criterion.minQuantidade) || undefined,
        unidade: criterion.unidade.trim() || undefined,
      };

      if (bundleMode === "MANY") {
        service.proofMode = criterion.proofMode;
        if (criterion.proofMode === "MAX") {
          const rowMaxAtestados = parsePositiveInteger(criterion.maxAtestados) ?? undefined;
          if (!rowMaxAtestados) {
            toast.error(`Informe um limite válido para o critério "${criterion.query.trim()}".`);
            return;
          }
          service.maxAtestados = rowMaxAtestados;
        }
      }

      services.push(service);
    }

    setSubmitted({
      bundleMode,
      ...(maxAtestados ? { maxAtestados } : {}),
      services,
      filters: cleanFilters,
    });
  };

  const openAtestadoPdf = async (atestadoId: string) => {
    setOpeningPdf(atestadoId);
    try {
      const { data } = await api.get<{ url: string }>(`/atestados/${atestadoId}/signed-url`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o PDF.");
    } finally {
      setOpeningPdf(null);
    }
  };

  const loadingResults = submitted !== null && (isLoading || isFetching);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consulta de Capacidade Técnica</h1>
        <p className="mt-1 text-sm text-gray-500">
          Localize atestados que comprovem os requisitos técnicos exigidos no edital.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Filtros da pesquisa
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white text-gray-700"
              >
                <option value="">Todos os estados</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Município</label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ex: São Paulo, Campinas…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Período do atestado</label>
              <input
                type="text"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ex: 2018 – 2024"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor mínimo do contrato (R$)</label>
              <input
                type="number"
                min={0}
                step="any"
                value={minValorStr}
                onChange={(e) => setMinValorStr(e.target.value)}
                placeholder="Ex: 500.000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none text-gray-700"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-2">Política global de comprovação</label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-wrap gap-2">
                {(["ONE", "MANY", "MAX"] as ProofMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBundleMode(mode)}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm transition-colors ${
                      bundleMode === mode
                        ? "border-orange-400 text-orange-700 bg-orange-50"
                        : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                    }`}
                  >
                    {MODE_LABEL[mode]}
                  </button>
                ))}
              </div>
              {bundleMode === "MAX" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Máximo global</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={bundleMaxAtestados}
                    onChange={(e) => setBundleMaxAtestados(e.target.value)}
                    placeholder="Ex: 3"
                    className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Em <strong>N atestados</strong>, cada critério pode escolher sua própria regra. Em <strong>1</strong> ou <strong>X atestados</strong>, as regras por linha ficam travadas.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Serviços e quantitativos exigidos
            </p>
            <span className="text-xs text-gray-400">
              Informe o serviço, a quantidade mínima e a forma de comprovação exigida
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {criteria.map((criterion, index) => (
              <div
                key={criterion.id}
                className="flex items-stretch border border-gray-200 rounded-lg bg-white"
              >
                <div className="w-8 rounded-l-lg border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-400 flex-shrink-0 select-none">
                  {index + 1}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex flex-col gap-2 p-2 md:flex-row md:items-center">
                    <ServiceAutocomplete
                      value={criterion.query}
                      onChange={(value) => updateCriterion(criterion.id, "query", value)}
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={criterion.minQuantidade}
                      onChange={(e) => updateCriterion(criterion.id, "minQuantidade", e.target.value)}
                      placeholder="Qtd. mínima"
                      className="w-full md:w-32 flex-shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      value={criterion.unidade}
                      onChange={(e) => updateCriterion(criterion.id, "unidade", e.target.value)}
                      placeholder="Unidade"
                      className="w-full md:w-24 flex-shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                    />
                  </div>

                  <div className={`px-2 pb-2 ${rowRulesDisabled ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <span className="text-xs text-gray-400 whitespace-nowrap">Comprovação:</span>
                      <div className="flex flex-wrap gap-2">
                        {(["ONE", "MANY", "MAX"] as ProofMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            disabled={rowRulesDisabled}
                            onClick={() => setCriterionMode(criterion.id, mode)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs transition-colors ${
                              criterion.proofMode === mode
                                ? "border-orange-400 text-orange-700 bg-orange-50"
                                : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                            }`}
                          >
                            {MODE_LABEL[mode]}
                          </button>
                        ))}
                      </div>
                      {criterion.proofMode === "MAX" && (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          disabled={rowRulesDisabled}
                          value={criterion.maxAtestados}
                          onChange={(e) => updateCriterion(criterion.id, "maxAtestados", e.target.value)}
                          placeholder="Limite"
                          className="w-24 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeCriterion(criterion.id)}
                  className="w-9 rounded-r-lg border-l border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remover critério"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCriterion}
            className="mt-3 flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-lg transition-colors hover:bg-orange-50"
            style={{ color: "var(--primary)" }}
          >
            <Plus size={14} />
            Adicionar critério
          </button>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={loadingResults}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Search size={14} />
              {loadingResults ? "Buscando…" : "Buscar atestados"}
            </button>
          </div>
        </div>
      </form>

      {submitted === null && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={36} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">
            Configure os filtros e critérios acima e clique em <strong>Buscar atestados</strong>.
          </p>
        </div>
      )}

      {loadingResults && <TableSkeleton rows={6} />}

      {!loadingResults && data && (
        <>
          <div
            className={`mb-4 p-4 rounded-xl border ${
              data.fullyQualified ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <p className={`text-sm font-semibold ${data.fullyQualified ? "text-green-700" : "text-yellow-700"}`}>
              {data.fullyQualified ? "✓ Todos os critérios cobertos" : "⚠ Cobertura parcial ou fora do limite"}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>Modo aplicado: <strong>{MODE_LABEL[data.bundleModeApplied]}</strong></span>
              <span>Atestados usados: <strong>{data.usedAtestadosCount}</strong></span>
              {data.maxAtestados != null && (
                <span>Limite máximo: <strong>{data.maxAtestados}</strong></span>
              )}
            </div>
            {data.exceededMaxAtestados && (
              <p className="mt-2 text-xs text-red-600">
                O conjunto encontrado atende tecnicamente os critérios, mas excede o número máximo de atestados permitido.
              </p>
            )}
          </div>

          {data.selectedAtestados.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Atestados selecionados</h3>
              <SourceTable sources={data.selectedAtestados} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
            </div>
          )}

          {data.coverageByService.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cobertura por critério</h3>
              {data.coverageByService.map((coverage) => {
                const status = statusAppearance(coverage);
                const selectedAtestados = coverage.selectedAtestados ?? [];
                const explanation = failureText(coverage);

                return (
                  <details key={coverage.serviceQuery} className="mb-3 border border-gray-200 rounded-xl">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 flex items-center justify-between gap-3">
                      <span>{coverage.serviceQuery}</span>
                      <div className="flex items-center gap-3">
                        {coverage.totalQuantidade != null && (
                          <span className="text-xs text-gray-500">
                            Total: {coverage.totalQuantidade.toLocaleString("pt-BR")}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                        <span>Regra aplicada: <strong>{MODE_LABEL[coverage.proofModeApplied ?? "MANY"]}</strong></span>
                        {coverage.maxAtestados != null && (
                          <span>Limite: <strong>{coverage.maxAtestados}</strong></span>
                        )}
                        <span>Atestados usados: <strong>{coverage.usedAtestadosCount ?? 0}</strong></span>
                      </div>
                      {coverage.resolvedDescricoes.length > 0 && (
                        <p className="text-xs text-gray-400 mb-2">
                          Descrições: {coverage.resolvedDescricoes.join(", ")}
                        </p>
                      )}
                      {explanation && (
                        <p className="text-sm text-gray-500 mb-3">{explanation}</p>
                      )}

                      {selectedAtestados.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                            Atestados usados na comprovação
                          </h4>
                          <SourceTable sources={selectedAtestados} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
                        </div>
                      )}

                      {!selectedAtestados.length && coverage.qualifyingAtestados.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                            Atestados encontrados
                          </h4>
                          <SourceTable
                            sources={coverage.qualifyingAtestados}
                            openingPdf={openingPdf}
                            onOpen={openAtestadoPdf}
                          />
                        </div>
                      )}

                      {!coverage.qualifyingAtestados.length && (
                        <p className="text-sm text-gray-400 py-2">
                          Nenhum atestado encontrado para este critério.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
