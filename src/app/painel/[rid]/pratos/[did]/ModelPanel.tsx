"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startModel } from "@/app/actions/dishes";
import { ModelViewer } from "@/components/ModelViewer";
import type { Dish } from "@/lib/types";

type Live = Pick<Dish, "model_status" | "model_progress" | "model_error" | "model_url">;

export function ModelPanel({ dish }: { dish: Dish }) {
  const [live, setLive] = useState<Live>(dish);
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const working = live.model_status === "processing" || live.model_status === "finalizing";

  // Enquanto a Meshy trabalha, pergunta o estado a cada 5 segundos.
  useEffect(() => {
    if (!working) return;
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/dishes/${dish.id}/model`, { cache: "no-store" });
      const json = await res.json();
      if (stop) return;
      if (!res.ok) return setMsg(json.error);
      setLive(json);
      if (json.model_status === "ready" || json.model_status === "failed") router.refresh();
    };
    const t = setInterval(tick, 5000);
    tick();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [working, dish.id, router]);

  const generate = () =>
    start(async () => {
      setMsg(undefined);
      const r = await startModel(dish.id);
      if (r.error) setMsg(r.error);
      else setLive((l) => ({ ...l, model_status: "processing", model_progress: 0, model_error: null }));
    });

  return (
    <div className="grid gap-4">
      {live.model_status === "ready" && live.model_url ? (
        <ModelViewer
          src={live.model_url}
          alt={dish.name}
          widthCm={Number(dish.width_cm)}
          hint="Arrasta para girar"
          className="aspect-[4/3] w-full"
        />
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center rounded-3xl bg-stage p-6 text-center">
          {working ? (
            <div className="grid w-full max-w-xs gap-3">
              <p className="font-display text-xl font-semibold">
                {live.model_status === "finalizing" ? "A pôr à escala real…" : "A criar o modelo 3D"}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={live.model_progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${live.model_progress}%` }} />
              </div>
              <p className="font-mono text-sm tabular-nums text-muted">{live.model_progress}% · demora 2 a 5 min</p>
              <p className="text-xs text-muted">Podes sair desta página. Continua quando voltares.</p>
            </div>
          ) : live.model_status === "failed" ? (
            <p className="max-w-sm text-danger">{live.model_error}</p>
          ) : (
            <p className="max-w-xs text-muted">Carrega as fotos e carrega em “Gerar 3D”.</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generate} disabled={pending || working || dish.photo_paths.length === 0} className={live.model_status === "ready" ? "btn-ghost" : "btn-primary"}>
          {pending ? "A enviar…" : live.model_status === "ready" ? "Gerar de novo" : live.model_status === "failed" ? "Tentar outra vez" : "Gerar 3D"}
        </button>
        {dish.photo_paths.length > 0 && dish.photo_paths.length < 3 && !working && (
          <span className="text-sm text-muted">Com 3–4 fotos o resultado fica melhor.</span>
        )}
        {msg && <span role="alert" className="text-sm text-danger">{msg}</span>}
      </div>
    </div>
  );
}
