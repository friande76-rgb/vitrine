import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteDish, togglePublished, updateDish } from "@/app/actions/dishes";
import { DishForm } from "@/components/DishForm";
import { StatusChip } from "@/components/StatusChip";
import type { Dish } from "@/lib/types";
import { PhotoUploader } from "./PhotoUploader";
import { ModelPanel } from "./ModelPanel";

export const maxDuration = 60;

export default async function DishPage({ params }: { params: Promise<{ rid: string; did: string }> }) {
  const { rid, did } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: dish } = await supabase
    .from("dishes")
    .select("*, restaurants!inner(owner_id)")
    .eq("id", did)
    .eq("restaurant_id", rid)
    .eq("restaurants.owner_id", claims?.claims?.sub ?? "")
    .maybeSingle<Dish>();
  if (!dish) notFound();

  const working = dish.model_status === "processing" || dish.model_status === "finalizing";

  return (
    <main className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/painel/${rid}`} className="text-sm text-muted hover:text-ink">← Pratos</Link>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{dish.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusChip status={dish.model_status} />
            <span className="text-sm text-muted">{dish.published ? "Visível no menu" : "Rascunho — não aparece no menu"}</span>
          </div>
        </div>
        <form action={togglePublished.bind(null, dish.id)}>
          <button className={dish.published ? "btn-ghost" : "btn-primary"}>
            {dish.published ? "Esconder do menu" : "Publicar no menu"}
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="card grid content-start gap-4 p-6">
          <h2 className="font-display text-2xl font-semibold">1 · Fotos</h2>
          <PhotoUploader restaurantId={rid} dishId={dish.id} initial={dish.photo_paths} locked={working} />
        </section>
        <section className="card grid content-start gap-4 p-6">
          <h2 className="font-display text-2xl font-semibold">2 · Modelo 3D</h2>
          <ModelPanel key={`${dish.model_status}-${dish.model_url}-${dish.photo_paths.length}`} dish={dish} />
        </section>
      </div>

      <section className="card grid gap-4 p-6">
        <h2 className="font-display text-2xl font-semibold">Detalhes</h2>
        <DishForm action={updateDish.bind(null, dish.id)} dish={dish} submitLabel="Guardar" />
      </section>

      <form action={deleteDish.bind(null, dish.id)} className="justify-self-start">
        <button className="btn-danger">Apagar prato</button>
      </form>
    </main>
  );
}
