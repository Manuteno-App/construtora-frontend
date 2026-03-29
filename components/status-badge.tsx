import type { AtestadoStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  AtestadoStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-gray-100 text-gray-700 border border-gray-300",
  },
  PROCESSING: {
    label: "Processando",
    className: "bg-amber-100 text-amber-700 border border-amber-300",
  },
  DONE: {
    label: "Concluído",
    className: "bg-green-100 text-green-700 border border-green-300",
  },
  ERROR: {
    label: "Erro",
    className: "bg-red-100 text-red-700 border border-red-300",
  },
};

export function StatusBadge({ status }: { status: AtestadoStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
