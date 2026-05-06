"use client";

import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { QuantitativoRow } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const filterSchema = z.object({
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  obraId: z.string().optional(),
});
type FilterValues = z.infer<typeof filterSchema>;

export default function QuantitativosPage() {
  const [submittedFilters, setSubmittedFilters] = useState<FilterValues>({});
  const [hasSearched, setHasSearched] = useState(false);

  const { register, handleSubmit } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: { descricao: "", categoria: "", obraId: "" },
  });

  const params = Object.fromEntries(
    Object.entries(submittedFilters).filter(([, v]) => v && v.length > 0)
  );

  const { data, isLoading, isFetching } = useQuery<QuantitativoRow[]>({
    queryKey: ["quantitativos", submittedFilters],
    queryFn: () =>
      api.get("/intelligence/quantitativos", { params }).then((r) => r.data),
    enabled: hasSearched,
  });

  const onSubmit = (values: FilterValues) => {
    setSubmittedFilters(values);
    setHasSearched(true);
  };

  const totalServicos = data?.length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quantitativos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Agregação de serviços executados consolidados entre todos os atestados.
        </p>
      </div>

      {/* Filter form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 p-5 mb-6"
      >
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Descrição do serviço
            </label>
            <input
              {...register("descricao")}
              type="text"
              placeholder="Ex: Pavimentação asfáltica"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Categoria
            </label>
            <input
              {...register("categoria")}
              type="text"
              placeholder="Ex: TERRAPLENAGEM"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ID da Obra
            </label>
            <input
              {...register("obraId")}
              type="text"
              placeholder="UUID da obra (opcional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isFetching}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Search size={14} />
          {isFetching ? "Buscando…" : "Buscar quantitativos"}
        </button>
      </form>

      {/* Result summary */}
      {!isLoading && hasSearched && data && (
        <p className="text-sm text-gray-500 mb-3">
          {totalServicos} serviço{totalServicos !== 1 ? "s" : ""} encontrado
          {totalServicos !== 1 ? "s" : ""}
        </p>
      )}

      {/* Table */}
      {(isLoading || isFetching) && hasSearched && <TableSkeleton rows={8} />}

      {!isLoading && !isFetching && hasSearched && data?.length === 0 && (
        <EmptyState
          title="Nenhum serviço encontrado"
          description="Tente ajustar os filtros para uma busca mais ampla."
        />
      )}

      {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={36} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">
            Use os filtros acima para consultar os quantitativos acumulados.
          </p>
        </div>
      )}

      {!isLoading && !isFetching && data && data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Descrição
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Unidade
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nº Atestados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-800">{row.descricao}</td>
                  <td className="px-5 py-3 text-gray-500">{row.unidade ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-800 font-medium">
                    {formatNumber(row.total, 4)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {row.atestados.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
            <span className="text-xs text-gray-500">
              {data.length} itens · origem:{" "}
              {[...new Set(data.flatMap((r) => r.atestados))].length} atestado
              {[...new Set(data.flatMap((r) => r.atestados))].length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
