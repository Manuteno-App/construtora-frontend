"use client";

import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import type {
    BundleCoverageResult,
    QualificationFilters,
    QualificationSource,
    ResolvedDescricao,
    ServiceCoverage,
    ServiceRequirement,
    ServicoBuscado,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Info, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "F4" | "F5";

interface CriterionEntry {
  id: number;
  query: string;
  minQuantidade: string;
  proof: "unico" | "soma";
}

interface SubmittedState {
  mode: Mode;
  services: ServiceRequirement[];
  filters: QualificationFilters;
}

let _rid = 0;
const newCriterion = (): CriterionEntry => ({
  id: ++_rid,
  query: "",
  minQuantidade: "",
  proof: "unico",
});

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors"
      style={{ backgroundColor: on ? "var(--primary)" : "#d1d5db" }}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

// ─── Service autocomplete input ───────────────────────────────────────────────

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

// ─── Source row ───────────────────────────────────────────────────────────────

function SourceRow({ source, openingPdf, onOpen }: { source: QualificationSource; openingPdf: string | null; onOpen: (id: string) => void }) {
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
        <tr key={i} className="bg-gray-50/50">
          <td colSpan={7} />
          <td className="px-4 py-1 text-xs text-gray-500 italic max-w-[200px] truncate" title={s.descricao}>
            {s.descricao}
          </td>
          <td className="px-4 py-1 text-xs text-right font-mono text-gray-700">
            {s.quantidade != null
              ? s.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 4 })
              : "—"}
          </td>
          <td className="px-4 py-1 text-xs text-gray-500">{s.unidade ?? "—"}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

const SOURCE_HEADERS = ["Arquivo", "Obra", "Local", "Início", "Fim", "Valor", "Contrato", "Serviço buscado", "Qtd", "Un", ""];

