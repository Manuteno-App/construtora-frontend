"use client";

import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import type {
  BundleEvaluationRequest,
  BundleEvaluationResult,
  MeasurementUnit,
  ProofMode,
  QualificationFilters,
  QualificationSource,
  ResolvedDescricao,
  ServiceCoverage,
  ServiceRequirement,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Criterion = {
  id: number;
  query: string;
  minQuantidade: string;
  unidade: string;
  proofMode: ProofMode;
  maxAtestados: string;
};
const ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
const MODE_LABEL: Record<ProofMode, string> = {
  ONE: "1 atestado",
  MANY: "N atestados",
  MAX: "X atestados",
};
let nextId = 0;
const criterion = (): Criterion => ({
  id: ++nextId,
  query: "",
  minQuantidade: "",
  unidade: "",
  proofMode: "ONE",
  maxAtestados: "",
});


const format = (value?: number) =>
  value == null
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const parseDecimal = (value: string) => {
  const normalized = value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value;
  return Number(normalized);
};

function ServiceAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ResolvedDescricao) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data = [] } = useQuery<ResolvedDescricao[]>({
    queryKey: ["qualification-resolve", value],
    queryFn: () =>
      api
        .get("/qualification/resolve", { params: { q: value } })
        .then((r) => r.data),
    enabled: value.trim().length >= 3,
    staleTime: 60_000,
  });
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder="Serviço ou material executado"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
      {open && data.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {data.map((item) => (
            <li
              key={item.descricao}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-orange-50"
            >
              {item.descricao}
              {item.unidadeSugerida && (
                <span className="ml-2 text-xs text-gray-400">
                  · {item.unidadeSugerida}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data = [] } = useQuery<MeasurementUnit[]>({
    queryKey: ["active-units", value],
    queryFn: () =>
      api
        .get("/measurements/units", { params: { search: value || undefined } })
        .then((r) => r.data),
    staleTime: 60_000,
  });
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative w-full md:w-28">
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder="Unidade"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-48 w-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {data.length ? (
            data.map((unit) => (
              <li
                key={unit.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(unit.canonicalSymbol);
                  setOpen(false);
                }}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-orange-50"
              >
                <b>{unit.canonicalSymbol}</b>
                <span className="text-gray-500"> · {unit.name}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-gray-400">
              Nenhuma unidade ativa.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function coverageStatus(item: ServiceCoverage) {
  if (item.qualified)
    return { label: "Atendido", mark: "✓", tone: "ok" as const };
  if (item.failureReason === "NO_MATCHES")
    return { label: "Não atendido", mark: "×", tone: "no" as const };
  return { label: "Parcial", mark: "!", tone: "partial" as const };
}
const tone = (kind: "ok" | "partial" | "no") =>
  kind === "ok"
    ? "bg-emerald-100 text-emerald-700"
    : kind === "partial"
      ? "bg-amber-100 text-amber-800"
      : "bg-rose-100 text-rose-700";
const borderTone = (kind: "ok" | "partial" | "no") =>
  kind === "ok"
    ? "border-l-emerald-500"
    : kind === "partial"
      ? "border-l-amber-400"
      : "border-l-rose-500";

function Evidence({
  source,
  onOpen,
}: {
  source: QualificationSource;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="border-b border-gray-100 px-4 py-3 last:border-0">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1">
          <b className="text-sm text-gray-800">
            {source.obraNome || source.filename}
          </b>
          <span className="mt-0.5 block text-xs text-gray-500">
            {source.filename}
            {source.local ? ` · ${source.local}` : ""}
            {source.dataInicio ? ` · ${source.dataInicio}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpen(source.atestadoId)}
          className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:underline"
        >
          <ExternalLink size={13} /> PDF
        </button>
      </div>
      {(source.servicos ?? []).map((service, i) => (
        <div
          key={i}
          className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs"
        >
          <span className="font-medium text-gray-700">
            “{service.descricao}”
          </span>
          <span className="text-gray-600">
            {format(service.quantidade)}{" "}
            {service.unidadeOriginal ?? service.unidade}
          </span>
          {service.conversionKind && service.conversionKind !== "DIRECT" && (
            <span className="font-medium text-amber-700">
              = {format(service.quantidadeConvertida)}{" "}
              {service.unidadeComparada} · conversão
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Detail({
  item,
  requirement,
  onOpen,
}: {
  item: ServiceCoverage;
  requirement?: ServiceRequirement;
  onOpen: (id: string) => void;
}) {
  const selected = item.selectedAtestados ?? [];
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span>
          Regra: <b>{MODE_LABEL[item.proofModeApplied ?? "MANY"]}</b>
        </span>
        <span>
          Atestados usados: <b>{item.usedAtestadosCount ?? 0}</b>
        </span>
        {requirement?.minQuantidade != null && (
          <span>
            Soma:{" "}
            <b>
              {format(item.totalQuantidade)} {requirement.unidade}
            </b>{" "}
            de {format(requirement.minQuantidade)}
          </span>
        )}
      </div>
      {item.failureReason === "MAX_ATESTADOS_EXCEEDED" && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A quantidade exigida foi encontrada, mas a comprovação ultrapassa o
          limite de atestados.
        </p>
      )}
      {item.failureReason === "NO_MATCHES" && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Nenhum atestado da base contém este serviço.
        </p>
      )}
      {(selected.length > 0 || item.qualifyingAtestados.length > 0) && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {selected.length
              ? "Evidências encontradas (inclui as usadas na comprovação)"
              : "Atestados encontrados"}
          </p>
          {(item.matchingAtestados ?? item.qualifyingAtestados).map(
            (source) => (
              <Evidence
                key={source.atestadoId}
                source={source}
                onOpen={onOpen}
              />
            ),
          )}
        </section>
      )}
      {item.resolvedDescricoes.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Termos relacionados: {item.resolvedDescricoes.join(", ")}
        </p>
      )}
    </div>
  );
}

function Result({
  result,
  requirements,
  onOpen,
}: {
  result: BundleEvaluationResult;
  requirements: ServiceRequirement[];
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ok" | "partial" | "no">("all");
  const stats = useMemo(
    () =>
      result.coverageByService.reduce(
        (acc, item) => {
          acc[coverageStatus(item).tone]++;
          return acc;
        },
        { ok: 0, partial: 0, no: 0 },
      ),
    [result],
  );
  const entries = result.coverageByService.filter(
    (item) => filter === "all" || coverageStatus(item).tone === filter,
  );
  const documents = useMemo(() => {
    const list = result.selectedAtestados.length
      ? result.selectedAtestados
      : result.coverageByService.flatMap((item) => item.qualifyingAtestados);
    return Array.from(
      new Map(list.map((item) => [item.atestadoId, item])).values(),
    ).slice(0, 12);
  }, [result]);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Resultado —{" "}
            {result.bundleModeApplied === "MANY"
              ? "cada critério com seus próprios atestados"
              : "todos os critérios no mesmo conjunto"}
          </h2>
          <span className="ml-auto text-xs text-gray-400">
            {documents.length} atestados encontrados
          </span>
        </div>
      </div>
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex flex-wrap items-start gap-3">
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg font-bold ${result.fullyQualified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
          >
            {result.fullyQualified ? "✓" : "!"}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">
              {result.fullyQualified
                ? result.bundleModeApplied === "ONE"
                  ? "Um atestado atende todos os critérios"
                  : "Todos os critérios atendidos"
                : "Cobertura parcial ou fora do limite"}
            </h3>
            <p className="text-sm text-gray-500">
              {result.bundleModeApplied === "MANY"
                ? "Cada critério resolve com seus próprios atestados."
                : "A avaliação considera um conjunto comum de documentos."}
            </p>
          </div>
          <span className="text-xs text-gray-400">
            {result.usedAtestadosCount} usado(s)
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["ok", "atendidos", stats.ok],
              ["partial", "parcialmente atendidos", stats.partial],
              ["no", "não atendidos", stats.no],
            ] as const
          ).map(([kind, label, count]) => (
            <button
              key={kind}
              type="button"
              onClick={() => setFilter(filter === kind ? "all" : kind)}
              className={`rounded-xl border px-3 py-2 text-left ${filter === kind ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-200"}`}
            >
              <b
                className={
                  kind === "ok"
                    ? "text-emerald-700"
                    : kind === "partial"
                      ? "text-amber-700"
                      : "text-rose-700"
                }
              >
                {count}
              </b>
              <span className="ml-2 text-xs text-gray-500">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {result.bundleModeApplied === "MANY" && documents.length > 0 && (
        <div className="overflow-x-auto border-b border-gray-200">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[minmax(300px,1fr)_repeat(12,44px)] border-b border-gray-200 bg-gray-50 text-xs text-gray-400">
              <div className="sticky left-0 z-10 bg-gray-50 px-5 py-3 font-semibold uppercase">
                Critério
              </div>
              {documents.map((doc, i) => (
                <div
                  key={doc.atestadoId}
                  title={doc.filename}
                  className="grid place-items-center border-l border-gray-100 py-3"
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {entries.map((item, index) => {
              const state = coverageStatus(item);
              return (
                <div
                  key={item.serviceQuery}
                  className="grid grid-cols-[minmax(300px,1fr)_repeat(12,44px)] border-b border-gray-100 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(
                        expanded === item.serviceQuery
                          ? null
                          : item.serviceQuery,
                      )
                    }
                    className="sticky left-0 z-10 flex items-center gap-2 bg-white px-5 py-3 text-left hover:bg-orange-50"
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded text-xs ${tone(state.tone)}`}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-800">
                      {item.serviceQuery}
                    </span>
                  </button>
                  {documents.map((doc) => {
                    const used = (item.selectedAtestados ?? []).some(
                      (x) => x.atestadoId === doc.atestadoId,
                    );
                    const has = item.qualifyingAtestados.some(
                      (x) => x.atestadoId === doc.atestadoId,
                    );
                    return (
                      <div
                        key={doc.atestadoId}
                        className={`grid place-items-center border-l border-gray-100 text-sm ${used ? "bg-emerald-50 text-emerald-700" : has ? "bg-orange-50 text-orange-600" : "text-gray-200"}`}
                      >
                        {used ? "✓" : has ? "·" : ""}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div>
        {entries.map((item, index) => {
          const state = coverageStatus(item);
          const isOpen = expanded === item.serviceQuery;
          return (
            <article
              key={item.serviceQuery}
              className={`border-b border-l-4 ${borderTone(state.tone)} border-gray-200 last:border-b-0`}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : item.serviceQuery)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50"
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-md text-xs font-bold ${tone(state.tone)}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-gray-800">
                    {item.serviceQuery}
                  </b>
                  <small className="text-gray-500">
                    {state.label}
                    {item.totalQuantidade != null
                      ? ` · total ${format(item.totalQuantidade)}`
                      : ""}
                  </small>
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <Detail
                  item={item}
                  requirement={requirements.find(
                    (r) => r.query === item.serviceQuery,
                  )}
                  onOpen={onOpen}
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function EditalPage() {
  const [bundleMode, setBundleMode] = useState<ProofMode>("MANY");
  const [bundleMax, setBundleMax] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([criterion()]);
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [minValor, setMinValor] = useState("");
  const [submitted, setSubmitted] = useState<BundleEvaluationRequest | null>(
    null,
  );
  const { data, isLoading, isFetching } = useQuery<BundleEvaluationResult>({
    queryKey: ["qual-evaluate-bundle", submitted],
    queryFn: () =>
      api
        .post("/qualification/evaluate-bundle", submitted!)
        .then((r) => r.data),
    enabled: submitted !== null,
  });
  const busy = isLoading || isFetching;
  const update = (
    id: number,
    field: keyof Omit<Criterion, "id">,
    value: string,
  ) =>
    setCriteria((list) =>
      list.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  const remove = (id: number) =>
    setCriteria((list) =>
      list.length > 1 ? list.filter((item) => item.id !== id) : list,
    );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = criteria.filter((item) => item.query.trim());
    if (!valid.length) return toast.error("Informe ao menos um serviço.");
    if (
      bundleMode === "MAX" &&
      (!Number.isInteger(Number(bundleMax)) || Number(bundleMax) < 1)
    )
      return toast.error("Informe o limite global.");
    if (
      valid.some(
        (item) =>
          item.proofMode === "MAX" &&
          (!Number.isInteger(Number(item.maxAtestados)) ||
            Number(item.maxAtestados) < 1),
      )
    )
      return toast.error("Informe o limite de cada critério.");
    const date = periodo.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
    const localidade = [municipio.trim(), estado].filter(Boolean).join(", ");
    const filters: QualificationFilters = {
      ...(localidade ? { localidade } : {}),
      ...(date
        ? { dataInicio: `${date[1]}-01-01`, dataFim: `${date[2]}-12-31` }
        : {}),
      ...(minValor ? { minValor: Number(minValor) } : {}),
    };
    const services: ServiceRequirement[] = valid.map((item) => ({
      query: item.query.trim(),
      ...(item.minQuantidade
        ? { minQuantidade: parseDecimal(item.minQuantidade) }
        : {}),
      ...(item.unidade ? { unidade: item.unidade } : {}),
      ...(bundleMode === "MANY"
        ? {
            proofMode: item.proofMode,
            ...(item.proofMode === "MAX"
              ? { maxAtestados: Number(item.maxAtestados) }
              : {}),
          }
        : {}),
    }));
    setSubmitted({
      bundleMode,
      ...(bundleMode === "MAX" ? { maxAtestados: Number(bundleMax) } : {}),
      services,
      filters,
    });
  };
  const openPdf = async (id: string) => {
    try {
      const { data: response } = await api.get(`/atestados/${id}/signed-url`);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o PDF.");
    }
  };

  return (
    <main className="mx-auto max-w-7xl pb-16">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
          Consulta de Capacidade Técnica
        </h1>
        <p className="text-sm text-gray-500">
          Localize atestados que comprovem os requisitos técnicos exigidos no
          edital.
        </p>
      </header>
      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Filtros da pesquisa
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs text-gray-600">
              Estado
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos os estados</option>
                {ESTADOS.map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Município
              <input
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ex: São Paulo, Campinas…"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600">
              Período do atestado
              <input
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ex: 2018 – 2024"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600">
              Valor mínimo do contrato (R$)
              <input
                value={minValor}
                type="number"
                min="0"
                onChange={(e) => setMinValor(e.target.value)}
                placeholder="Ex: 500.000"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <p className="mb-2 mt-4 text-xs text-gray-600">
            Política global de comprovação
          </p>
          <div className="flex flex-wrap gap-2">
            {(["ONE", "MANY", "MAX"] as ProofMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBundleMode(mode)}
                className={`rounded-full border px-4 py-2 text-sm ${bundleMode === mode ? "border-orange-500 bg-orange-50 font-semibold text-orange-700" : "border-gray-200 text-gray-600"}`}
              >
                {MODE_LABEL[mode]}
              </button>
            ))}
            {bundleMode === "MAX" && (
              <input
                value={bundleMax}
                onChange={(e) => setBundleMax(e.target.value)}
                type="number"
                min="1"
                placeholder="Limite"
                className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            )}
          </div>
          <p className="mt-2 text-xs text-orange-700">
            {bundleMode === "MANY"
              ? "Cada critério resolve com seus próprios atestados."
              : bundleMode === "ONE"
                ? "Todos os critérios precisam ser atendidos pelo mesmo atestado."
                : "O conjunto comum precisa respeitar o limite de atestados."}
          </p>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Serviços e quantitativos exigidos
            </p>
            <span className="hidden text-xs text-gray-400 md:block">
              Informe o serviço, a quantidade mínima e a forma de comprovação
              exigida
            </span>
          </div>
          <div className="space-y-2">
            {criteria.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex gap-2 p-2">
                  <span className="grid w-7 place-items-center text-xs text-gray-400">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row">
                    <ServiceAutocomplete
                      value={item.query}
                      onChange={(value) => update(item.id, "query", value)}
                      onSelect={(suggestion) => {
                        update(item.id, "query", suggestion.descricao);
                        if (suggestion.unidadeSugerida)
                          update(
                            item.id,
                            "unidade",
                            suggestion.unidadeSugerida,
                          );
                      }}
                    />
                    <input
                      value={item.minQuantidade}
                      onChange={(e) =>
                        update(item.id, "minQuantidade", e.target.value)
                      }
                      type="text"
                      inputMode="decimal"
                      placeholder="Qtd. mínima"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm md:w-32"
                    />
                    <UnitAutocomplete
                      value={item.unidade}
                      onChange={(value) => update(item.id, "unidade", value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="grid w-8 place-items-center text-gray-400 hover:text-rose-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCriteria((list) => [...list, criterion()])}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700"
          >
            <Plus size={16} /> Adicionar critério
          </button>
          <div className="mt-4 flex justify-end">
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <Search size={16} />
              {busy ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </section>
      </form>
      <div className="mt-5">
        {busy && <TableSkeleton rows={6} />}
        {!busy && submitted === null && (
          <div className="py-16 text-center text-sm text-gray-400">
            Configure os filtros e critérios acima e clique em <b>Buscar</b>.
          </div>
        )}
        {!busy && data && (
          <Result
            result={data}
            requirements={submitted?.services ?? []}
            onOpen={openPdf}
          />
        )}
      </div>
    </main>
  );
}
