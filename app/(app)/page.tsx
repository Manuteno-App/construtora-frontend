"use client";

import { Skeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AtestadoListResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle, Clock, FileText, Shield, Upload } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data, isLoading } = useQuery<AtestadoListResponse>({
    queryKey: ["atestados", { page: 1, limit: 100 }],
    queryFn: () =>
      api.get("/atestados", { params: { page: 1, limit: 100 } }).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const counts = {
    DONE: items.filter((a) => a.status === "DONE").length,
    PROCESSING: items.filter((a) => a.status === "PROCESSING").length,
    PENDING: items.filter((a) => a.status === "PENDING").length,
    ERROR: items.filter((a) => a.status === "ERROR").length,
  };

  const recent = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const metrics = [
    { label: "Total de Atestados", value: total, icon: FileText, color: "#3B82F6" },
    { label: "Concluídos", value: counts.DONE, icon: CheckCircle, color: "#16A34A" },
    { label: "Em Processamento", value: counts.PROCESSING + counts.PENDING, icon: Clock, color: "#D97706" },
    { label: "Com Erro", value: counts.ERROR, icon: AlertCircle, color: "#DC2626" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral do processamento de atestados de obras.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4"
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: m.color + "18" }}
            >
              <m.icon size={20} style={{ color: m.color }} />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
              )}
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent docs + Quick actions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent */}
        <div className="bg-white rounded-xl border border-gray-200 xl:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Atestados Recentes</h2>
            <Link
              href="/atestados"
              className="text-xs flex items-center gap-1 font-medium"
              style={{ color: "var(--primary)" }}
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            {!isLoading && recent.length === 0 && (
              <p className="px-6 py-6 text-sm text-gray-400 text-center">
                Nenhum atestado enviado ainda.
              </p>
            )}
            {!isLoading &&
              recent.map((a) => (
                <Link
                  key={a.id}
                  href={`/atestados/${a.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors sm:items-center sm:px-6"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {a.originalFilename}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 sm:ml-4 sm:flex-row sm:items-center sm:gap-3">
                    <StatusBadge status={a.status} />
                    <span className="text-xs text-gray-400">{formatDate(a.createdAt)}</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-1">Ações Rápidas</h2>
          <Link
            href="/upload"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Upload size={16} />
            Enviar novo atestado
          </Link>
          <Link
            href="/edital"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Shield size={16} />
            Pesquisa
          </Link>
        </div>
      </div>
    </div>
  );
}
