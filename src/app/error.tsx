"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-ivory flex items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-text-secondary max-w-sm">
          Quelque chose ne s&apos;est pas passé comme prévu. Vous pouvez réessayer, ou revenir plus tard.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-eucalyptus px-5 py-2.5 text-sm font-medium text-ivory hover:bg-eucalyptus/90"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
