"use client";

import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import type {
    BundleCoverageResult,
    CumulativeResult,
    QualificationFilters,
    QualificationSource,
    ResolvedDescricao,
    ServiceRequirement,
    ServicoBuscado,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Filter, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "F1" | "F2" | "F3" | "F4" | "F5";

interface ServiceEntry {
  query: string;
  minQuantidade: string;
}

interface SubmittedState {
  mode: Mode;
  descricoes: string[];
  minQuantidade: number;
  services: ServiceRequirement[];
  filters: QualificationFilters;
}

const MODE_LABELS: Record<Mode, { label: string; description: string }> = {
  F1: { label: "Com Serviço", description: "Atestados que possuem o serviço descrito" },
  F2: { label: "Qtd. Mínima", description: "Atestado com quantidade mínima em um único atestado" },
  F3: { label: "Cumulativo", description: "Somatório de atestados para atingir quantidade mínima" },
  F4: { label: "Bundle Único", description: "Conjunto mínimo de atestados cobrindo todos os serviços" },
  F5: { label: "Bundle Cumulativo", description: "Somatório por serviço para cobertura do bundle" },
};

const EMPTY_FILTERS: QualificationFilters = {
  dataInicio: undefined,
  dataFim: undefined,
  localidade: undefined,
  minValor: undefined,
};

// ─── Service autocomplete input ───────────────────────────────────────────────

function ServiceAutocomplete({
  value,
  onChange,
  placeholder = "Ex: Pavimentação asfáltica",
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
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
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
  const [mode, setMode] = useState<Mode>("F1");
  const [descricoes, setDescricoes] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [minQuantidade, setMinQuantidade] = useState("");
  const [services, setServices] = useState<ServiceEntry[]>([{ query: "", minQuantidade: "" }]);
  const [filters, setFilters] = useState<QualificationFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const isBundle = mode === "F4" || mode === "F5";
  const isSingle = mode === "F1";
  const needsQty = mode === "F2" || mode === "F3";

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data: f1Data, isLoading: f1Loading, isFetching: f1Fetching } = useQuery<QualificationSource[]>({
    queryKey: ["qual-f1", submitted],
    queryFn: () =>
      api.post<QualificationSource[]>("/qualification/find-with-service", {
        descricoes: submitted!.descricoes,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F1",
  });

  const { data: f2Data, isLoading: f2Loading, isFetching: f2Fetching } = useQuery<QualificationSource[]>({
    queryKey: ["qual-f2", submitted],
    queryFn: () =>
      api.post<QualificationSource[]>("/qualification/find-with-min-quantity", {
        descricoes: submitted!.descricoes,
        minQuantidade: submitted!.minQuantidade,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F2",
  });

  const { data: f3Data, isLoading: f3Loading, isFetching: f3Fetching } = useQuery<CumulativeResult>({
    queryKey: ["qual-f3", submitted],
    queryFn: () =>
      api.post<CumulativeResult>("/qualification/find-cumulative", {
        descricoes: submitted!.descricoes,
        minQuantidade: submitted!.minQuantidade,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F3",
  });

  const { data: f4Data, isLoading: f4Loading, isFetching: f4Fetching } = useQuery<BundleCoverageResult>({
    queryKey: ["qual-f4", submitted],
    queryFn: () =>
      api.post<BundleCoverageResult>("/qualification/find-bundle-single", {
        services: submitted!.services,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F4",
  });

  const { data: f5Data, isLoading: f5Loading, isFetching: f5Fetching } = useQuery<{ serviceQuery: string; resolvedDescricoes: string[]; qualifyingAtestados: QualificationSource[]; totalQuantidade?: number; covered: boolean }[]>({
    queryKey: ["qual-f5", submitted],
    queryFn: () =>
      api.post("/qualification/find-bundle-cumulative", {
        services: submitted!.services,
        filters: submitted!.filters,
      }).then((r) => r.data),
    enabled: submitted?.mode === "F5",
  });

  const isLoading =
    (submitted?.mode === "F1" && (f1Loading || f1Fetching)) ||
    (submitted?.mode === "F2" && (f2Loading || f2Fetching)) ||
    (submitted?.mode === "F3" && (f3Loading || f3Fetching)) ||
    (submitted?.mode === "F4" && (f4Loading || f4Fetching)) ||
    (submitted?.mode === "F5" && (f5Loading || f5Fetching));

  // ── Tag helpers (F1/F2/F3) ─────────────────────────────────────────────────

  const addTag = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed || descricoes.includes(trimmed)) return;
    setDescricoes((prev) => [...prev, trimmed]);
  }, [descricoes]);

  const removeTag = (tag: string) => setDescricoes((prev) => prev.filter((d) => d !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && tagInput === "" && descricoes.length > 0) {
      removeTag(descricoes[descricoes.length - 1]);
    }
  };

  // ── Bundle helpers (F4/F5) ─────────────────────────────────────────────────

  const updateService = (idx: number, field: keyof ServiceEntry, value: string) =>
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const addService = () => setServices((prev) => [...prev, { query: "", minQuantidade: "" }]);
  const removeService = (idx: number) => setServices((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBundle && descricoes.length === 0 && !tagInput.trim()) {
      toast.error("Informe ao menos uma descrição de serviço.");
      return;
    }
    const finalDescricoes = tagInput.trim() ? [...descricoes, tagInput.trim()] : descricoes;
    if (tagInput.trim()) {
      setDescricoes(finalDescricoes);
      setTagInput("");
    }

    const cleanFilters: QualificationFilters = {
      ...(filters.dataInicio ? { dataInicio: filters.dataInicio } : {}),
      ...(filters.dataFim ? { dataFim: filters.dataFim } : {}),
      ...(filters.localidade ? { localidade: filters.localidade } : {}),
      ...(filters.minValor ? { minValor: filters.minValor } : {}),
    };

    setSubmitted({
      mode,
      descricoes: finalDescricoes,
      minQuantidade: parseFloat(minQuantidade) || 0,
      services: services
        .filter((s) => s.query.trim())
        .map((s) => ({ query: s.query.trim(), minQuantidade: parseFloat(s.minQuantidade) || undefined })),
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
        <h1 className="text-2xl font-bold text-gray-900">Pesquisa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulta estruturada de atestados com SQL pré-definido para comprovação de capacidade técnica.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {(Object.entries(MODE_LABELS) as [Mode, { label: string; description: string }][]).map(([m, info]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setSubmitted(null); }}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border"
            style={
              mode === m
                ? { backgroundColor: "var(--primary)", color: "white", borderColor: "var(--primary)" }
                : { backgroundColor: "white", color: "#6b7280", borderColor: "#d1d5db" }
            }
          >
            <span className="font-semibold mr-1">{m}</span>{info.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-4">{MODE_LABELS[mode].description}</p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">

        {/* F1/F2/F3: tag input */}
        {!isBundle && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Descrições de serviço{" "}
              <span className="text-gray-400 font-normal">(Enter ou vírgula para adicionar)</span>
            </label>
            <div
              className="flex flex-wrap gap-1.5 min-h-[40px] px-3 py-2 border border-gray-200 rounded-lg bg-white cursor-text"
              onClick={() => document.getElementById("qual-tag-input")?.focus()}
            >
              {descricoes.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="qual-tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(""); } }}
                placeholder={descricoes.length === 0 ? "Ex: Pavimentação asfáltica" : ""}
                className="flex-1 min-w-[180px] outline-none text-sm bg-transparent"
              />
            </div>
          </div>
        )}

        {/* F2/F3: min quantity */}
        {needsQty && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade mínima</label>
              <input
                type="number"
                min={0}
                step="any"
                value={minQuantidade}
                onChange={(e) => setMinQuantidade(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
              />
            </div>
          </div>
        )}

        {/* F4/F5: bundle service list */}
        {isBundle && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              Serviços exigidos{" "}
              <span className="text-gray-400 font-normal">(um por linha; use o autocomplete para resolver)</span>
            </label>
            {services.map((svc, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1">
                  <ServiceAutocomplete
                    value={svc.query}
                    onChange={(v) => updateService(idx, "query", v)}
                    placeholder={`Serviço ${idx + 1}`}
                  />
                </div>
                <div className="w-40">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={svc.minQuantidade}
                    onChange={(e) => updateService(idx, "minQuantidade", e.target.value)}
                    placeholder="Qtd. mínima"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                  />
                </div>
                {services.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className="mt-2 text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addService}
              className="text-xs text-blue-600 hover:underline"
            >
              + Adicionar serviço
            </button>
          </div>
        )}

        {/* Optional filters toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Filter size={12} />
            {showFilters ? "Ocultar filtros opcionais" : "Mostrar filtros opcionais"}
          </button>
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início (a partir de)</label>
                <input
                  type="date"
                  value={filters.dataInicio ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dataInicio: e.target.value || undefined }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim (até)</label>
                <input
                  type="date"
                  value={filters.dataFim ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dataFim: e.target.value || undefined }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Localidade</label>
                <input
                  type="text"
                  value={filters.localidade ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, localidade: e.target.value || undefined }))}
                  placeholder="Ex: Piauí"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor mínimo (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={filters.minValor ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minValor: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="Ex: 500000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Search size={14} />
            {isLoading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>

      {/* ── Results ────────────────────────────────────────────────────────── */}

      {submitted === null && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={36} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Configure os critérios acima e clique em Buscar.</p>
        </div>
      )}

      {isLoading && submitted !== null && <TableSkeleton rows={6} />}

      {/* F1 results */}
      {!isLoading && submitted?.mode === "F1" && f1Data && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            {f1Data.length} atestado{f1Data.length !== 1 ? "s" : ""} encontrado{f1Data.length !== 1 ? "s" : ""}
          </p>
          {f1Data.length === 0
            ? <EmptyState title="Nenhum atestado encontrado" description="Tente ajustar as descrições ou filtros." />
            : <SourceTable sources={f1Data} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
          }
        </>
      )}

      {/* F2 results */}
      {!isLoading && submitted?.mode === "F2" && f2Data && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            {f2Data.length} atestado{f2Data.length !== 1 ? "s" : ""} com quantidade ≥ {submitted.minQuantidade}
          </p>
          {f2Data.length === 0
            ? <EmptyState title="Nenhum atestado encontrado" description="Nenhum atestado individual atinge a quantidade mínima exigida." />
            : <SourceTable sources={f2Data} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
          }
        </>
      )}

      {/* F3 results */}
      {!isLoading && submitted?.mode === "F3" && f3Data && (
        <>
          <div className={`mb-4 p-4 rounded-xl border ${f3Data.meetsMinimum ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <p className={`text-sm font-semibold ${f3Data.meetsMinimum ? "text-green-700" : "text-yellow-700"}`}>
              {f3Data.meetsMinimum ? "✓ Quantidade mínima atingida" : "⚠ Quantidade insuficiente"}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              Total acumulado: <strong>{f3Data.totalQuantidade.toLocaleString("pt-BR")}</strong> / exigido:{" "}
              <strong>{f3Data.minQuantidade.toLocaleString("pt-BR")}</strong>
            </p>
          </div>
          {f3Data.atestados.length === 0
            ? <EmptyState title="Nenhum atestado encontrado" description="Nenhum atestado com o serviço descrito foi localizado." />
            : <SourceTable sources={f3Data.atestados} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
          }
        </>
      )}

      {/* F4 results */}
      {!isLoading && submitted?.mode === "F4" && f4Data && (
        <>
          <div className={`mb-4 p-4 rounded-xl border ${f4Data.fullyQualified ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <p className={`text-sm font-semibold ${f4Data.fullyQualified ? "text-green-700" : "text-yellow-700"}`}>
              {f4Data.fullyQualified ? "✓ Bundle completamente coberto" : "⚠ Cobertura parcial"}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              Conjunto mínimo: <strong>{f4Data.minimumSet.length}</strong> atestado{f4Data.minimumSet.length !== 1 ? "s" : ""}
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
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${svc.covered ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {svc.covered ? "Coberto" : "Não coberto"}
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    {svc.resolvedDescricoes.length > 0 && (
                      <p className="text-xs text-gray-400 mb-2">
                        Descrições: {svc.resolvedDescricoes.join(", ")}
                      </p>
                    )}
                    {svc.qualifyingAtestados.length > 0
                      ? <SourceTable sources={svc.qualifyingAtestados} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
                      : <p className="text-sm text-gray-400 py-2">Nenhum atestado encontrado para este serviço.</p>
                    }
                  </div>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      {/* F5 results */}
      {!isLoading && submitted?.mode === "F5" && f5Data && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {f5Data.filter((s) => s.covered).length}/{f5Data.length} serviço{f5Data.length !== 1 ? "s" : ""} coberto{f5Data.filter((s) => s.covered).length !== 1 ? "s" : ""} pelo acervo cumulativo
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${svc.covered ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
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
                {svc.qualifyingAtestados.length > 0
                  ? <SourceTable sources={svc.qualifyingAtestados} openingPdf={openingPdf} onOpen={openAtestadoPdf} />
                  : <p className="text-sm text-gray-400 py-2">Nenhum atestado encontrado para este serviço.</p>
                }
              </div>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
