"use client";

import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AtestadoListResponse, AtestadoStatus } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Eye, FileText, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const STATUS_TABS: { label: string; value: AtestadoStatus | "ALL" }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Pendente", value: "PENDING" },
  { label: "Processando", value: "PROCESSING" },
  { label: "Concluí­do", value: "DONE" },
  { label: "Erro", value: "ERROR" },
];

const PAGE_SIZE = 20;

export default function AtestadosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<AtestadoStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"createdAt" | "lastReprocessedAt">("lastReprocessedAt");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const query = {
    page,
    limit: PAGE_SIZE,
    sortBy,
    ...(activeStatus !== "ALL" && { status: activeStatus }),
    ...(search.trim() && { search: search.trim() }),
  };

  const { data, isLoading } = useQuery<AtestadoListResponse>({
    queryKey: ["atestados", query],
    queryFn: () => api.get("/atestados", { params: query }).then((r) => r.data),
    refetchInterval: (q) => {
      const items = q.state.data?.items ?? [];
      const hasActive = items.some(
        (a) => a.status === "PENDING" || a.status === "PROCESSING"
      );
      return hasActive ? 5_000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/atestados/${id}`),
    onSuccess: () => {
      toast.success("Atestado excluí­do com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
      setConfirmDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmDelete(null);
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => api.post(`/ingestion/${id}/reindex`),
    onSuccess: () => {
      toast.success("Reprocessamento iniciado.");
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleTabChange = useCallback((status: AtestadoStatus | "ALL") => {
    setActiveStatus(status);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: "createdAt" | "lastReprocessedAt") => {
    setSortBy(value);
    setPage(1);
  }, []);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atestados</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} documento{total !== 1 ? "s" : ""} no sistema
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          + Enviar atestado
        </Link>
      </div>

      <div className="relative mb-4 max-w-xl">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por obra, contrato ou arquivo"
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Sort + Status tabs */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-full overflow-x-auto sm:w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={
              activeStatus === tab.value
                ? { backgroundColor: "white", color: "var(--primary)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                : { color: "#6B7280" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as "createdAt" | "lastReprocessedAt")}
            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            <option value="createdAt">Data de envio</option>
            <option value="lastReprocessedAt">Último reprocessamento</option>
          </select>
        </div>
      </div>
      {/* Mobile list */}
      <div className="space-y-3 md:hidden">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4"><Skeleton className="h-16 w-full" /></div>
        ))}
        {!isLoading && items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white"><EmptyState title="Nenhum atestado encontrado" description="Envie um PDF para começar o processamento." /></div>
        )}
        {!isLoading && items.map((a) => (
          <article key={a.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <FileText size={18} className="mt-0.5 shrink-0 text-gray-400" />
                <h2 className="truncate text-sm font-semibold text-gray-800">{a.originalFilename}</h2>
              </div>
              <StatusBadge status={a.status} />
            </div>
            {a.errorMessage && <p className="mt-2 text-xs text-red-500">{a.errorMessage}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs">
              <div><dt className="text-gray-400">Enviado em</dt><dd className="mt-1 text-gray-600">{formatDate(a.createdAt)}</dd></div>
              <div><dt className="text-gray-400">Reprocessado em</dt><dd className="mt-1 text-gray-600">{a.lastReprocessedAt ? formatDate(a.lastReprocessedAt) : "—"}</dd></div>
            </dl>
            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button onClick={() => router.push(`/atestados/${a.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600"><Eye size={14} />Detalhes</button>
              <button onClick={() => reprocessMutation.mutate(a.id)} disabled={reprocessMutation.isPending || a.status === "PENDING" || a.status === "PROCESSING"} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-2 text-xs font-medium text-orange-600 disabled:opacity-40"><RefreshCw size={14} className={reprocessMutation.isPending ? "animate-spin" : ""} />Reprocessar</button>
              <button onClick={() => setConfirmDelete(a.id)} className="rounded-lg border border-red-100 p-2 text-red-500" title="Excluir"><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Arquivo
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {sortBy === "lastReprocessedAt" ? (
                  <span className="text-gray-400">Criado em</span>
                ) : (
                  <span style={{ color: "var(--primary)" }}>Criado em:</span>
                )}
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {sortBy === "lastReprocessedAt" ? (
                  <span style={{ color: "var(--primary)" }}>Último reprocessamento:</span>
                ) : (
                  <span className="text-gray-400">Último reprocessamento</span>
                )}
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4" colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="Nenhum atestado encontrado"
                    description="Envie um PDF para começar o processamento."
                  />
                </td>
              </tr>
            )}
            {!isLoading &&
              items.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-gray-400 shrink-0" />
                      <span className="text-gray-800 truncate max-w-xs">
                        {a.originalFilename}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={a.status} />
                    {a.errorMessage && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs">
                        {a.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {a.lastReprocessedAt ? formatDate(a.lastReprocessedAt) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/atestados/${a.id}`)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => reprocessMutation.mutate(a.id)}
                        disabled={reprocessMutation.isPending || a.status === "PENDING" || a.status === "PROCESSING"}
                        className="p-1.5 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-40"
                        title="Reprocessar"
                      >
                        <RefreshCw size={15} className={reprocessMutation.isPending ? "animate-spin" : ""} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(a.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500 mb-5">
              Tem certeza que deseja excluir este atestado? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: "#DC2626" }}
              >
                {deleteMutation.isPending && <RefreshCw size={13} className="animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
