"use client";

import { useAuth } from "@/components/auth-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Credenciais inválidas");
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "var(--dark-navy)" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "var(--primary)" }}
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ backgroundColor: "var(--primary)" }}
        />
        <div
          className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-5"
          style={{ backgroundColor: "var(--primary-light)" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg"
            style={{ backgroundColor: "var(--primary)" }}
          >
            CS
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">Construtora Sucesso</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Document Intelligence
            </p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(232,93,4,0.15)" }}
          >
            <Building2 size={32} style={{ color: "var(--primary)" }} />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gestão inteligente<br />de atestados
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Extraia, indexe e consulte informações de obras com IA. Tudo em um só lugar.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Extração automática", "Busca semântica", "Chat com IA", "Quantitativos"].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs relative z-10" style={{ color: "rgba(255,255,255,0.25)" }}>
          © 2026 Construtora Sucesso. Todos os direitos reservados.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-8 py-12"
        style={{ backgroundColor: "var(--background)" }}
      >
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "var(--primary)" }}
          >
            CS
          </div>
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Construtora Sucesso
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Entre com suas credenciais para acessar a plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--muted)" }}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: `1.5px solid ${errors.email ? "#ef4444" : "var(--border)"}`,
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => {
                    if (!errors.email) e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onBlur={(e) => {
                    if (!errors.email) e.currentTarget.style.borderColor = "var(--border)";
                  }}
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs" style={{ color: "#ef4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--muted)" }}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  className="w-full rounded-xl pl-10 pr-11 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: `1.5px solid ${errors.password ? "#ef4444" : "var(--border)"}`,
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => {
                    if (!errors.password) e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onBlur={(e) => {
                    if (!errors.password) e.currentTarget.style.borderColor = "var(--border)";
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--muted)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs" style={{ color: "#ef4444" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
              >
                <span className="mt-px text-base leading-none">⚠</span>
                <p style={{ color: "#dc2626" }}>{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--primary)" }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = "var(--primary-dark)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary)";
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando…
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
