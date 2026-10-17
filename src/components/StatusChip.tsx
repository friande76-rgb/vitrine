import type { ModelStatus } from "@/lib/types";

const MAP: Record<ModelStatus, { label: string; cls: string }> = {
  none: { label: "Sem 3D", cls: "border-line text-muted" },
  processing: { label: "A criar 3D", cls: "border-pit/50 text-pit" },
  finalizing: { label: "A finalizar", cls: "border-pit/50 text-pit" },
  ready: { label: "3D pronto", cls: "border-accent/60 text-accent" },
  failed: { label: "3D falhou", cls: "border-danger/60 text-danger" },
};

export function StatusChip({ status }: { status: ModelStatus }) {
  const m = MAP[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}
