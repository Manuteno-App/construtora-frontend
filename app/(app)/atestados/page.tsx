"use client";

import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AtestadoListResponse, AtestadoStatus } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const STATUS_TABS: { label: string; value: AtestadoStatus | "ALL" }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Pendente", value: "PENDING" },
  { label: "Processando", value: "PROCESSING" },
  { label: "Concluído", value: "DONE" },
  { label: "Erro", value: "ERROR" },
];

const PAGE_SIZE = 20;

export default function AtestadosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<AtestadoStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(activeStatus !== "ALL" && { status: activeStatus }),
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
      toast.success("Atestado excluído com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
      setConfirmDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmDelete(null);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleTabChange = useCallback((status: AtestadoStatus | "ALL") => {
    setActiveStatus(status);
    setPage(1);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Arquivo
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Data
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
                  <td className="px-6 py-4" colSpan={4}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={4}>
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
        <div className="flex items-center justify-between mt-4">
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
