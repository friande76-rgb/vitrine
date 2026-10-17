import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDish } from "@/app/actions/dishes";
import { DishForm } from "@/components/DishForm";
import { StatusChip } from "@/components/StatusChip";
import { euros, photoUrl } from "@/lib/format";
import type { Dish, Restaurant } from "@/lib/types";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 864e5).toISOString();
}

export default async function RestaurantPage({ params }: { params: Promise<{ rid: string }> }) {
  const { rid } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: r } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", rid)
    .eq("owner_id", claims?.claims?.sub ?? "")
    .maybeSingle<Restaurant>();
  if (!r) notFound();

  const since = daysAgo(30);
  const [{ data: dishData }, menuViews, arViews] = await Promise.all([
    supabase.from("dishes").select("*").eq("restaurant_id", rid).order("position"),
    supabase.from("menu_views").select("id", { count: "exact", head: true }).eq("restaurant_id", rid).eq("kind", "menu").gte("created_at", since),
    supabase.from("menu_views").select("id", { count: "exact", head: true }).eq("restaurant_id", rid).eq("kind", "ar").gte("created_at", since),
  ]);
  const dishes = (dishData ?? []) as Dish[];
  const createForThis = createDish.bind(null, rid);

  return (
    <main className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/painel" className="text-sm text-muted hover:text-ink">← Restaurantes</Link>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{r.name}</h1>
          <p className="label-mono mt-1">/m/{r.slug}{r.city ? ` · ${r.city}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/m/${r.slug}`} target="_blank" className="btn-ghost">Abrir menu</Link>
          <Link href={`/painel/${r.id}/qr`} className="btn-primary">QR codes</Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Pratos", dishes.length],
          ["Com 3D", dishes.filter((d) => d.model_status === "ready").length],
          ["Menus abertos · 30 dias", menuViews.count ?? 0],
          ["Pratos na mesa (AR) · 30 dias", arViews.count ?? 0],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="label-mono">{k}</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-3">
        <h2 className="font-display text-2xl font-semibold">Pratos</h2>
        {dishes.length === 0 ? (
          <p className="text-muted">Ainda não há pratos. Adiciona o primeiro abaixo.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {dishes.map((d) => (
              <li key={d.id}>
                <Link href={`/painel/${r.id}/pratos/${d.id}`} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 p-3 hover:bg-ink/[0.03]">
                  <span className="size-14 overflow-hidden rounded-xl bg-stage">
                    {d.photo_paths[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(d.photo_paths[0])} alt="" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{d.name}</span>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="font-mono">{euros(d.price_cents)}</span>
                      <StatusChip status={d.model_status} />
                      {!d.published && <span className="text-xs">· rascunho</span>}
                    </span>
                  </span>
                  <span aria-hidden className="text-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card grid gap-4 p-6">
        <h2 className="font-display text-2xl font-semibold">Novo prato</h2>
        <DishForm action={createForThis} submitLabel="Criar e carregar fotos" />
      </section>
    </main>
  );
}
