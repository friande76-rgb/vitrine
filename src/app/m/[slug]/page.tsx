import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Lang, PublicDish, PublicRestaurant } from "@/lib/types";
import { MenuView } from "./MenuView";
import { env } from "@/lib/env";

export const revalidate = 30;

async function load(slug: string) {
  const supabase = createClient(env.supabaseUrl(), env.supabaseKey());
  // Select explícito: o menu público nunca devolve owner_id, meshy_task_id,
  // model_error nem pratos por publicar.
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, city, default_lang")
    .eq("slug", slug)
    .maybeSingle<PublicRestaurant>();
  if (!restaurant) return null;
  const { data: dishes } = await supabase
    .from("dishes")
    .select(
      "id, name, name_fr, description, description_fr, category, price_cents, width_cm, serves, photo_paths, model_url",
    )
    .eq("restaurant_id", restaurant.id)
    .eq("published", true)
    .not("model_url", "is", null)
    .order("position");
  return { restaurant, dishes: (dishes ?? []) as PublicDish[] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  return { title: data?.restaurant.name ?? "Menu" };
}

export default async function MenuPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string; mesa?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await load(slug);
  if (!data) notFound();
  const lang: Lang = sp.lang === "fr" || sp.lang === "pt" ? sp.lang : data.restaurant.default_lang;
  return <MenuView restaurant={data.restaurant} dishes={data.dishes} initialLang={lang} table={sp.mesa?.slice(0, 10)} />;
}
