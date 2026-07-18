import Sidebar from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen min-w-0 px-4 pb-6 pt-20 sm:px-6 lg:p-8">
        {children}
      </main>
    </>
  );
}
