import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ivory flex items-center justify-center px-6 text-center">
      <div>
        <p className="text-xs tracking-[0.3em] uppercase text-sage mb-3">404</p>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Page introuvable</h1>
        <p className="mt-2 text-sm text-text-secondary max-w-sm">
          Le lien que vous avez suivi n&apos;existe pas ou n&apos;est plus valide.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-eucalyptus px-5 py-2.5 text-sm font-medium text-ivory hover:bg-eucalyptus/90"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
