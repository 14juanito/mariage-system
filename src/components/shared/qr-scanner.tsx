"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff } from "lucide-react";

export function QrScanner({
  active,
  onDetect,
}: {
  active: boolean;
  onDetect: (data: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      onDetect(code.data);
      return; // le parent contrôle la reprise via `active`
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onDetect]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    setError(null);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        setError("Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.");
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active, tick]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-soft-sage bg-white/60 aspect-square max-w-sm mx-auto px-6 text-center">
        <CameraOff className="h-8 w-8 text-text-secondary" />
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-sm aspect-square overflow-hidden rounded-lg bg-eucalyptus">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-ivory/80" />
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-px bg-champagne/80" />
    </div>
  );
}
