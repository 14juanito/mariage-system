"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "!bg-white !border !border-soft-sage/60 !shadow-soft !rounded-md !text-text-primary !font-sans",
          title: "!text-sm !font-medium",
          description: "!text-text-secondary !text-sm",
          success: "!text-success",
          error: "!text-error",
        },
      }}
    />
  );
}
