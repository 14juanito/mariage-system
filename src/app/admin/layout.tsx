import { redirect } from "next/navigation";
import { getSessionContext } from "@/modules/auth/service";
import { AdminNav } from "@/components/shared/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen bg-ivory">
      <AdminNav role={ctx.role} userName={ctx.name} weddingLabel={ctx.weddingLabel} />
      <div className="lg:pl-64">
        <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
