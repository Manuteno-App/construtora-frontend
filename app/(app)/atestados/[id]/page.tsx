"use client";

import { EmptyState } from "@/components/empty-state";
import { Skeleton, TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import api from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Atestado, MeasurementUnit, Obra, ServicoExecutado } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  Hash,
  MapPin,
  RefreshCw, Pencil, Plus, Check, X, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Tab = "entidades" | "servicos" | "info";

type ServicoDraft = { codigo: string; descricao: string; categoria: string; quantidade: string; unidade: string };
const emptyServicoDraft: ServicoDraft = { codigo: "", descricao: "", categoria: "", quantidade: "", unidade: "" };

export default function AtestadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("entidades");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [openingPdf, setOpeningPdf] = useState(false);
  const [editingServicoId, setEditingServicoId] = useState<string | null>(null);
  const [servicoDraft, setServicoDraft] = useState<ServicoDraft>(emptyServicoDraft);
  const [showReindexWarning, setShowReindexWarning] = useState(false);

  const openPdf = async () => {
    setOpeningPdf(true);
    try {
      const { data } = await api.get<{ url: string }>(`/atestados/${id}/signed-url`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o PDF.");
    } finally {
      setOpeningPdf(false);
    }
  };

  const { data: atestado, isLoading: loadingAtestado } = useQuery<Atestado>({
    queryKey: ["atestado", id],
    queryFn: () => api.get(`/atestados/${id}`).then((r) => r.data),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "PENDING" || status === "PROCESSING" ? 3_000 : false;
    },
  });

  const { data: obras, isLoading: loadingObras } = useQuery<Obra[]>({
    queryKey: ["entidades", id],
    queryFn: () => api.get(`/extraction/${id}/entities`).then((r) => r.data),
    enabled: tab === "entidades" && !!atestado && atestado.status === "DONE",
  });

  const { data: servicos, isLoading: loadingServicos } = useQuery<ServicoExecutado[]>({
    queryKey: ["servicos", id, categoriaFilter],
    queryFn: () =>
      api
        .get(`/extraction/${id}/servicos`, {
          params: categoriaFilter ? { categoria: categoriaFilter } : {},
        })
        .then((r) => r.data),
    enabled: !!atestado && atestado.status === "DONE",
  });

  const { data: unidades = [] } = useQuery<MeasurementUnit[]>({
    queryKey: ["measurement-units", "active"],
    queryFn: () => api.get("/measurement-admin/units", { params: { status: "ACTIVE" } }).then((response) => response.data),
    enabled: tab === "servicos",
  });

  const reindexMutation = useMutation({
    mutationFn: () => api.post(`/ingestion/${id}/reindex`),
    onSuccess: () => {
      toast.success("Reprocessamento iniciado.");
      queryClient.invalidateQueries({ queryKey: ["atestado", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hasManualChanges = servicos?.some((service) => service.manualOverride) ?? false;

  const requestReindex = () => {
    if (hasManualChanges) { setShowReindexWarning(true); return; }
    reindexMutation.mutate();
  };

  const confirmReindex = () => {
    setShowReindexWarning(false);
    reindexMutation.mutate();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "entidades", label: "Entidades Extraídas" },
    { key: "servicos", label: "Serviços Executados" },
    { key: "info", label: "Informações" },
  ];

  const saveServicoMutation = useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId?: string; payload: Omit<ServicoExecutado, "id" | "atestadoId"> }) =>
      serviceId
        ? api.patch(`/atestados/${id}/servicos/${serviceId}`, payload)
        : api.post(`/atestados/${id}/servicos`, payload),
    onSuccess: () => {
      toast.success("Linha salva.");
      queryClient.invalidateQueries({ queryKey: ["servicos", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const beginServicoEdit = (service?: ServicoExecutado) => {
    setEditingServicoId(service?.id ?? "new");
    setServicoDraft(service ? { codigo: service.codigo ?? "", descricao: service.descricao, categoria: service.categoria ?? "", quantidade: service.quantidade?.toString() ?? "", unidade: service.unidade ?? "" } : emptyServicoDraft);
  };
  const cancelServicoEdit = () => { setEditingServicoId(null); setServicoDraft(emptyServicoDraft); };
  const updateServicoDraft = (field: keyof ServicoDraft, value: string) => setServicoDraft((current) => ({ ...current, [field]: value }));
  const saveServicoEdit = () => {
    if (!servicoDraft.descricao.trim()) { toast.error("Informe a descrição do serviço."); return; }
    const quantidade = servicoDraft.quantidade.trim() ? Number(servicoDraft.quantidade.replace(",", ".")) : undefined;
    if (quantidade !== undefined && (!Number.isFinite(quantidade) || quantidade < 0)) { toast.error("Informe uma quantidade válida."); return; }
    saveServicoMutation.mutate({ serviceId: editingServicoId === "new" ? undefined : editingServicoId ?? undefined, payload: { descricao: servicoDraft.descricao.trim(), codigo: servicoDraft.codigo.trim() || undefined, categoria: servicoDraft.categoria.trim() || undefined, quantidade, unidade: servicoDraft.unidade.trim() || undefined } }, { onSuccess: cancelServicoEdit });
  };


  // Unique categories from servicos
  const categories = servicos
    ? [...new Set(servicos.map((s) => s.categoria).filter(Boolean))]
    : [];

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href="/atestados"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={14} /> Voltar para atestados
        </Link>

        {loadingAtestado ? (
          <Skeleton className="h-7 w-80 mb-2" />
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {atestado?.originalFilename}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {atestado && <StatusBadge status={atestado.status} />}
                {atestado?.createdAt && (
                  <span className="text-xs text-gray-400">
                    Enviado em {formatDate(atestado.createdAt)}
                  </span>
                )}
              </div>
              {atestado?.errorMessage && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {atestado.errorMessage}
                </p>
              )}
            </div>
            <button
              onClick={requestReindex}
              disabled={reindexMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={reindexMutation.isPending ? "animate-spin" : ""} />
              Reprocessar
            </button>
            <button
              onClick={openPdf}
              disabled={openingPdf || !atestado}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {openingPdf ? <RefreshCw size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Abrir PDF
            </button>
          </div>
        )}
      </div>

      {/* Processing notice */}
      {(atestado?.status === "PENDING" || atestado?.status === "PROCESSING") && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <RefreshCw size={15} className="animate-spin shrink-0" />
          Documento em processamento. As informações serão atualizadas automaticamente.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={
                tab === t.key
                  ? { borderColor: "var(--primary)", color: "var(--primary)" }
                  : { borderColor: "transparent", color: "#6B7280" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Entidades ── */}
      {tab === "entidades" && (
        <div>
          {loadingObras && <TableSkeleton rows={3} />}
          {!loadingObras && !obras?.length && atestado?.status === "DONE" && (
            <EmptyState
              title="Nenhuma entidade extraída"
              description="O processamento não encontrou obras, empresas ou contratos neste documento."
            />
          )}
          {obras?.map((obra) => (
            <div
              key={obra.id}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-4"
            >
              <div className="flex items-start gap-3 mb-4">
                <Building2 size={18} style={{ color: "var(--primary)" }} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">{obra.nome}</h3>
                  {obra.tipo && (
                    <span className="text-xs text-gray-500">{obra.tipo}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                {obra.local && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={13} className="text-gray-400" />
                    {obra.local}
                  </div>
                )}
                {obra.dataInicio && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={13} className="text-gray-400" />
                    {formatDate(obra.dataInicio)}
                    {obra.dataFim && ` → ${formatDate(obra.dataFim)}`}
                  </div>
                )}
                {obra.valor != null && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign size={13} className="text-gray-400" />
                    {formatCurrency(obra.valor)}
                  </div>
                )}
                {obra.art && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Hash size={13} className="text-gray-400" />
                    ART: {obra.art}
                  </div>
                )}
              </div>

              {obra.contratos && obra.contratos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Briefcase size={11} /> Contratos
                  </p>
                  <div className="space-y-2">
                    {obra.contratos.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg bg-gray-50 px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap gap-4">
                          {c.empresa && (
                            <span>
                              <span className="text-gray-400 text-xs">
                                {c.empresa.tipo === "CONTRATANTE" ? "Contratante" : "Contratada"}:{" "}
                              </span>
                              <span className="font-medium text-gray-700">
                                {c.empresa.nome}
                              </span>
                              {c.empresa.cnpj && (
                                <span className="text-gray-400 ml-1 text-xs">
                                  ({c.empresa.cnpj})
                                </span>
                              )}
                            </span>
                          )}
                          {c.numero && (
                            <span className="text-gray-500">Nº {c.numero}</span>
                          )}
                          {c.valor != null && (
                            <span className="text-gray-500">{formatCurrency(c.valor)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Serviços ── */}
      {tab === "servicos" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => beginServicoEdit()} disabled={saveServicoMutation.isPending || atestado?.status !== "DONE"} className="flex items-center gap-2 px-3 py-2 text-sm text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: "var(--primary)" }}>
              <Plus size={14} /> Adicionar linha
            </button>
          </div>
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setCategoriaFilter("")}
                className="px-3 py-1 text-xs rounded-full border transition-colors"
                style={
                  !categoriaFilter
                    ? { backgroundColor: "var(--primary)", color: "white", borderColor: "var(--primary)" }
                    : { borderColor: "#E5E7EB", color: "#6B7280" }
                }
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaFilter(cat!)}
                  className="px-3 py-1 text-xs rounded-full border transition-colors"
                  style={
                    categoriaFilter === cat
                      ? { backgroundColor: "var(--primary)", color: "white", borderColor: "var(--primary)" }
                      : { borderColor: "#E5E7EB", color: "#6B7280" }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {loadingServicos && <TableSkeleton rows={6} />}
          {!loadingServicos && !servicos?.length && atestado?.status === "DONE" && (
            <EmptyState
              title="Nenhum serviço encontrado"
              description="Não foram encontrados itens de serviço neste documento."
            />
          )}

          {servicos && (servicos.length > 0 || editingServicoId === "new") && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <colgroup>
                  <col className="w-[12%]" /><col className="w-[36%]" /><col className="w-[20%]" /><col className="w-[12%]" /><col className="w-[10%]" /><col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Un</th>
                    <th className="px-4 py-3" aria-label="Ações" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {editingServicoId === "new" && (
                    <tr className="bg-blue-50 border-y border-blue-100 shadow-inner">
                      {(["codigo", "descricao", "categoria", "quantidade", "unidade"] as const).map((field) => <td key={field} className="px-2 py-2">{field === "unidade" ? (
                        <div className="relative">
                        <select className="h-9 w-full min-w-0 appearance-none rounded-md border border-blue-200 bg-white px-2.5 pr-8 text-sm font-medium text-gray-800 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={servicoDraft.unidade} onChange={(event) => updateServicoDraft("unidade", event.target.value)} aria-label="Unidade">
                          <option value="">Selecione</option>
                          {servicoDraft.unidade && !unidades.some((unidade) => unidade.canonicalSymbol === servicoDraft.unidade) && <option value={servicoDraft.unidade}>{servicoDraft.unidade}</option>}
                          {unidades.map((unidade) => <option key={unidade.id} value={unidade.canonicalSymbol}>{unidade.canonicalSymbol} — {unidade.name}</option>)}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500" />
                      </div>
                      ) : (
                        <input className="h-9 w-full min-w-0 rounded-md border border-blue-200 bg-white px-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={servicoDraft[field]} onChange={(event) => updateServicoDraft(field, event.target.value)} autoFocus={field === "descricao"} placeholder={field === "codigo" ? "Código" : field === "descricao" ? "Descrição do serviço" : field === "categoria" ? "Categoria" : "Quantidade"} type={field === "quantidade" ? "number" : "text"} min={field === "quantidade" ? 0 : undefined} step={field === "quantidade" ? "any" : undefined} inputMode={field === "quantidade" ? "decimal" : undefined} />
                      )}
</td>)}
                      <td className="px-3 py-2 whitespace-nowrap"><div className="flex items-center justify-end gap-1"><button onClick={saveServicoEdit} disabled={saveServicoMutation.isPending} className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50" aria-label="Salvar linha" title="Salvar"><Check size={16} /></button><button onClick={cancelServicoEdit} disabled={saveServicoMutation.isPending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50" aria-label="Cancelar edição" title="Cancelar"><X size={16} /></button></div></td>
                    </tr>
                  )}

                  {servicos.map((s) => (
                    editingServicoId === s.id ? (
                    <tr key={s.id} className="bg-blue-50 border-y border-blue-100 shadow-inner">
                      {(["codigo", "descricao", "categoria", "quantidade", "unidade"] as const).map((field) => <td key={field} className="px-2 py-2">{field === "unidade" ? (
                        <div className="relative">
                        <select className="h-9 w-full min-w-0 appearance-none rounded-md border border-blue-200 bg-white px-2.5 pr-8 text-sm font-medium text-gray-800 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={servicoDraft.unidade} onChange={(event) => updateServicoDraft("unidade", event.target.value)} aria-label="Unidade">
                          <option value="">Selecione</option>
                          {servicoDraft.unidade && !unidades.some((unidade) => unidade.canonicalSymbol === servicoDraft.unidade) && <option value={servicoDraft.unidade}>{servicoDraft.unidade}</option>}
                          {unidades.map((unidade) => <option key={unidade.id} value={unidade.canonicalSymbol}>{unidade.canonicalSymbol} — {unidade.name}</option>)}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500" />
                      </div>
                      ) : (
                        <input className="h-9 w-full min-w-0 rounded-md border border-blue-200 bg-white px-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={servicoDraft[field]} onChange={(event) => updateServicoDraft(field, event.target.value)} autoFocus={field === "descricao"} placeholder={field === "codigo" ? "Código" : field === "descricao" ? "Descrição do serviço" : field === "categoria" ? "Categoria" : "Quantidade"} type={field === "quantidade" ? "number" : "text"} min={field === "quantidade" ? 0 : undefined} step={field === "quantidade" ? "any" : undefined} inputMode={field === "quantidade" ? "decimal" : undefined} />
                      )}
</td>)}
                      <td className="px-3 py-2 whitespace-nowrap"><div className="flex items-center justify-end gap-1"><button onClick={saveServicoEdit} disabled={saveServicoMutation.isPending} className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50" aria-label="Salvar linha" title="Salvar"><Check size={16} /></button><button onClick={cancelServicoEdit} disabled={saveServicoMutation.isPending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50" aria-label="Cancelar edição" title="Cancelar"><X size={16} /></button></div></td>
                    </tr>
                  ) : (
                    <tr key={s.id} className="hover:bg-gray-50">

                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {s.codigo ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{s.descricao}</td>
                      <td className="px-4 py-3 text-gray-500">{s.categoria ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-mono">
                        {s.quantidade != null ? formatNumber(s.quantidade, 4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{s.unidade ?? "—"}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => beginServicoEdit(s)} disabled={saveServicoMutation.isPending} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50" aria-label="Editar linha"><Pencil size={14} /></button></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Info ── */}
      {tab === "info" && atestado && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "ID", value: atestado.id },
              { label: "Arquivo", value: atestado.originalFilename },
              { label: "Status", value: <StatusBadge status={atestado.status} /> },
              { label: "Chave S3", value: atestado.s3Key },
              { label: "Criado em", value: formatDate(atestado.createdAt) },
              ...(atestado.errorMessage
                ? [{ label: "Erro", value: atestado.errorMessage }]
                : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                <dd className="text-gray-800 font-mono text-xs break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {showReindexWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reindex-warning-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><RefreshCw size={18} /></div>
            <h2 id="reindex-warning-title" className="text-lg font-semibold text-gray-900">Reprocessar e substituir alterações?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Este atestado possui linhas incluídas ou corrigidas manualmente. O reprocessamento lerá o PDF novamente e substituirá essas alterações.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowReindexWarning(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmReindex} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700">Reprocessar mesmo assim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
