"use client";

import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import type {
  BundleEvaluationRequest,
  BundleEvaluationResult,
  MeasurementUnit,
  ProofMode,
  QualificationFilters,
  ResolvedDescricao,
  ServiceCoverage,
  ServiceRequirement,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QualificationResult } from "./_components/qualification-result";

type Criterion = {
  id: number;
  query: string;
  minQuantidade: string;
  unidade: string;
  proofMode: ProofMode;
  maxAtestados: string;
  confirmedServiceIds: string[];
  matchMode: "EXACT" | "CONTAINS";
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
  confirmedServiceIds: [],
  matchMode: "CONTAINS",
});


const parseDecimal = (value: string) => {
  const normalized = value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value;
  return Number(normalized);
};

const normalizeSearchUnits = (value: string) =>
  value.replace(/\bm([23])\b/gi, (_, exponent: string) =>
    exponent === "2" ? "m\u00B2" : "m\u00B3",
  );

function ServiceAutocomplete({
  value,
  onChange,
  onSelect,
  onMatchMode,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ResolvedDescricao) => void;
  onMatchMode: (mode: "EXACT" | "CONTAINS") => void;
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
          onChange(normalizeSearchUnits(e.target.value));
          setOpen(true);
        }}
        placeholder="Serviço ou material executado"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
      {open && value.trim().length >= 3 && (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <li
            onMouseDown={(e) => {
              e.preventDefault();
              onMatchMode("EXACT");
              setOpen(false);
            }}
            className="cursor-pointer border-b border-gray-100 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
          >
            Pesquisar exatamente: “{value.trim()}”
          </li>
          <li
            onMouseDown={(e) => {
              e.preventDefault();
              onMatchMode("CONTAINS");
              setOpen(false);
            }}
            className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50"
          >
            Pesquisar contendo: “{value.trim()}”
          </li>
          {data.map((item, index) => (
            <li
              key={`${item.descricao}-${item.matchKind}-${index}`}
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
          onChange(normalizeSearchUnits(e.target.value));
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

export default function EditalPage() {
  const [bundleMode, setBundleMode] = useState<ProofMode>("MANY");
  const [bundleMax, setBundleMax] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([criterion()]);
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [minValor, setMinValor] = useState("");
  const [extensaoKm, setExtensaoKm] = useState("");
  const [categoriaAtestado, setCategoriaAtestado] = useState("");
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
    refetchOnWindowFocus: false,
  });
  const busy = isLoading || isFetching;
  const update = (
    id: number,
    field: keyof Omit<Criterion, "id">,
    value: string | string[] | boolean,
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
    if (
      bundleMode === "MAX" &&
      (!Number.isInteger(Number(bundleMax)) || Number(bundleMax) < 1)
    )
      return toast.error("Informe o limite global.");
    if (
      bundleMode === "MANY" &&
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
      ...(extensaoKm ? { extensaoKm: parseDecimal(extensaoKm) } : {}),
      ...(categoriaAtestado ? { categoriaAtestado: categoriaAtestado as "EST" | "CIV" | "SAN" | "INS" } : {}),
    };
    if (!valid.length && !Object.keys(filters).length)
      return toast.error("Informe um serviço ou ao menos um filtro.");
    const services: ServiceRequirement[] = valid.map((item) => ({
      criterionKey: String(item.id),
      query: normalizeSearchUnits(item.query).trim(),
      matchMode: item.matchMode,
      ...(item.minQuantidade
        ? { minQuantidade: parseDecimal(item.minQuantidade) }
        : {}),
      ...(item.unidade ? { unidade: item.unidade } : {}),
      ...(item.confirmedServiceIds.length
        ? { confirmedServiceIds: item.confirmedServiceIds }
        : {}),
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
  const openPdf = async (id: string, pageNumber?: number) => {
    try {
      const { data: response } = await api.get(`/atestados/${id}/signed-url`);
      const target = pageNumber ? `${response.url}#page=${pageNumber}` : response.url;
      window.open(target, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o PDF.");
    }
  };
  const allowLimit = (item: ServiceCoverage) => {
    const count = item.usedAtestadosCount ?? 0;
    if (!submitted || count < 1) return;
    if (submitted.bundleMode === "MAX") {
      setBundleMax(String(count));
      setSubmitted({ ...submitted, maxAtestados: count });
      return;
    }
    const key = item.criterionKey;
    setCriteria((list) => list.map((criterionItem) =>
      String(criterionItem.id) === key
        ? { ...criterionItem, proofMode: "MAX", maxAtestados: String(count) }
        : criterionItem,
    ));
    setSubmitted({
      ...submitted,
      services: submitted.services.map((service) =>
        service.criterionKey === key
          ? { ...service, proofMode: "MAX", maxAtestados: count }
          : service,
      ),
    });
  };

  const useMany = () => {
    if (!submitted) return;
    setBundleMode("MANY");
    setCriteria((list) => list.map((item) => ({ ...item, proofMode: "MANY" })));
    setSubmitted({
      bundleMode: "MANY",
      services: submitted.services.map((service) => ({ ...service, proofMode: "MANY", maxAtestados: undefined })),
      filters: submitted.filters,
    });
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
          <div className="grid gap-3 md:grid-cols-5">
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
            <label className="text-xs text-gray-600">
              Extensão da obra (km)
              <input
                value={extensaoKm}
                type="number"
                min="0"
                step="0.001"
                onChange={(e) => setExtensaoKm(e.target.value)}
                placeholder="Ex: 12,5"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="mb-4 block max-w-xs text-xs text-gray-600">
            Tipo de atestado
            <select value={categoriaAtestado} onChange={(e) => setCategoriaAtestado(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">Todos os tipos</option>
              <option value="EST">EST - Estrada</option>
              <option value="CIV">CIV - Civil</option>
              <option value="SAN">SAN - Saneamento</option>
              <option value="INS">INS - Instalação</option>
            </select>
          </label>          <p className="mb-2 mt-4 text-xs text-gray-600">
            Política global de comprovação
          </p>
          <div className="flex flex-wrap gap-2">
            {(["ONE", "MANY", "MAX"] as ProofMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setBundleMode(mode);
                  setSubmitted(null);
                }}
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
        <section id="criteria-editor" className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Serviços e quantitativos exigidos
            </p>
            <span className="hidden text-xs text-gray-400 md:block">
              Serviço é opcional quando a busca for somente por filtros
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Deixe o serviço em branco para listar todos os atestados que atendem aos filtros acima.
          </p>
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
                      onMatchMode={(mode) => update(item.id, "matchMode", mode)}
                      onChange={(value) => {
                        update(item.id, "query", value);
                        update(item.id, "confirmedServiceIds", []);
                      }}
                      onSelect={(suggestion) => {
                        if (suggestion.matchKind === "EXACT") {
                          update(item.id, "query", suggestion.descricao);
                          update(item.id, "confirmedServiceIds", []);
                        } else {
                          update(item.id, "query", suggestion.descricao);
                          update(item.id, "confirmedServiceIds", []);
                          update(item.id, "matchMode", "CONTAINS");
                        }
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
                {bundleMode === "MANY" && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-3 py-2 pl-11">
                    <span className="mr-1 text-[11px] text-gray-400">Regra deste critério:</span>
                    {(["ONE", "MANY", "MAX"] as ProofMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => update(item.id, "proofMode", mode)}
                        className={`rounded-full border px-3 py-1 text-[11px] ${item.proofMode === mode ? "border-orange-400 bg-orange-50 font-semibold text-orange-700" : "border-gray-200 text-gray-500"}`}
                      >
                        {MODE_LABEL[mode]}
                      </button>
                    ))}
                    {item.proofMode === "MAX" && (
                      <input
                        value={item.maxAtestados}
                        onChange={(event) => update(item.id, "maxAtestados", event.target.value)}
                        type="number"
                        min="1"
                        aria-label={`Limite de atestados do critério ${index + 1}`}
                        placeholder="Limite"
                        className="w-24 rounded-lg border border-gray-200 px-3 py-1 text-xs"
                      />
                    )}
                  </div>
                )}
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
          <QualificationResult
            result={data}
            requirements={submitted?.services ?? []}
            onOpen={openPdf}
            onAllowLimit={allowLimit}
            onUseMany={useMany}
          />
        )}
      </div>
    </main>
  );
}
