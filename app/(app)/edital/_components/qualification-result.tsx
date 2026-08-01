"use client";

import type {
  BundleEvaluationResult,
  QualificationSource,
  ServiceCoverage,
  ServiceRequirement,
} from "@/types";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  FileSearch,
  LockKeyhole,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

type Tone = "ok" | "partial" | "no";

const format = (value?: number) =>
  value == null
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });


function coverageStatus(item: ServiceCoverage) {
  if (item.failureReason === "NO_MATCHES" || item.status === "NAO_ATENDIDO")
    return { label: "Não atendido", mark: "×", tone: "no" as const };
  if (item.qualified || item.status === "ATENDIDO")
    return { label: "Atendido", mark: "✓", tone: "ok" as const };
  return {
    label: "Parcialmente atendido",
    mark: "!",
    tone: "partial" as const,
  };
}

function hasCaveat(item: ServiceCoverage) {
  return (item.matchingAtestados ?? item.qualifyingAtestados).some(
    (source) =>
      source.hasCaveat ||
      (source.servicos ?? []).some(
        (service) =>
          service.conversionKind === "TECHNICAL" ||
          service.matchConfidence === "MEDIUM",
      ),
  );
}

function criterionMessage(item: ServiceCoverage) {
  if (item.failureReason === "NO_MATCHES")
    return "serviço inexistente na base";
  if (item.failureReason === "MAX_ATESTADOS_EXCEEDED")
    return `quantidade completa, bloqueada pelo limite de ${item.maxAtestados ?? "atestados"}`;
  if (item.failureReason === "INSUFFICIENT_QUANTITY")
    return `${format(item.percentualCobertura ?? 0)}% da quantidade exigida`;
  if (hasCaveat(item)) return "atendido com ressalva";
  const used = item.usedAtestadosCount ?? 0;
  return used <= 1 ? "1 atestado basta" : `${used} atestados somados`;
}

const badgeTone = (kind: Tone) =>
  kind === "ok"
    ? "bg-emerald-100 text-emerald-700"
    : kind === "partial"
      ? "bg-amber-100 text-amber-800"
      : "bg-rose-100 text-rose-700";

const borderTone = (kind: Tone) =>
  kind === "ok"
    ? "border-l-emerald-500"
    : kind === "partial"
      ? "border-l-amber-400"
      : "border-l-rose-500";

