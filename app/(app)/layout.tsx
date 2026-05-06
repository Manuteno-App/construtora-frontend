import Sidebar from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen p-8">
        {children}
      </main>
    </>
  );
}