function SourceTable({ sources, openingPdf, onOpen }: { sources: QualificationSource[]; openingPdf: string | null; onOpen: (id: string) => void }) {
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EditalPage() {
  const [singleAtestado, setSingleAtestado] = useState(false);
  const [criteria, setCriteria] = useState<CriterionEntry[]>(() => [newCriterion()]);
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [minValorStr, setMinValorStr] = useState("");
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const mode: Mode = singleAtestado ? "F4" : "F5";

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: f4Data, isLoading: f4Loading, isFetching: f4Fetching } = useQuery<BundleCoverageResult>({
    queryKey: ["qual-f4", submitted],
    queryFn: () =>
      api.post<BundleCoverageResult>("/qualification/find-bundle-single", {
        services: submitted!.services,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F4",
  });

  const { data: f5Data, isLoading: f5Loading, isFetching: f5Fetching } = useQuery<ServiceCoverage[]>({
    queryKey: ["qual-f5", submitted],
    queryFn: () =>
      api.post<ServiceCoverage[]>("/qualification/find-bundle-cumulative", {
        services: submitted!.services,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F5",
  });

  const isLoading =
    (submitted?.mode === "F4" && (f4Loading || f4Fetching)) ||
    (submitted?.mode === "F5" && (f5Loading || f5Fetching));

  // ── Criteria helpers ───────────────────────────────────────────────────────

  const updateCriterion = (id: number, field: "query" | "minQuantidade", value: string) =>
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const setProof = (id: number, proof: "unico" | "soma") =>
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, proof } : c)));

  const addCriterion = () => setCriteria((prev) => [...prev, newCriterion()]);
  const removeCriterion = (id: number) => setCriteria((prev) => prev.filter((c) => c.id !== id));

  // ── Submit ─────────────────────────────────────────────────────────────────

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

    setSubmitted({
      mode,
      services: valid.map((c) => ({
        query: c.query.trim(),
        minQuantidade: parseFloat(c.minQuantidade) || undefined,
      })),
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consulta de Capacidade Técnica</h1>
        <p className="mt-1 text-sm text-gray-500">
          Localize atestados que comprovem os requisitos técnicos exigidos no edital.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Filter card ─────────────────────────────────────────────────── */}
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

          {/* Atestado único toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              Comprovação em atestado único
              <span className="relative group inline-flex items-center">
                <Info size={13} className="text-gray-400 cursor-default" />
                <span className="absolute bottom-full right-0 mb-2 w-60 bg-gray-900 text-white text-xs rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                  Ative para buscar apenas atestados que comprovem <strong>todos</strong> os critérios de
                  uma só vez — em um único contrato ou obra.
                  <span className="absolute top-full right-3 border-4 border-transparent border-t-gray-900" />
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => setSingleAtestado((v) => !v)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors ${
                singleAtestado
                  ? "border-orange-300 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <Toggle on={singleAtestado} />
              <span className={singleAtestado ? "text-orange-700 font-medium" : "text-gray-500"}>
                {singleAtestado
                  ? "Sim — todos os critérios devem estar comprovados no mesmo atestado"
                  : "Não — aceitar critérios distribuídos entre diferentes atestados"}
              </span>
            </button>
          </div>
        </div>

        {/* ── Criteria card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Serviços e quantitativos exigidos
            </p>
            <span className="text-xs text-gray-400">
              Informe o serviço e a quantidade mínima comprovada exigida no edital
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {criteria.map((c, i) => (
              <div
                key={c.id}
                className="flex items-stretch border border-gray-200 rounded-lg bg-white"
              >
                {/* Index */}
                <div className="w-8 rounded-l-lg border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-400 flex-shrink-0 select-none">
                  {i + 1}
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Inputs row */}
                  <div className="flex items-center gap-2 p-2">
                    <ServiceAutocomplete
                      value={c.query}
                      onChange={(v) => updateCriterion(c.id, "query", v)}
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={c.minQuantidade}
                      onChange={(e) => updateCriterion(c.id, "minQuantidade", e.target.value)}
                      placeholder="Qtd. mínima"
                      className="w-28 flex-shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                    />
                  </div>

                  {/* Proof pills */}
                  <div
                    className={`flex items-center gap-2 px-2 pb-2 ${
                      singleAtestado ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <span className="text-xs text-gray-400 whitespace-nowrap">Comprovação:</span>
                    <button
                      type="button"
                      disabled={singleAtestado}
                      onClick={() => setProof(c.id, "unico")}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs transition-colors ${
                        singleAtestado || c.proof === "unico"
                          ? "border-orange-400 text-orange-700 bg-orange-50"
                          : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                      }`}
                    >
                      Atestado único
                    </button>
                    <button
                      type="button"
                      disabled={singleAtestado}
                      onClick={() => setProof(c.id, "soma")}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs transition-colors ${
                        !singleAtestado && c.proof === "soma"
                          ? "border-orange-400 text-orange-700 bg-orange-50"
                          : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                      }`}
                    >
                      Soma de atestados
                    </button>
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeCriterion(c.id)}
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
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Search size={14} />
              {isLoading ? "Buscando…" : "Buscar atestados"}
            </button>
          </div>
        </div>
      </form>

      {/* ── Results ──────────────────────────────────────────────────────── */}

      {submitted === null && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={36} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">
            Configure os filtros e critérios acima e clique em <strong>Buscar atestados</strong>.
          </p>
        </div>
      )}

      {isLoading && submitted !== null && <TableSkeleton rows={6} />}

      {/* F4: bundle único */}
      {!isLoading && submitted?.mode === "F4" && f4Data && (
        <>
          <div
            className={`mb-4 p-4 rounded-xl border ${
              f4Data.fullyQualified ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                f4Data.fullyQualified ? "text-green-700" : "text-yellow-700"
              }`}
            >
              {f4Data.fullyQualified ? "✓ Todos os critérios cobertos" : "⚠ Cobertura parcial"}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              Conjunto mínimo:{" "}
              <strong>{f4Data.minimumSet.length}</strong> atestado
              {f4Data.minimumSet.length !== 1 ? "s" : ""}
            </p>
          </div>

          {f4Data.minimumSet.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Conjunto mínimo</h3>
              <SourceTable sources={f4Data.minimumSet} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
            </div>
          )}

          {f4Data.coverageByService.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cobertura por serviço</h3>
              {f4Data.coverageByService.map((svc) => (
                <details key={svc.serviceQuery} className="mb-3 border border-gray-200 rounded-xl">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 flex items-center justify-between">
                    <span>{svc.serviceQuery}</span>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                        svc.covered ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {svc.covered ? "Coberto" : "Não coberto"}
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    {svc.resolvedDescricoes.length > 0 && (
                      <p className="text-xs text-gray-400 mb-2">
                        Descrições: {svc.resolvedDescricoes.join(", ")}
                      </p>
                    )}
                    {svc.qualifyingAtestados.length > 0 ? (
                      <SourceTable
                        sources={svc.qualifyingAtestados}
                        openingPdf={openingPdf}
                        onOpen={openAtestadoPdf}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 py-2">
                        Nenhum atestado encontrado para este serviço.
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      {/* F5: soma de atestados */}
      {!isLoading && submitted?.mode === "F5" && f5Data && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {f5Data.filter((s) => s.covered).length}/{f5Data.length} serviço
            {f5Data.length !== 1 ? "s" : ""} coberto
            {f5Data.filter((s) => s.covered).length !== 1 ? "s" : ""} pelo acervo cumulativo
          </p>
          {f5Data.map((svc) => (
            <details key={svc.serviceQuery} className="mb-3 border border-gray-200 rounded-xl">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>{svc.serviceQuery}</span>
                <div className="flex items-center gap-3">
                  {svc.totalQuantidade != null && (
                    <span className="text-xs text-gray-500">
                      Total: {svc.totalQuantidade.toLocaleString("pt-BR")}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      svc.covered ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {svc.covered ? "Coberto" : "Insuficiente"}
                  </span>
                </div>
              </summary>
              <div className="px-4 pb-4">
                {svc.resolvedDescricoes.length > 0 && (
                  <p className="text-xs text-gray-400 mb-2">
                    Descrições: {svc.resolvedDescricoes.join(", ")}
                  </p>
                )}
                {svc.qualifyingAtestados.length > 0 ? (
                  <SourceTable
                    sources={svc.qualifyingAtestados}
                    openingPdf={openingPdf}
                    onOpen={openAtestadoPdf}
                  />
                ) : (
                  <p className="text-sm text-gray-400 py-2">
                    Nenhum atestado encontrado para este serviço.
                  </p>
                )}
              </div>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
