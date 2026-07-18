"use client";

import { EmptyState } from "@/components/empty-state";
import { Skeleton, TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import api from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Atestado, Obra, ServicoExecutado } from "@/types";
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
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Tab = "entidades" | "servicos" | "info";

export default function AtestadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("entidades");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [openingPdf, setOpeningPdf] = useState(false);

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
    enabled: tab === "servicos" && !!atestado && atestado.status === "DONE",
  });

  const reindexMutation = useMutation({
    mutationFn: () => api.post(`/ingestion/${id}/reindex`),
    onSuccess: () => {
      toast.success("Reprocessamento iniciado.");
      queryClient.invalidateQueries({ queryKey: ["atestado", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "entidades", label: "Entidades Extraídas" },
    { key: "servicos", label: "Serviços Executados" },
    { key: "info", label: "Informações" },
  ];

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
              onClick={() => reindexMutation.mutate()}
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

          {servicos && servicos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Un</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {servicos.map((s) => (
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
                    </tr>
                  ))}
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
    </div>
  );
}
