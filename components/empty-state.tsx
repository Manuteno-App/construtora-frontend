import { FileX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "Nenhum resultado",
  description = "Não há dados para exibir.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileX size={40} className="mb-3 text-gray-300" />
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
