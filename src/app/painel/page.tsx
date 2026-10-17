import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";
import { NewRestaurantForm } from "./NewRestaurantForm";

export const metadata = { title: "Painel" };

export default async function Painel() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", claims?.claims?.sub ?? "")
    .order("created_at");
  const restaurants = (data ?? []) as Restaurant[];

  return (
    <main className="grid gap-10">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Os teus restaurantes</h1>
        <p className="text-muted">Cada restaurante tem o seu menu, os seus pratos e os seus QR codes.</p>
      </div>
      {restaurants.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {restaurants.map((r) => (
            <li key={r.id}>
              <Link href={`/painel/${r.id}`} className="card flex items-center justify-between gap-4 p-5 hover:border-accent">
                <span>
                  <span className="block font-display text-xl font-semibold">{r.name}</span>
                  <span className="label-mono">/m/{r.slug}{r.city ? ` · ${r.city}` : ""}</span>
                </span>
                <span aria-hidden className="text-muted">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="card grid gap-4 p-6">
        <h2 className="font-display text-2xl font-semibold">{restaurants.length ? "Adicionar restaurante" : "Começa pelo teu restaurante"}</h2>
        <NewRestaurantForm />
      </section>
    </main>
  );
}
