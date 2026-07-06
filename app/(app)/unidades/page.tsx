"use client";

import { EmptyState } from "@/components/empty-state";
import { Skeleton, TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type {
  MathematicalConversion,
  MeasurementUnit,
  TechnicalConversion,
  TechnicalConversionStatus,
  UnitFamily,
  UnitOrigin,
  UnitStatus,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Filter,
  Pencil,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "units" | "math" | "technical";

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "units", label: "Unidades", hint: "Cadastro e revisão de símbolos aprendidos" },
  { id: "math", label: "Conversões matemáticas", hint: "Regras universais e exatas" },
  { id: "technical", label: "Conversões técnicas", hint: "Sugestões dependentes de serviço ou material" },
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

function parseAliases(raw: string | undefined) {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", tone)}>
      {children}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        tone === "accent" ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white",
      )}
    >
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", tone === "accent" ? "text-orange-700" : "text-gray-900")}>
        {value}
      </p>
    </div>
  );
}

function formatEvidence(evidence?: Record<string, unknown>) {
  const samples = Array.isArray(evidence?.samples) ? (evidence?.samples as Array<Record<string, unknown>>) : [];
  const heuristic = typeof evidence?.heuristic === "string" ? evidence.heuristic : null;

  return {
    heuristic,
    samples: samples.map((sample) => ({
      unitSymbol: String(sample.unitSymbol ?? "—"),
      familyName: String(sample.familyName ?? "—"),
      sampleCount: Number(sample.sampleCount ?? 0),
      avgQuantity: Number(sample.avgQuantity ?? 0),
    })),
  };
}

