"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, ScanLine, AlertTriangle } from "lucide-react";
import { QrScanner } from "@/components/shared/qr-scanner";
import { Button } from "@/components/ui/button";
import { formatTimeFr } from "@/lib/utils";
import type { ScanOutcome } from "@/types";

export function CheckInScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDetect = useCallback(async (data: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/check-in/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data }),
      });
      if (res.status === 429) {
        setResult({ result: "INVALID" });
      } else {
        const outcome: ScanOutcome = await res.json();
        setResult(outcome);
      }
    } catch {
      setResult({ result: "INVALID" });
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }, []);

  function startScanning() {
    setResult(null);
    setScanning(true);
  }

  if (result) {
    return <ResultScreen outcome={result} onScanNext={startScanning} />;
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Contrôle d&apos;accès</h1>
        <p className="text-sm text-text-secondary mt-1">
          Positionnez le QR code de l&apos;invitation devant la caméra.
        </p>
      </div>

      {scanning ? (
        <QrScanner active={scanning} onDetect={handleDetect} />
      ) : (
        <div className="flex aspect-square max-w-sm w-full items-center justify-center rounded-lg border border-dashed border-soft-sage bg-white/60">
          <ScanLine className="h-10 w-10 text-sage" />
        </div>
      )}

      <Button size="lg" className="w-full max-w-sm" onClick={() => (scanning ? setScanning(false) : startScanning())} disabled={busy}>
        {busy ? "Vérification…" : scanning ? "Arrêter" : "Scanner"}
      </Button>
    </div>
  );
}

function ResultScreen({ outcome, onScanNext }: { outcome: ScanOutcome; onScanNext: () => void }) {
  const config = {
    VALID: {
      icon: CheckCircle2,
      iconClass: "text-success bg-success/10",
      title: "Entrée autorisée",
      titleClass: "text-success",
    },
    ALREADY_USED: {
      icon: XCircle,
      iconClass: "text-error bg-error/10",
      title: "Invitation déjà utilisée",
      titleClass: "text-error",
    },
    INVALID: {
      icon: XCircle,
      iconClass: "text-error bg-error/10",
      title: "Invitation invalide",
      titleClass: "text-error",
    },
    DISABLED: {
      icon: AlertTriangle,
      iconClass: "text-warning bg-warning/15",
      title: "Invitation désactivée",
      titleClass: "text-[#8a6a25]",
    },
  }[outcome.result];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-5 text-center animate-scale-in">
      <div className={`flex h-24 w-24 items-center justify-center rounded-full ${config.iconClass}`}>
        <Icon className="h-12 w-12" />
      </div>
      <div>
        <h1 className={`font-display text-2xl font-semibold ${config.titleClass}`}>{config.title}</h1>
        {outcome.guestName ? (
          <p className="mt-1 text-lg font-medium text-text-primary">{outcome.guestName}</p>
        ) : null}
      </div>

      {outcome.result === "VALID" && outcome.scannedAt ? (
        <p className="text-sm text-text-secondary">
          Bienvenue à la célébration. <span className="font-medium">{formatTimeFr(outcome.scannedAt)}</span>
        </p>
      ) : null}

      {outcome.result === "ALREADY_USED" ? (
        <div className="text-sm text-text-secondary">
          <p>Cette invitation a déjà été utilisée.</p>
          {outcome.firstScanAt ? (
            <p className="mt-1">
              Premier passage : <span className="font-medium">{formatTimeFr(outcome.firstScanAt)}</span>
            </p>
          ) : null}
          <p className="mt-1 font-medium text-error">Entrée refusée.</p>
        </div>
      ) : null}

      {outcome.result === "INVALID" ? (
        <p className="text-sm text-text-secondary">Cette invitation n&apos;est pas reconnue.</p>
      ) : null}

      {outcome.result === "DISABLED" ? (
        <p className="text-sm text-text-secondary">Cette invitation a été désactivée par les mariés.</p>
      ) : null}

      <Button size="lg" className="w-full max-w-sm" onClick={onScanNext}>
        Scanner l&apos;invitation suivante
      </Button>
    </div>
  );
}
