"use client";

import api, { getApiAccessToken } from "@/lib/api";
import type { ConversationTurn, QueryRequest, SourceRef } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Send, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  streaming?: boolean;
  sources?: SourceRef[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    estado: "",
    obraId: "",
    empresaId: "",
    periodoDe: "",
    periodoAte: "",
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Init or restore session
  useEffect(() => {
    const stored = sessionStorage.getItem("chat-session-id");
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = crypto.randomUUID();
      sessionStorage.setItem("chat-session-id", newId);
      setSessionId(newId);
    }
  }, []);

  // Load history
  const { data: history } = useQuery<ConversationTurn[]>({
    queryKey: ["chat-history", sessionId],
    queryFn: () =>
      api.get(`/intelligence/history/${sessionId}`).then((r) => r.data),
    enabled: !!sessionId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(
        history.map((t) => ({
          id: t.id,
          role: t.role,
          content: t.content,
          sources: t.sources,
        }))
      );
    }
  }, [history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildRequest = (): QueryRequest => {
    const req: QueryRequest = { query: input.trim(), sessionId };
    const f: QueryRequest["filters"] = {};
    if (filters.estado) f.estado = filters.estado;
    if (filters.obraId) f.obraId = filters.obraId;
    if (filters.empresaId) f.empresaId = filters.empresaId;
    if (filters.periodoDe || filters.periodoAte) {
      f.periodo = { de: filters.periodoDe, ate: filters.periodoAte };
    }
    if (Object.keys(f).length) req.filters = f;
    return req;
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "USER",
      content: input.trim(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "ASSISTANT",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
      const token = getApiAccessToken();
      const response = await fetch(`${apiUrl}/intelligence/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildRequest()),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload);
              if (event.type === "text" && event.content) {
                accumulated += event.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated }
                      : m
                  )
                );
              }
              if (event.type === "sources") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, sources: event.sources }
                      : m
                  )
                );
              }
              if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, streaming: false }
                      : m
                  )
                );
              }
            } catch {
              // non-JSON line, skip
            }
          }
        }
      }

      // Finalize
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Erro na consulta.";
      toast.error(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Desculpe, ocorreu um erro ao processar sua consulta.", streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessionId, filters]);

  const newSession = () => {
    if (abortRef.current) abortRef.current.abort();
    const newId = crypto.randomUUID();
    sessionStorage.setItem("chat-session-id", newId);
    setSessionId(newId);
    setMessages([]);
    setIsStreaming(false);
  };

  const stripInlineSources = (text: string) =>
    text.replace(/,?\s*\[Fonte:[^\]]+\],?\s*/gi, "").trim();

  const openSourcePdf = async (atestadoId: string, pagina?: number) => {
    try {
      const { data } = await api.get<{ url: string }>(`/atestados/${atestadoId}/signed-url`);
      const url = pagina ? `${data.url}#page=${pagina}` : data.url;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o PDF.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat IA</h1>
          <p className="text-sm text-gray-500">
            Consulte seus atestados em linguagem natural.
          </p>
        </div>
        <button
          onClick={newSession}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={14} />
          Nova conversa
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-gray-200 mb-3">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl"
        >
          <span>Filtros avançados</span>
          {showFilters ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showFilters && (
          <div className="px-4 pb-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
            {[
              { key: "estado", label: "Estado (UF)" },
              { key: "obraId", label: "ID da Obra" },
              { key: "empresaId", label: "ID da Empresa" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input
                  type="text"
                  value={filters[f.key as keyof typeof filters]}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                  placeholder={f.label}
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Período — De</label>
              <input
                type="date"
                value={filters.periodoDe}
                onChange={(e) => setFilters((prev) => ({ ...prev, periodoDe: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Período — Até</label>
              <input
                type="date"
                value={filters.periodoAte}
                onChange={(e) => setFilters((prev) => ({ ...prev, periodoAte: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 space-y-4 mb-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="p-4 rounded-full mb-4"
              style={{ backgroundColor: "rgba(232,93,4,0.08)" }}
            >
              <Bot size={32} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-700">
              Como posso ajudar?
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Faça perguntas sobre atestados, obras, empresas ou quantitativos. Ex: &ldquo;Quais obras foram realizadas no Piauí?&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "USER" ? "flex-row-reverse" : ""}`}
          >
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
              style={{
                backgroundColor:
                  msg.role === "USER" ? "var(--dark-navy)" : "var(--primary)",
              }}
            >
              {msg.role === "USER" ? (
                <User size={14} className="text-white" />
              ) : (
                <Bot size={14} className="text-white" />
              )}
            </div>
            <div className={`max-w-[75%] ${msg.role === "USER" ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  backgroundColor:
                    msg.role === "USER" ? "var(--dark-navy)" : "#F3F4F6",
                  color: msg.role === "USER" ? "white" : "#111827",
                  borderRadius:
                    msg.role === "USER"
                      ? "16px 4px 16px 16px"
                      : "4px 16px 16px 16px",
                }}
              >
                {msg.role === "USER" ? (
                  msg.content
                ) : msg.streaming && msg.content === "" ? (
                  <span className="inline-flex items-center gap-0.5 text-gray-400 text-sm">
                    Buscando sua resposta
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      >
                        .
                      </span>
                    ))}
                  </span>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children }) => <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-200 rounded p-2 my-2 text-xs overflow-x-auto">{children}</pre>,
                    }}
                  >
                    {stripInlineSources(msg.content)}
                  </ReactMarkdown>
                )}
                {msg.streaming && (
                  <span className="inline-block w-1 h-4 ml-1 rounded-sm animate-pulse"
                    style={{ backgroundColor: "var(--primary)" }} />
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (() => {
                // Group sources by atestadoId
                const grouped = msg.sources.reduce<Record<string, { atestadoId: string; filename: string; paginas: { pagina?: number; trecho?: string }[] }>>((acc, s) => {
                  if (!acc[s.atestadoId]) {
                    acc[s.atestadoId] = { atestadoId: s.atestadoId, filename: s.filename, paginas: [] };
                  }
                  acc[s.atestadoId].paginas.push({ pagina: s.pagina, trecho: s.trecho });
                  return acc;
                }, {});
                return (
                  <div className="mt-2 flex flex-col gap-1">
                    <span className="text-xs text-gray-400 font-medium">Fontes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.values(grouped).map((g) => (
                        <div
                          key={g.atestadoId}
                          className="flex flex-col items-start text-xs px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 max-w-xs"
                        >
                          <span className="inline-flex items-center gap-1 font-medium">
                            <ExternalLink size={10} />
                            {g.filename ?? "Fonte"}
                          </span>
                          {g.paginas[0]?.trecho && (
                            <span className="text-orange-400 mt-0.5 leading-tight line-clamp-2 font-normal">
                              {g.paginas[0].trecho.length > 80 ? g.paginas[0].trecho.slice(0, 80) + "…" : g.paginas[0].trecho}
                            </span>
                          )}
                          {g.paginas.some((p) => p.pagina) && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {g.paginas.filter((p) => p.pagina).map((p, pi) => (
                                <button
                                  key={pi}
                                  onClick={() => openSourcePdf(g.atestadoId, p.pagina)}
                                  className="px-1.5 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-700 font-medium transition-colors cursor-pointer"
                                >
                                  p.{p.pagina}
                                </button>
                              ))}
                            </div>
                          )}
                          {g.paginas.every((p) => !p.pagina) && (
                            <button
                              onClick={() => openSourcePdf(g.atestadoId)}
                              className="mt-1 px-1.5 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-700 font-medium transition-colors cursor-pointer"
                            >
                              Abrir
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={isStreaming}
          placeholder="Faça uma pergunta sobre os atestados…"
          className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 disabled:opacity-60"
          style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          className="px-4 py-3 rounded-xl text-white flex items-center gap-2 text-sm font-medium disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {isStreaming ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
