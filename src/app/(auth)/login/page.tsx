import { redirect } from "next/navigation";
import { getSessionContext } from "@/modules/auth/service";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion — Mariage System" };

export default async function LoginPage() {
  const ctx = await getSessionContext();
  if (ctx) redirect(ctx.role === "CHECKIN" ? "/admin/check-in" : "/admin/dashboard");

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-eucalyptus text-ivory p-12 relative overflow-hidden">
        <svg
          className="absolute -bottom-24 -left-24 opacity-20"
          width="420"
          height="420"
          viewBox="0 0 420 420"
          fill="none"
        >
          <path
            d="M20 400 C 80 280, 160 180, 320 60 M60 380 C 110 300, 170 230, 260 150 M100 360 C 130 310, 170 270, 220 230"
            stroke="#C9B995"
            strokeWidth="1.5"
          />
        </svg>
        <div className="relative z-10">
          <p className="text-xs tracking-[0.3em] uppercase text-champagne mb-2">Mariage System</p>
          <h1 className="font-display text-4xl leading-tight">
            Chaque invitation
            <br />
            raconte votre histoire.
          </h1>
        </div>
        <p className="relative z-10 text-sm text-soft-sage max-w-sm">
          Gérez vos invités, générez des invitations élégantes et contrôlez les entrées le jour J — en toute
          simplicité.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 text-center lg:text-left">
            <p className="text-xs tracking-[0.3em] uppercase text-sage mb-2 lg:hidden">Mariage System</p>
            <h2 className="font-display text-2xl font-semibold text-text-primary">Bon retour</h2>
            <p className="text-sm text-text-secondary mt-1">Connectez-vous pour gérer votre mariage.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
