"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending, className = "btn-primary" }: { children: React.ReactNode; pending?: string; className?: string }) {
  const s = useFormStatus();
  return (
    <button type="submit" disabled={s.pending} className={className}>
      {s.pending ? (pending ?? "A guardar…") : children}
    </button>
  );
}
