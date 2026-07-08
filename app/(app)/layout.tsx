import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "next-auth/react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-56">
          <div className="px-4 pt-16 pb-24 lg:p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
