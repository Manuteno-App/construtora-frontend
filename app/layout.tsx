import Sidebar from "@/components/sidebar";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Construtora Sucesso — Document Intelligence",
  description: "Sistema de análise inteligente de atestados de obras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex" style={{ backgroundColor: "var(--background)" }}>
        <Providers>
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen p-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
