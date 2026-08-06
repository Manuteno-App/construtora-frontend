"use client";

import api from "@/lib/api";
import type { AtestadoListResponse, UploadBatchResponse } from "@/types";
import { AlertCircle, CheckCircle, FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type FileStatus = "pending" | "uploading" | "done" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  errorMsg?: string;
}

const MAX_SIZE = 200 * 1024 * 1024;
const MAX_FILES = 20;

function validateFile(f: File): string | null {
  if (f.type !== "application/pdf") return "Apenas PDFs são aceitos.";
  if (f.size > MAX_SIZE) return "O arquivo deve ter no máximo 200 MB.";
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const toAdd: FileEntry[] = [];
    for (const f of newFiles) {
      const err = validateFile(f);
      if (err) { toast.error(`${f.name}: ${err}`); continue; }
      toAdd.push({ file: f, status: "pending" });
    }
    setEntries((prev) => {
      const combined = [...prev, ...toAdd];
      if (combined.length > MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} arquivos por envio.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const pending = entries.filter((e) => e.status === "pending");
    if (pending.length === 0) return;

    try {
      const duplicateNames = (
        await Promise.all(
          pending.map(async ({ file }) => {
            const { data } = await api.get<AtestadoListResponse>("/atestados", {
              params: { search: file.name, page: 1, limit: 100 },
            });
            const duplicated = data.items.some(
              (atestado) =>
                atestado.originalFilename.trim().localeCompare(
                  file.name.trim(),
                  "pt-BR",
                  { sensitivity: "accent" },
                ) === 0,
            );
            return duplicated ? file.name : null;
          }),
        )
      ).filter((name): name is string => name !== null);

      if (
        duplicateNames.length > 0 &&
        !window.confirm(
          `Ja existe atestado com o mesmo nome:\n\n${duplicateNames.join("\n")}\n\nDeseja enviar mesmo assim?`,
        )
      ) {
        return;
      }
    } catch {
      toast.error("Nao foi possivel verificar arquivos com nome duplicado.");
      return;
    }

    setUploading(true);
    setEntries((prev) =>
      prev.map((e) => (e.status === "pending" ? { ...e, status: "uploading" } : e))
    );

    const formData = new FormData();
    pending.forEach((e) => formData.append("files", e.file));

    try {
      const { data } = await api.post<UploadBatchResponse>("/ingestion/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setEntries((prev) =>
        prev.map((e) => {
          if (e.status !== "uploading") return e;
          const found = data.results.find((r) => r.originalFilename === e.file.name);
          return found ? { ...e, status: "done" } : { ...e, status: "done" };
        })
      );

      toast.success(`${data.results.length} arquivo(s) enviado(s) com sucesso!`);
      setTimeout(() => router.push("/atestados"), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar arquivos.";
      setEntries((prev) =>
        prev.map((e) => (e.status === "uploading" ? { ...e, status: "error", errorMsg: msg } : e))
      );
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const allDone = entries.length > 0 && entries.every((e) => e.status === "done");

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload de Atestados</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie um ou mais PDFs de atestado de obra para processamento automatizado com IA.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-8">
        {/* Drop zone */}
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className="border-2 border-dashed rounded-xl p-5 sm:p-8 flex flex-col items-center text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragOver ? "var(--primary)" : entries.length > 0 ? "var(--primary)" : "#E5E7EB",
            backgroundColor: dragOver ? "#FFF5EE" : entries.length > 0 ? "#FFFAF7" : "#FAFAFA",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="p-4 rounded-full mb-3" style={{ backgroundColor: "rgba(232,93,4,0.1)" }}>
            <Upload size={28} style={{ color: "var(--primary)" }} />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Clique ou arraste seus PDFs aqui
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Múltiplos arquivos · Apenas PDFs · Máximo 200 MB cada · Até {MAX_FILES} arquivos
          </p>
        </div>

        {/* File list */}
        {entries.length > 0 && (
          <ul className="mt-5 space-y-2">
            {entries.map((entry, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="p-2 rounded-md bg-orange-50 shrink-0">
                  <FileText size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{entry.file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="shrink-0">
                  {entry.status === "pending" && (
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1.5 rounded hover:bg-gray-200 text-gray-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {entry.status === "uploading" && (
                    <Loader2 size={16} className="animate-spin text-orange-500" />
                  )}
                  {entry.status === "done" && (
                    <CheckCircle size={16} className="text-green-600" />
                  )}
                  {entry.status === "error" && (
                    <span title={entry.errorMsg}>
                      <AlertCircle size={16} className="text-red-500" />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Success banner */}
        {allDone && (
          <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3 text-sm">
            <CheckCircle size={16} />
            Todos os arquivos enviados! Redirecionando para a lista de atestados…
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleUpload}
            disabled={pendingCount === 0 || uploading || allDone}
            className="flex-1 py-3 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {uploading
              ? "Enviando…"
              : `Enviar ${pendingCount > 0 ? `${pendingCount} arquivo(s)` : ""} para processamento`}
          </button>
          {entries.some((e) => e.status === "pending" || e.status === "error") && !uploading && (
            <button
              onClick={() => setEntries((prev) => prev.filter((e) => e.status === "done"))}
              className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Limpar
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Após o envio, cada documento passará por OCR, extração de entidades e indexação para consulta via IA.
        </p>
      </div>
    </div>
  );
}

