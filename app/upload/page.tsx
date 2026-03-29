"use client";

import api from "@/lib/api";
import type { UploadResponse } from "@/types";
import { AlertCircle, CheckCircle, FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const validateFile = (f: File): string | null => {
    if (f.type !== "application/pdf") return "Apenas arquivos PDF são aceitos.";
    if (f.size > 50 * 1024 * 1024) return "O arquivo deve ter no máximo 50 MB.";
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setUploadState("idle");
    setErrorMsg("");
    setProgress(0);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadState("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post<UploadResponse>("/ingestion/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setProgress(pct);
        },
      });
      setUploadState("done");
      toast.success("Upload realizado com sucesso! Redirecionando...");
      setTimeout(() => router.push(`/atestados/${data.atestadoId}`), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar arquivo.";
      setErrorMsg(msg);
      setUploadState("error");
      toast.error(msg);
    }
  };

  const reset = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload de Atestado</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie um PDF de atestado de obra para processamento automatizado com IA.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        {/* Drop zone */}
        <div
          onClick={() => !file && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragOver ? "var(--primary)" : file ? "var(--primary)" : "#E5E7EB",
            backgroundColor: dragOver ? "#FFF5EE" : file ? "#FFF5EE" : "#FAFAFA",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleInputChange}
          />

          {!file ? (
            <>
              <div
                className="p-4 rounded-full mb-4"
                style={{ backgroundColor: "rgba(232,93,4,0.1)" }}
              >
                <Upload size={28} style={{ color: "var(--primary)" }} />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Clique ou arraste seu PDF aqui
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Apenas PDFs · Máximo 50 MB
              </p>
            </>
          ) : (
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 rounded-lg bg-orange-50">
                <FileText size={22} style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {uploadState === "idle" && (
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {uploadState === "uploading" && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Enviando…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: "var(--primary)" }}
              />
            </div>
          </div>
        )}

        {/* Success */}
        {uploadState === "done" && (
          <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3 text-sm">
            <CheckCircle size={16} />
            Arquivo enviado! Redirecionando para o acompanhamento…
          </div>
        )}

        {/* Error */}
        {uploadState === "error" && (
          <div className="mt-4 flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploadState === "uploading" || uploadState === "done"}
          className="mt-6 w-full py-3 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {uploadState === "uploading" ? "Enviando…" : "Enviar para processamento"}
        </button>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Após o envio, o documento passará por OCR, extração de entidades e indexação para consulta via IA.
        </p>
      </div>
    </div>
  );
}
