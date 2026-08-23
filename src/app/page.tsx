import { redirect } from "next/navigation";
import { getSessionContext } from "@/modules/auth/service";

export default async function RootPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  redirect(ctx.role === "CHECKIN" ? "/admin/check-in" : "/admin/dashboard");
}
