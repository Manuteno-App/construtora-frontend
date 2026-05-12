"use client";

import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/skeleton";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { QuantitativoRow } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Filters {
  descricoes: string[];
  operador: "AND" | "OR";
  categoria: string;
  localidade: string;
  minQuantidade: string;
}

const EMPTY_FILTERS: Filters = {
  descricoes: [],
  operador: "OR",
  categoria: "",
  localidade: "",
  minQuantidade: "",
};

export default function QuantitativosPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<Filters | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const buildParams = (f: Filters) => {
    const p: Record<string, string> = {};
    if (f.descricoes.length > 0) p.descricao = f.descricoes.join(",");
    if (f.descricoes.length > 1) p.operador = f.operador;
    if (f.categoria) p.categoria = f.categoria;
    if (f.localidade) p.localidade = f.localidade;
    if (f.minQuantidade) p.minQuantidade = f.minQuantidade;
    return p;
  };

  const { data, isLoading, isFetching } = useQuery<QuantitativoRow[]>({
    queryKey: ["quantitativos", submittedFilters],
    queryFn: () =>
      api
        .get("/intelligence/quantitativos", { params: buildParams(submittedFilters!) })
        .then((r) => r.data),
    enabled: submittedFilters !== null,
  });

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || filters.descricoes.includes(trimmed)) return;
    setFilters((prev) => ({ ...prev, descricoes: [...prev.descricoes, trimmed] }));
  };

  const removeTag = (tag: string) =>
    setFilters((prev) => ({ ...prev, descricoes: prev.descricoes.filter((d) => d !== tag) }));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && tagInput === "" && filters.descricoes.length > 0) {
      removeTag(filters.descricoes[filters.descricoes.length - 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedFilters({ ...filters });
    setExpandedRow(null);
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
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4"
      >
        {/* Row 1: Service tags + operator */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Serviços{" "}
            <span className="text-gray-400 font-normal">
              (digite e pressione Enter ou vírgula para adicionar)
            </span>
          </label>
          <div
            className="flex flex-wrap gap-1.5 min-h-[40px] px-3 py-2 border border-gray-200 rounded-lg bg-white cursor-text"
            onClick={() => document.getElementById("tag-input")?.focus()}
          >
            {filters.descricoes.map((tag) => (
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
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => {
                if (tagInput.trim()) {
                  addTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder={filters.descricoes.length === 0 ? "Ex: Pavimentação asfáltica" : ""}
              className="flex-1 min-w-[180px] outline-none text-sm bg-transparent"
            />
          </div>
        </div>

        {/* Row 2: Operator toggle (only when multiple services) */}
        {filters.descricoes.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600">Operador:</span>
            {(["OR", "AND"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, operador: op }))}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                style={
                  filters.operador === op
                    ? { backgroundColor: "var(--primary)", color: "white", borderColor: "var(--primary)" }
                    : { backgroundColor: "white", color: "#6b7280", borderColor: "#d1d5db" }
                }
              >
                {op === "OR" ? "OU (qualquer)" : "E (todos)"}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Other filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <input
              type="text"
              value={filters.categoria}
              onChange={(e) => setFilters((prev) => ({ ...prev, categoria: e.target.value }))}
              placeholder="Ex: TERRAPLENAGEM"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Localização</label>
            <input
              type="text"
              value={filters.localidade}
              onChange={(e) => setFilters((prev) => ({ ...prev, localidade: e.target.value }))}
              placeholder="Ex: Piauí, Teresina"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Qtd. mínima</label>
            <input
              type="number"
              min={0}
              step="any"
              value={filters.minQuantidade}
              onChange={(e) => setFilters((prev) => ({ ...prev, minQuantidade: e.target.value }))}
              placeholder="Ex: 1000"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isFetching}
              className="w-full flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Search size={14} />
              {isFetching ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>
      </form>

      {/* Result summary */}
      {!isLoading && submittedFilters !== null && data && (
        <p className="text-sm text-gray-500 mb-3">
          {totalServicos} serviço{totalServicos !== 1 ? "s" : ""} encontrado
          {totalServicos !== 1 ? "s" : ""}
        </p>
      )}

      {/* Table */}
      {(isLoading || isFetching) && submittedFilters !== null && <TableSkeleton rows={8} />}

      {!isLoading && !isFetching && submittedFilters !== null && data?.length === 0 && (
        <EmptyState
          title="Nenhum serviço encontrado"
          description="Tente ajustar os filtros para uma busca mais ampla."
        />
      )}

      {submittedFilters === null && (
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
                  Atestados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => (
                <>
                  <tr
                    key={i}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="px-5 py-3 text-gray-800">{row.descricao}</td>
                    <td className="px-5 py-3 text-gray-500">{row.unidade ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-800 font-medium">
                      {formatNumber(row.total, 4)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        {row.atestados.length}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === i && row.atestadoRefs?.length > 0 && (
                    <tr key={`${i}-expand`} className="bg-blue-50">
                      <td colSpan={4} className="px-8 py-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                          Atestados com este serviço:
                        </p>
                        <div className="flex flex-col gap-1">
                          {row.atestadoRefs.map((ref) => (
                            <button
                              key={ref.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openAtestadoPdf(ref.id);
                              }}
                              disabled={openingPdf === ref.id}
                              className="flex items-center gap-2 text-left text-sm text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50 w-fit"
                            >
                              <ExternalLink size={12} />
                              {openingPdf === ref.id ? "Abrindo…" : ref.filename}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
            <span className="text-xs text-gray-500">
              {data.length} itens ·{" "}
              {[...new Set(data.flatMap((r) => r.atestados))].length} atestado
              {[...new Set(data.flatMap((r) => r.atestados))].length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