export default function UnidadesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("units");
  const [unitSearch, setUnitSearch] = useState("");
  const [unitFamilyId, setUnitFamilyId] = useState("");
  const [unitStatus, setUnitStatus] = useState<UnitStatus | "">("");
  const [unitOrigin, setUnitOrigin] = useState<UnitOrigin | "">("");
  const [technicalStatus, setTechnicalStatus] = useState<TechnicalConversionStatus | "">("");
  const [editingUnit, setEditingUnit] = useState<MeasurementUnit | null>(null);
  const [editingMath, setEditingMath] = useState<MathematicalConversion | null>(null);
  const [editingTech, setEditingTech] = useState<TechnicalConversion | null>(null);

  const [unitForm, setUnitForm] = useState({
    name: "",
    canonicalSymbol: "",
    aliases: "",
    familyId: "",
    status: "ACTIVE" as UnitStatus,
    origin: "USER" as UnitOrigin,
  });
  const [mathForm, setMathForm] = useState({
    sourceUnitId: "",
    targetUnitId: "",
    factor: "",
    ruleOrigin: "USER" as UnitOrigin,
    isActive: true,
  });
  const [techForm, setTechForm] = useState({
    serviceDescription: "",
    sourceUnitId: "",
    targetUnitId: "",
    factor: "",
    ruleOrigin: "USER" as UnitOrigin,
    status: "PENDING" as TechnicalConversionStatus,
  });

  const { data: families, isLoading: familiesLoading } = useQuery<UnitFamily[]>({
    queryKey: ["measurement-families"],
    queryFn: () => api.get("/measurement-admin/families").then((r) => r.data),
  });

  const { data: units, isLoading: unitsLoading, isFetching: unitsFetching } = useQuery<MeasurementUnit[]>({
    queryKey: ["measurement-units", unitSearch, unitFamilyId, unitStatus, unitOrigin],
    queryFn: () =>
      api.get("/measurement-admin/units", {
        params: {
          search: unitSearch || undefined,
          familyId: unitFamilyId || undefined,
          status: unitStatus || undefined,
          origin: unitOrigin || undefined,
        },
      }).then((r) => r.data),
  });

  const { data: mathConversions, isLoading: mathLoading } = useQuery<MathematicalConversion[]>({
    queryKey: ["measurement-math-conversions"],
    queryFn: () => api.get("/measurement-admin/conversions").then((r) => r.data),
  });

  const { data: technicalConversions, isLoading: techLoading, isFetching: techFetching } = useQuery<TechnicalConversion[]>({
    queryKey: ["measurement-technical-conversions", technicalStatus],
    queryFn: () =>
      api
        .get("/measurement-admin/technical-conversions", {
          params: { status: technicalStatus || undefined },
        })
        .then((r) => r.data),
  });

  const unitOptions = useMemo(
    () => (units ?? []).map((unit) => ({ value: unit.id, label: `${unit.canonicalSymbol} · ${unit.name}` })),
    [units],
  );

  const pendingTechnicalCount = useMemo(
    () => (technicalConversions ?? []).filter((item) => item.status === "PENDING").length,
    [technicalConversions],
  );

  const activeUnitCount = useMemo(
    () => (units ?? []).filter((item) => item.status === "ACTIVE").length,
    [units],
  );

  const resetUnitForm = () => {
    setEditingUnit(null);
    setUnitForm({
      name: "",
      canonicalSymbol: "",
      aliases: "",
      familyId: "",
      status: "ACTIVE",
      origin: "USER",
    });
  };

  const resetMathForm = () => {
    setEditingMath(null);
    setMathForm({
      sourceUnitId: "",
      targetUnitId: "",
      factor: "",
      ruleOrigin: "USER",
      isActive: true,
    });
  };

  const resetTechForm = () => {
    setEditingTech(null);
    setTechForm({
      serviceDescription: "",
      sourceUnitId: "",
      targetUnitId: "",
      factor: "",
      ruleOrigin: "USER",
      status: "PENDING",
    });
  };

  const saveUnit = useMutation({
    mutationFn: async () => {
      const payload = {
        ...unitForm,
        aliases: unitForm.aliases.split(",").map((value) => value.trim()).filter(Boolean),
      };
      if (editingUnit) return api.patch(`/measurement-admin/units/${editingUnit.id}`, payload);
      return api.post("/measurement-admin/units", payload);
    },
    onSuccess: () => {
      toast.success("Unidade salva.");
      resetUnitForm();
      queryClient.invalidateQueries({ queryKey: ["measurement-units"] });
    },
    onError: () => toast.error("Não foi possível salvar a unidade."),
  });

  const deleteUnit = useMutation({
    mutationFn: async (unit: MeasurementUnit) => api.delete(`/measurement-admin/units/${unit.id}`),
    onSuccess: (_, unit) => {
      toast.success(`Unidade ${unit.canonicalSymbol} excluída.`);
      if (editingUnit?.id === unit.id) resetUnitForm();
      queryClient.invalidateQueries({ queryKey: ["measurement-units"] });
      queryClient.invalidateQueries({ queryKey: ["measurement-math-conversions"] });
      queryClient.invalidateQueries({ queryKey: ["measurement-technical-conversions"] });
    },
    onError: () => toast.error("Não foi possível excluir a unidade."),
  });

  const saveMath = useMutation({
    mutationFn: async () => {
      const payload = {
        ...mathForm,
        factor: parseFloat(mathForm.factor),
        ruleOrigin: mathForm.ruleOrigin,
      };
      if (editingMath) return api.patch(`/measurement-admin/conversions/${editingMath.id}`, payload);
      return api.post("/measurement-admin/conversions", payload);
    },
    onSuccess: () => {
      toast.success("Conversão matemática salva.");
      resetMathForm();
      queryClient.invalidateQueries({ queryKey: ["measurement-math-conversions"] });
    },
    onError: () => toast.error("Não foi possível salvar a conversão matemática."),
  });

  const saveTech = useMutation({
    mutationFn: async () => {
      const payload = {
        ...techForm,
        factor: parseFloat(techForm.factor),
        evidence: editingTech?.evidence ?? {},
      };
      if (editingTech) return api.patch(`/measurement-admin/technical-conversions/${editingTech.id}`, payload);
      return api.post("/measurement-admin/technical-conversions", payload);
    },
    onSuccess: () => {
      toast.success("Conversão técnica salva.");
      resetTechForm();
      queryClient.invalidateQueries({ queryKey: ["measurement-technical-conversions"] });
    },
    onError: () => toast.error("Não foi possível salvar a conversão técnica."),
  });

  const updateTechStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TechnicalConversionStatus }) =>
      api.patch(`/measurement-admin/technical-conversions/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      queryClient.invalidateQueries({ queryKey: ["measurement-technical-conversions"] });
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  const beginEditUnit = (unit: MeasurementUnit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      canonicalSymbol: unit.canonicalSymbol,
      aliases: parseAliases(unit.aliasesJson).join(", "),
      familyId: unit.familyId,
      status: unit.status,
      origin: unit.origin,
    });
  };

  const beginEditMath = (conversion: MathematicalConversion) => {
    setEditingMath(conversion);
    setMathForm({
      sourceUnitId: conversion.sourceUnitId,
      targetUnitId: conversion.targetUnitId,
      factor: String(conversion.factor),
      ruleOrigin: conversion.ruleOrigin,
      isActive: conversion.isActive,
    });
  };

  const beginEditTech = (conversion: TechnicalConversion) => {
    setEditingTech(conversion);
    setTechForm({
      serviceDescription: conversion.serviceDescription,
      sourceUnitId: conversion.sourceUnitId,
      targetUnitId: conversion.targetUnitId,
      factor: String(conversion.factor),
      ruleOrigin: conversion.ruleOrigin,
      status: conversion.status,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.14),_transparent_40%),linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Governanca de Medidas</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Unidades e conversões</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Revise unidades aprendidas automaticamente, mantenha regras matemáticas exatas e aprove apenas
              conversões técnicas que façam sentido para o seu contexto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[420px]">
            <StatCard label="Unidades ativas" value={familiesLoading ? "..." : String(activeUnitCount)} />
            <StatCard label="Pendências técnicas" value={String(pendingTechnicalCount)} tone="accent" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              tab === item.id
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700",
            )}
          >
            <span className="font-medium">{item.label}</span>
            <span className="ml-2 hidden text-xs opacity-70 md:inline">{item.hint}</span>
          </button>
        ))}
      </div>

      {tab === "units" && (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.95fr]">
          <SectionCard
            title={editingUnit ? "Editar unidade" : "Nova unidade"}
            subtitle="Use esta área para corrigir símbolos, aliases e família de unidades aprendidas pelo sistema."
          >
            <div className="space-y-4">
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="Nome"
                value={unitForm.name}
                onChange={(e) => setUnitForm((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono"
                placeholder="Símbolo canônico"
                value={unitForm.canonicalSymbol}
                onChange={(e) => setUnitForm((s) => ({ ...s, canonicalSymbol: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="Aliases separados por vírgula"
                value={unitForm.aliases}
                onChange={(e) => setUnitForm((s) => ({ ...s, aliases: e.target.value }))}
              />
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={unitForm.familyId}
                onChange={(e) => setUnitForm((s) => ({ ...s, familyId: e.target.value }))}
              >
                <option value="">Selecione a família</option>
                {families?.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={unitForm.status}
                  onChange={(e) => setUnitForm((s) => ({ ...s, status: e.target.value as UnitStatus }))}
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="INACTIVE">Inativa</option>
                </select>
                <select
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={unitForm.origin}
                  onChange={(e) => setUnitForm((s) => ({ ...s, origin: e.target.value as UnitOrigin }))}
                >
                  <option value="USER">Usuário</option>
                  <option value="AI">IA</option>
                  <option value="SYSTEM">Sistema</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => saveUnit.mutate()}
                  disabled={saveUnit.isPending}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saveUnit.isPending ? "Salvando..." : editingUnit ? "Salvar alterações" : "Criar unidade"}
                </button>
                {editingUnit && (
                  <button
                    onClick={resetUnitForm}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Cadastro atual"
            subtitle="Filtre por família, status e origem para revisar rapidamente o que foi criado pelo sistema, pela IA ou por usuários."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-3 text-gray-300" size={16} />
                <input
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm"
                  placeholder="Buscar por nome ou símbolo"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={unitFamilyId}
                onChange={(e) => setUnitFamilyId(e.target.value)}
              >
                <option value="">Todas as famílias</option>
                {families?.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={unitStatus}
                onChange={(e) => setUnitStatus(e.target.value as UnitStatus | "")}
              >
                <option value="">Todos os status</option>
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={unitOrigin}
                onChange={(e) => setUnitOrigin(e.target.value as UnitOrigin | "")}
              >
                <option value="">Todas as origens</option>
                <option value="SYSTEM">Sistema</option>
                <option value="AI">IA</option>
                <option value="USER">Usuário</option>
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
              <div className="inline-flex items-center gap-2">
                <Filter size={12} />
                {unitsFetching ? "Atualizando filtros..." : `${units?.length ?? 0} unidade(s) encontrada(s)`}
              </div>
              <button
                onClick={() => {
                  setUnitSearch("");
                  setUnitFamilyId("");
                  setUnitStatus("");
                  setUnitOrigin("");
                }}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
              >
                <RotateCcw size={12} />
                Limpar filtros
              </button>
            </div>

            <div className="mt-4">
              {unitsLoading && <TableSkeleton rows={6} />}
              {!unitsLoading && !units?.length && (
                <EmptyState
                  title="Nenhuma unidade encontrada"
                  description="Ajuste os filtros ou crie uma nova unidade manualmente."
                />
              )}
              {!unitsLoading && units && units.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-3">Símbolo</th>
                        <th className="py-3">Nome e aliases</th>
                        <th className="py-3">Família</th>
                        <th className="py-3">Origem</th>
                        <th className="py-3">Status</th>
                        <th className="py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit) => (
                        <tr key={unit.id} className="border-b border-gray-50 align-top">
                          <td className="py-4">
                            <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-gray-800">
                              {unit.canonicalSymbol}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="font-medium text-gray-800">{unit.name}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {parseAliases(unit.aliasesJson).length > 0 ? (
                                parseAliases(unit.aliasesJson).map((alias) => (
                                  <span key={alias} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                    {alias}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">Sem aliases</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 text-gray-600">{unit.family?.name ?? "—"}</td>
                          <td className="py-4">
                            <Badge tone="bg-sky-50 text-sky-700 border-sky-200">{unit.origin}</Badge>
                          </td>
                          <td className="py-4">
                            <Badge tone={STATUS_STYLES[unit.status] ?? STATUS_STYLES.ACTIVE}>{unit.status}</Badge>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => beginEditUnit(unit)}
                                className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                              >
                                <Pencil size={14} />
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Excluir a unidade ${unit.canonicalSymbol}? Esta ação remove a unidade e as conversões técnicas/matemáticas vinculadas.`,
                                  );
                                  if (!confirmed) return;
                                  deleteUnit.mutate(unit);
                                }}
                                disabled={deleteUnit.isPending}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                {deleteUnit.isPending ? "Excluindo..." : "Excluir"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "math" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <SectionCard
            title={editingMath ? "Editar conversão" : "Nova conversão"}
            subtitle="Cadastre relações exatas entre unidades da mesma família. Essas regras entram em vigor automaticamente."
          >
            <div className="space-y-4">
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={mathForm.sourceUnitId}
                onChange={(e) => setMathForm((s) => ({ ...s, sourceUnitId: e.target.value }))}
              >
                <option value="">Unidade origem</option>
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={mathForm.targetUnitId}
                onChange={(e) => setMathForm((s) => ({ ...s, targetUnitId: e.target.value }))}
              >
                <option value="">Unidade destino</option>
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono"
                placeholder="Fator"
                value={mathForm.factor}
                onChange={(e) => setMathForm((s) => ({ ...s, factor: e.target.value }))}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => saveMath.mutate()}
                  disabled={saveMath.isPending}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saveMath.isPending ? "Salvando..." : editingMath ? "Salvar alterações" : "Criar conversão"}
                </button>
                {editingMath && (
                  <button
                    onClick={resetMathForm}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Regras matemáticas"
            subtitle="Estas conversões são independentes de serviço e podem ser aplicadas sem revisão humana."
          >
            {mathLoading && <TableSkeleton rows={6} />}
            {!mathLoading && !mathConversions?.length && (
              <EmptyState
                title="Nenhuma conversão cadastrada"
                description="Cadastre regras matemáticas exatas entre unidades da mesma família."
              />
            )}
            {!mathLoading && mathConversions && mathConversions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-3">Origem</th>
                      <th className="py-3">Destino</th>
                      <th className="py-3">Fator</th>
                      <th className="py-3">Origem da regra</th>
                      <th className="py-3">Ativa</th>
                      <th className="py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {mathConversions.map((conversion) => (
                      <tr key={conversion.id} className="border-b border-gray-50">
                        <td className="py-4 font-medium text-gray-800">
                          {conversion.sourceUnit?.canonicalSymbol ?? conversion.sourceUnitId}
                        </td>
                        <td className="py-4 font-medium text-gray-800">
                          {conversion.targetUnit?.canonicalSymbol ?? conversion.targetUnitId}
                        </td>
                        <td className="py-4 font-mono text-gray-700">{formatNumber(conversion.factor, 4)}</td>
                        <td className="py-4">
                          <Badge tone="bg-sky-50 text-sky-700 border-sky-200">{conversion.ruleOrigin}</Badge>
                        </td>
                        <td className="py-4">
                          <Badge tone={conversion.isActive ? STATUS_STYLES.ACTIVE : STATUS_STYLES.INACTIVE}>
                            {conversion.isActive ? "ATIVA" : "INATIVA"}
                          </Badge>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => beginEditMath(conversion)}
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "technical" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <SectionCard
            title={editingTech ? "Editar conversão técnica" : "Nova conversão técnica"}
            subtitle="Use com cuidado: essas regras dependem do material ou serviço e só devem ser aprovadas após revisão."
          >
            <div className="space-y-4">
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="Serviço ou material"
                value={techForm.serviceDescription}
                onChange={(e) => setTechForm((s) => ({ ...s, serviceDescription: e.target.value }))}
              />
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={techForm.sourceUnitId}
                onChange={(e) => setTechForm((s) => ({ ...s, sourceUnitId: e.target.value }))}
              >
                <option value="">Unidade origem</option>
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={techForm.targetUnitId}
                onChange={(e) => setTechForm((s) => ({ ...s, targetUnitId: e.target.value }))}
              >
                <option value="">Unidade destino</option>
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono"
                placeholder="Fator"
                value={techForm.factor}
                onChange={(e) => setTechForm((s) => ({ ...s, factor: e.target.value }))}
              />
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={techForm.status}
                onChange={(e) => setTechForm((s) => ({ ...s, status: e.target.value as TechnicalConversionStatus }))}
              >
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovada</option>
                <option value="REJECTED">Rejeitada</option>
                <option value="INACTIVE">Inativa</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => saveTech.mutate()}
                  disabled={saveTech.isPending}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saveTech.isPending ? "Salvando..." : editingTech ? "Salvar alterações" : "Criar conversão"}
                </button>
                {editingTech && (
                  <button
                    onClick={resetTechForm}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Sugestões e histórico técnico"
            subtitle="Aprove apenas regras com evidência consistente. As sugestões da IA ficam sinalizadas e detalhadas abaixo."
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                <Sparkles size={12} />
                {techFetching ? "Atualizando sugestões..." : `${technicalConversions?.length ?? 0} registro(s) listado(s)`}
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={technicalStatus}
                  onChange={(e) => setTechnicalStatus(e.target.value as TechnicalConversionStatus | "")}
                >
                  <option value="">Todos os status</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="APPROVED">Aprovadas</option>
                  <option value="REJECTED">Rejeitadas</option>
                  <option value="INACTIVE">Inativas</option>
                </select>
                <button
                  onClick={() => setTechnicalStatus("")}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw size={14} />
                  Limpar
                </button>
              </div>
            </div>

            <div className="mt-4">
              {techLoading && <TableSkeleton rows={6} />}
              {!techLoading && !technicalConversions?.length && (
                <EmptyState
                  title="Nenhuma conversão técnica encontrada"
                  description="As sugestões automáticas da IA aparecerão aqui para revisão e aprovação."
                />
              )}
              {!techLoading && technicalConversions && technicalConversions.length > 0 && (
                <div className="space-y-4">
                  {technicalConversions.map((conversion) => {
                    const evidence = formatEvidence(conversion.evidence);
                    return (
                      <article
                        key={conversion.id}
                        className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-gray-800">{conversion.serviceDescription}</h3>
                              <Badge tone={STATUS_STYLES[conversion.status] ?? STATUS_STYLES.PENDING}>
                                {conversion.status}
                              </Badge>
                              <Badge tone="bg-sky-50 text-sky-700 border-sky-200">{conversion.ruleOrigin}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                              <span className="font-medium text-gray-800">
                                {conversion.sourceUnit?.canonicalSymbol ?? conversion.sourceUnitId}
                              </span>{" "}
                              para{" "}
                              <span className="font-medium text-gray-800">
                                {conversion.targetUnit?.canonicalSymbol ?? conversion.targetUnitId}
                              </span>
                              {" · "}fator <span className="font-mono">{formatNumber(conversion.factor, 4)}</span>
                            </p>
                            {evidence.heuristic && (
                              <p className="mt-2 text-xs text-gray-400">Heurística usada: {evidence.heuristic}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => beginEditTech(conversion)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              onClick={() => updateTechStatus.mutate({ id: conversion.id, status: "APPROVED" })}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
                            >
                              <Check size={14} />
                              Aprovar
                            </button>
                            <button
                              onClick={() => updateTechStatus.mutate({ id: conversion.id, status: "REJECTED" })}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-sm text-rose-700"
                            >
                              <X size={14} />
                              Rejeitar
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Evidências</p>
                          {evidence.samples.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">Nenhuma evidência estruturada disponível.</p>
                          ) : (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {evidence.samples.map((sample, index) => (
                                <div key={`${conversion.id}-${sample.unitSymbol}-${index}`} className="rounded-xl bg-gray-50 p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm font-medium text-gray-800">{sample.unitSymbol}</span>
                                    <span className="text-xs text-gray-400">{sample.familyName}</span>
                                  </div>
                                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                                    <p>{sample.sampleCount} amostra(s)</p>
                                    <p>Média observada: {formatNumber(sample.avgQuantity, 2)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {(familiesLoading || unitsLoading) && false && <Skeleton className="h-10 w-full" />}
    </div>
  );
}
