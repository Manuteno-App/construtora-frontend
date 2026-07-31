"use client";

import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Ruler, Shield, Upload, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/edital", label: "Pesquisa", icon: Shield },
  { href: "/chat", label: "Chat IA", icon: MessageSquare },
  { href: "/atestados", label: "Atestados", icon: FileText },
  { href: "/unidades", label: "Unidades", icon: Ruler },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-4 lg:hidden" style={{ backgroundColor: "var(--dark-navy)" }}>
        <div className="flex items-center gap-2 text-white"><div className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm" style={{ backgroundColor: "var(--primary)" }}>CS</div><span className="font-semibold text-sm">Construtora Sucesso</span></div>
        <button onClick={() => setIsOpen(true)} className="p-2 text-white" aria-label="Abrir menu"><Menu size={22} /></button>
      </header>
      {isOpen && <button className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setIsOpen(false)} aria-label="Fechar menu" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform lg:w-[262px] lg:translate-x-0", isOpen ? "translate-x-0" : "-translate-x-full")} style={{ backgroundColor: "var(--dark-navy)" }}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10"><div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "var(--primary)" }}>CS</div><div><p className="text-white font-semibold text-sm leading-tight">Construtora Sucesso</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Document Intelligence</p></div></div>
        <button onClick={() => setIsOpen(false)} className="absolute right-3 top-4 p-2 text-white/70 lg:hidden" aria-label="Fechar menu"><X size={20} /></button>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setIsOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", active ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5")} style={active ? { backgroundColor: "var(--primary)" } : {}}><Icon size={18} />{label}</Link>;
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 space-y-3">{user && <div><p className="text-xs font-medium text-white/70 truncate">{user.name}</p><p className="text-xs text-white/40 truncate">{user.email}</p></div>}<button onClick={() => void logout()} className="flex w-full items-center gap-2 text-xs text-white/50 hover:text-white/80"><LogOut size={14} />Sair</button><p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>? 2026 Construtora Sucesso</p></div>
      </aside>
    </>
  );
}