function EvidenceCard({
  source,
  onOpen,
}: {
  source: QualificationSource;
  onOpen: (id: string, pageNumber?: number) => void;
}) {
  const used = source.selectionRole !== "AVAILABLE_UNUSED";
  const approximate = source.selectionRole === "USED_WITH_APPROXIMATION";
  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white ${used ? "border-gray-200" : "border-gray-100 opacity-60"}`}
    >
      <div className="flex">
        <span
          className={`w-1 flex-none ${approximate ? "bg-amber-400" : used ? "bg-emerald-500" : "bg-gray-200"}`}
        />
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex flex-wrap items-start gap-2">
            <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-bold text-white">
              {source.filename}
            </span>
            <span className="min-w-0 flex-1 text-xs text-gray-500">
              {source.obraNome}
              {source.local ? ` · ${source.local}` : ""}
            </span>
          </div>
          {(source.servicos ?? []).map((service, index) => (
            <div
              key={`${service.descricao}-${index}`}
              className="mt-2 grid gap-2 text-xs md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
            >
              <span className="min-w-0 font-medium text-gray-800">
                “{service.descricao}”
                {service.matchConfidence === "MEDIUM" && (
                  <small className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                    confiança média
                  </small>
                )}
              </span>
              <span className="font-semibold tabular-nums text-gray-800">
                {format(service.quantidade)} {service.unidadeOriginal ?? service.unidade}
                {service.conversionKind && service.conversionKind !== "DIRECT" && (
                  <small className="block font-normal text-amber-700">
                    = {format(service.quantidadeConvertida)} {service.unidadeComparada}
                  </small>
                )}
              </span>
              <button
                type="button"
                onClick={() => onOpen(source.atestadoId, service.pageNumber)}
                className="inline-flex items-center justify-end gap-1 font-semibold text-orange-700 hover:underline"
              >
                {service.pageNumber ? `p. ${service.pageNumber}` : "PDF"}
                {service.itemCode ? ` · item ${service.itemCode}` : ""}
                <ExternalLink size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ExplicitSum({
  item,
  requirement,
}: {
  item: ServiceCoverage;
  requirement?: ServiceRequirement;
}) {
  if (requirement?.minQuantidade == null) return null;
  const total = item.selectedTotalQuantidade ?? item.totalQuantidade ?? 0;
  const meetsQuantity = total >= requirement.minQuantidade;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
      <span>Soma de {item.usedAtestadosCount ?? 0} atestado(s):</span>
      <b className="tabular-nums">{format(total)} {requirement.unidade}</b>
      <b className={meetsQuantity ? "text-emerald-700" : "text-rose-700"}>
        {meetsQuantity ? "≥" : "<"}
      </b>
      <b className="tabular-nums">{format(requirement.minQuantidade)} {requirement.unidade}</b>
      <span
        className={`ml-auto font-bold ${item.failureReason === "MAX_ATESTADOS_EXCEEDED" ? "text-amber-700" : meetsQuantity ? "text-emerald-700" : "text-rose-700"}`}
      >
        {item.failureReason === "MAX_ATESTADOS_EXCEEDED"
          ? "BLOQUEADO PELA REGRA"
          : meetsQuantity
            ? "ATENDE"
            : `PARCIAL · ${format(item.percentualCobertura ?? 0)}%`}
      </span>
    </div>
  );
}

function Caveats({ item }: { item: ServiceCoverage }) {
  const services = (item.matchingAtestados ?? item.qualifyingAtestados).flatMap(
    (source) => (source.servicos ?? []).map((service) => ({ source, service })),
  );
  const conversion = services.find(
    ({ service }) => service.conversionKind === "TECHNICAL",
  );
  const semantic = services.find(
    ({ service }) => service.matchConfidence === "MEDIUM",
  );
  return (
    <>
      {conversion && (
        <div className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 flex-none" />
          <span>
            Conversão aproximada em <b>{conversion.source.filename}</b>: o documento registra
            {" "}<b>{conversion.service.unidadeOriginal}</b> e o critério compara em
            {" "}<b>{conversion.service.unidadeComparada}</b>. Confirme a premissa antes da habilitação.
          </span>
        </div>
      )}
      {semantic && (
        <div className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 flex-none" />
          <span>
            O casamento de “<b>{semantic.service.descricao}</b>” tem confiança média.
            Confira se a nomenclatura corresponde ao serviço exigido.
          </span>
        </div>
      )}
    </>
  );
}

function CriterionDetail({
  item,
  requirement,
  onOpen,
  onAllowLimit,
}: {
  item: ServiceCoverage;
  requirement?: ServiceRequirement;
  onOpen: (id: string, pageNumber?: number) => void;
  onAllowLimit: (item: ServiceCoverage) => void;
}) {
  const sources = item.matchingAtestados ?? item.qualifyingAtestados;
  return (
    <section className="border-t border-gray-200 bg-gray-50 px-5 py-4">
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Exigido: <b>{format(requirement?.minQuantidade)} {requirement?.unidade}</b></span>
        <span>{item.matchingAtestadosCount ?? sources.length} atestado(s) possuem o serviço</span>
      </div>
      {item.failureReason === "NO_MATCHES" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <b className="text-sm text-rose-800">Nenhum atestado da base menciona este serviço.</b>
          <p className="mt-1 text-xs text-rose-700">
            Mudar a política não altera o resultado: não existe combinação possível.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => window.location.assign("/upload")} className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white">
              <Upload size={14} /> Enviar atestado
            </button>
            <button type="button" onClick={() => document.getElementById("criteria-editor")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
              <FileSearch size={14} /> Revisar termo de busca
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <EvidenceCard key={source.atestadoId} source={source} onOpen={onOpen} />
          ))}
        </div>
      )}
      <ExplicitSum item={item} requirement={requirement} />
      <Caveats item={item} />
      {item.failureReason === "MAX_ATESTADOS_EXCEEDED" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <LockKeyhole size={15} />
          <span className="flex-1">
            A quantidade foi encontrada, mas exige <b>{item.usedAtestadosCount}</b> atestados e o limite é <b>{item.maxAtestados}</b>.
          </span>
          <button
            type="button"
            onClick={() => onAllowLimit(item)}
            className="rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white"
          >
            Permitir {item.usedAtestadosCount} atestados
          </button>
        </div>
      )}
    </section>
  );
}

function ConjunctionResult({
  result,
  requirements,
  onOpen,
  onAllowLimit,
  onUseMany,
}: {
  result: BundleEvaluationResult;
  requirements: ServiceRequirement[];
  onOpen: (id: string, pageNumber?: number) => void;
  onAllowLimit: (item: ServiceCoverage) => void;
  onUseMany: () => void;
}) {
  const [open, setOpen] = useState(false);
  const candidates = result.bundleModeApplied === "ONE"
    ? result.candidateAtestados ?? []
    : result.selectedAtestados.length
      ? result.selectedAtestados
      : [];
  const noMatches = result.coverageByService.filter(
    (item) => coverageStatus(item).tone === "no",
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-start gap-3 border-b border-l-4 px-5 py-4 text-left hover:bg-gray-50 ${result.fullyQualified ? "border-l-emerald-500" : noMatches.length ? "border-l-rose-500" : "border-l-amber-400"}`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-7 text-gray-800">
            {requirements.map((requirement, index) => (
              <span key={requirement.criterionKey ?? `${requirement.query}-${index}`} className="contents">
                {index > 0 && <b className="text-orange-600">E</b>}
                <b>{index + 1}. {requirement.query}</b>
              </span>
            ))}
          </span>
          <span className="mt-1 block text-sm text-gray-500">
            {result.bundleModeApplied === "ONE"
              ? result.conjunctionCandidateCount
                ? `${result.conjunctionCandidateCount} atestado(s) atendem todos os critérios sozinhos`
                : `Nenhum atestado atende os ${requirements.length} critérios sozinho; o melhor atende ${result.bestCandidateCoverageCount ?? 0}`
              : result.fullyQualified
                ? `O mesmo conjunto de ${result.usedAtestadosCount} atestado(s) atende todos os critérios`
                : result.exceededMaxAtestados
                  ? `A quantidade fecha com ${result.usedAtestadosCount} atestados, acima do limite de ${result.maxAtestados}`
                  : "Nenhum conjunto encontrado atende todos os critérios"}
          </span>
        </span>
        <ChevronDown size={17} className={`mt-1 flex-none text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          {noMatches.length > 0 && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <b>{noMatches.length} critério(s) não existem na base.</b>
              <span className="block text-xs">Mudar a política não cria uma combinação possível.</span>
            </div>
          )}
          {result.bundleModeApplied === "MAX" && candidates.length > 0 && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Conjunto comum selecionado
            </p>
          )}
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <article key={candidate.atestadoId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <header className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <b className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white">{candidate.filename}</b>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{candidate.obraNome}</span>
                  {result.bundleModeApplied === "ONE" && <b className="text-xs text-emerald-700">{requirements.length} de {requirements.length}</b>}
                </header>
                {result.coverageByService.map((coverage, index) => {
                  const source = (coverage.matchingAtestados ?? coverage.qualifyingAtestados)
                    .find((item) => item.atestadoId === candidate.atestadoId);
                  const service = source?.servicos?.[0];
                  return (
                    <div key={coverage.criterionKey ?? `${coverage.serviceQuery}-${index}`} className="grid gap-2 border-t border-gray-100 px-4 py-2.5 text-xs first:border-0 md:grid-cols-[24px_minmax(0,1fr)_auto_auto] md:items-center">
                      <span className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${source ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{index + 1}</span>
                      <span className="min-w-0">
                        <b className="block truncate text-gray-800">{service ? `“${service.descricao}”` : coverage.serviceQuery}</b>
                        <small className="text-gray-400">critério: {coverage.serviceQuery}</small>
                      </span>
                      <b className="tabular-nums text-gray-700">{service ? `${format(service.quantidade)} ${service.unidadeOriginal ?? service.unidade}` : "não consta"}</b>
                      {source && (
                        <button type="button" onClick={() => onOpen(source.atestadoId, service?.pageNumber)} className="text-orange-700 hover:underline">
                          {service?.pageNumber ? `p. ${service.pageNumber}` : "PDF"} {service?.itemCode ? `· item ${service.itemCode}` : ""}
                        </button>
                      )}
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
          {result.exceededMaxAtestados && result.coverageByService[0] && (
            <button type="button" onClick={() => onAllowLimit(result.coverageByService[0])} className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white">
              Permitir {result.usedAtestadosCount} atestados
            </button>
          )}
          {!result.fullyQualified && noMatches.length === 0 && result.bundleModeApplied === "ONE" && (
            <button type="button" onClick={onUseMany} className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white">
              Buscar em combinação de atestados
            </button>
          )}
        </div>
      )}
    </>
  );
}

function cellPresentation(source?: QualificationSource) {
  if (!source) return { symbol: "", className: "border border-dashed border-gray-100 bg-white", label: "não possui" };
  if (source.selectionRole === "USED_WITH_APPROXIMATION")
    return { symbol: "~", className: "border border-amber-300 bg-amber-100 text-amber-800", label: "usado com conversão aproximada" };
  if (source.selectionRole === "MEETS_ALONE")
    return { symbol: "✓", className: "bg-emerald-600 text-white", label: "atende sozinho" };
  if (source.selectionRole === "USED_IN_SUM")
    return { symbol: "✓", className: "border border-emerald-200 bg-emerald-100 text-emerald-700", label: "usado na soma" };
  return { symbol: "·", className: "bg-gray-100 text-gray-400", label: "possui, não necessário" };
}

function CoverageMatrix({
  entries,
  documents,
  expanded,
  onExpand,
}: {
  entries: ServiceCoverage[];
  documents: QualificationSource[];
  expanded: string | null;
  onExpand: (key: string) => void;
}) {
  const template = `minmax(340px, 1fr) repeat(${documents.length}, 40px)`;
  return (
    <>
      <div className="overflow-x-auto border-b border-gray-200">
        <div style={{ minWidth: 340 + documents.length * 40 }}>
          <div className="grid h-10 border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: template }}>
            <div className="sticky left-0 z-20 flex items-center border-r border-gray-200 bg-gray-50 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Critério</div>
            {documents.map((document, index) => (
              <div key={document.atestadoId} title={`${document.filename} — ${document.obraNome}`} className="grid place-items-center border-l border-gray-100 text-[11px] font-bold text-gray-500">{index + 1}</div>
            ))}
          </div>
          {entries.map((item, index) => {
            const key = item.criterionKey ?? `${item.serviceQuery}-${index}`;
            const state = coverageStatus(item);
            return (
              <div key={key} className={`grid h-14 border-b border-gray-100 last:border-0 ${expanded === key ? "bg-orange-50" : ""}`} style={{ gridTemplateColumns: template }}>
                <button type="button" onClick={() => onExpand(key)} className={`sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r border-l-4 bg-white px-3 text-left hover:bg-orange-50 ${borderTone(state.tone)} ${expanded === key ? "!bg-orange-50" : ""}`}>
                  <span className={`grid h-6 w-6 flex-none place-items-center rounded text-[11px] font-bold ${badgeTone(state.tone)}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-gray-800">{item.serviceQuery}</b>
                    <small className="block truncate text-[11px] text-gray-400">{criterionMessage(item)}</small>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeTone(state.tone)}`}>{state.label}</span>
                </button>
                {documents.map((document) => {
                  const source = (item.matchingAtestados ?? item.qualifyingAtestados).find((candidate) => candidate.atestadoId === document.atestadoId);
                  const cell = cellPresentation(source);
                  const service = source?.servicos?.[0];
                  return (
                    <button key={document.atestadoId} type="button" onClick={() => onExpand(key)} title={`${document.filename}: ${service ? `“${service.descricao}” · ${format(service.quantidade)} ${service.unidadeOriginal ?? service.unidade} (${cell.label})` : cell.label}`} className="grid place-items-center border-l border-gray-100">
                      <span className={`grid h-7 w-7 place-items-center rounded-md text-xs font-bold ${cell.className}`}>{cell.symbol}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 px-5 py-2 text-[11px] text-gray-500">
        <span><i className="mr-1 inline-grid h-5 w-5 place-items-center rounded bg-emerald-600 not-italic text-white">✓</i> atende sozinho</span>
        <span><i className="mr-1 inline-grid h-5 w-5 place-items-center rounded border border-emerald-200 bg-emerald-100 not-italic text-emerald-700">✓</i> usado na soma</span>
        <span><i className="mr-1 inline-grid h-5 w-5 place-items-center rounded border border-amber-300 bg-amber-100 not-italic text-amber-800">~</i> conversão aproximada</span>
        <span><i className="mr-1 inline-grid h-5 w-5 place-items-center rounded bg-gray-100 not-italic text-gray-400">·</i> possui, não necessário</span>
      </div>
    </>
  );
}

export function QualificationResult({
  result,
  requirements,
  onOpen,
  onAllowLimit,
  onUseMany,
}: {
  result: BundleEvaluationResult;
  requirements: ServiceRequirement[];
  onOpen: (id: string, pageNumber?: number) => void;
  onAllowLimit: (item: ServiceCoverage) => void;
  onUseMany: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCriteria, setShowCriteria] = useState(false);
  const [filter, setFilter] = useState<"all" | Tone>("all");
  const stats = useMemo(() => result.coverageByService.reduce((acc, item) => {
    acc[coverageStatus(item).tone]++;
    return acc;
  }, { ok: 0, partial: 0, no: 0 }), [result]);
  const entries = result.coverageByService.filter((item) => filter === "all" || coverageStatus(item).tone === filter);
  const documents = useMemo(() => {
    const sources = result.coverageByService.flatMap((item) => item.matchingAtestados ?? item.qualifyingAtestados);
    return Array.from(new Map(sources.map((source) => [source.atestadoId, source])).values()).slice(0, 12);
  }, [result]);
  const overallTone: Tone = result.fullyQualified ? "ok" : stats.no > 0 ? "no" : "partial";
  const headline = result.bundleModeApplied === "MANY"
    ? stats.ok === result.coverageByService.length
      ? "Todos os critérios atendidos"
      : `${stats.ok} de ${result.coverageByService.length} critérios atendidos`
    : result.bundleModeApplied === "ONE"
      ? result.conjunctionCandidateCount
        ? `${result.conjunctionCandidateCount} atestado(s) atendem todos os critérios sozinhos`
        : stats.no > 0 ? "Não atende" : `Nenhum atestado atende os ${result.coverageByService.length} sozinho`
      : result.fullyQualified
        ? `Conjunto de ${result.usedAtestadosCount} atestado(s) atende tudo`
        : result.exceededMaxAtestados
          ? "Quantidade completa, bloqueada pela regra"
          : "Nenhum conjunto atende todos os critérios";
  const subtitle = result.bundleModeApplied === "MANY"
    ? "Cada critério resolve com seus próprios atestados."
    : stats.no > 0
      ? `${stats.no} critério(s) não existem na base — nenhuma combinação resolve.`
      : result.bundleModeApplied === "ONE"
        ? `O melhor candidato atende ${result.bestCandidateCoverageCount ?? 0} de ${result.coverageByService.length} critérios.`
        : `O mesmo conjunto deve respeitar o limite global de ${result.maxAtestados} atestados.`;

  const toggleExpanded = (key: string) => setExpanded((current) => current === key ? null : key);
  const expandedItem = entries.find((item, index) => (item.criterionKey ?? `${item.serviceQuery}-${index}`) === expanded);
  const expandedRequirement = (expandedItem && requirements.find((requirement) => requirement.criterionKey === expandedItem.criterionKey))
    ?? (expandedItem ? requirements.find((requirement) => requirement.query === expandedItem.serviceQuery) : undefined);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Resultado — {result.bundleModeApplied === "MANY" ? "cada critério com seus próprios atestados" : "todos os critérios no mesmo conjunto"}
        </h2>
        <span className="ml-auto text-xs text-gray-400">
          {result.totalAtestadosBase != null ? `${format(result.totalAtestadosBase)} na base · ` : ""}
          {result.matchingAtestadosCount ?? documents.length} com algum serviço
          {result.elapsedMs != null ? ` · ${(result.elapsedMs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s` : ""}
        </span>
      </header>
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className={`grid h-8 w-8 place-items-center rounded-lg font-bold ${badgeTone(overallTone)}`}>
            {overallTone === "ok" ? "✓" : overallTone === "partial" ? "!" : "×"}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">{headline}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <button type="button" onClick={() => setShowCriteria((value) => !value)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <span className="mr-2 text-[10px]">{showCriteria ? "⌄" : "▸"}</span>
            {showCriteria ? "ocultar" : "ver"} critério a critério
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([ ["ok", "atendidos", stats.ok], ["partial", "parcialmente atendidos", stats.partial], ["no", "não atendidos", stats.no] ] as const).map(([kind, label, count]) => (
            <button key={kind} type="button" onClick={() => setFilter(filter === kind ? "all" : kind)} className={`rounded-xl border px-3 py-2 text-left ${filter === kind ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-200"}`}>
              <b className={kind === "ok" ? "text-emerald-700" : kind === "partial" ? "text-amber-700" : "text-rose-700"}>{count}</b>
              <span className="ml-2 text-xs text-gray-500">{label}</span>
            </button>
          ))}
        </div>
        {showCriteria && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            {result.coverageByService.map((item, index) => {
              const state = coverageStatus(item);
              const key = item.criterionKey ?? `${item.serviceQuery}-${index}`;
              return (
                <button key={key} type="button" onClick={() => { setExpanded(key); if (result.bundleModeApplied === "MANY") setFilter("all"); }} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-gray-50">
                  <span className={`grid h-5 w-5 place-items-center rounded text-[11px] font-bold ${badgeTone(state.tone)}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{item.serviceQuery}</span>
                  {hasCaveat(item) && state.tone === "ok" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">com ressalva</span>}
                  <span className="text-xs text-gray-400">{state.label} · {criterionMessage(item)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {result.bundleModeApplied === "MANY" ? (
        <>
          <CoverageMatrix entries={entries} documents={documents} expanded={expanded} onExpand={toggleExpanded} />
          {expandedItem ? (
            <CriterionDetail item={expandedItem} requirement={expandedRequirement} onOpen={onOpen} onAllowLimit={onAllowLimit} />
          ) : (
            <p className="px-5 py-3 text-xs text-gray-400">Clique em uma linha para ver textos, quantidades e páginas.</p>
          )}
        </>
      ) : (
        <ConjunctionResult result={result} requirements={requirements} onOpen={onOpen} onAllowLimit={onAllowLimit} onUseMany={onUseMany} />
      )}
    </section>
  );
}
