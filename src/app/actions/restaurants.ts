"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseForm, restaurantInput } from "@/lib/contracts/dish";
import { slugify } from "@/lib/format";

export type FormState = { error?: string };

export async function createRestaurant(_: FormState, form: FormData): Promise<FormState> {
  // O endereço é normalizado antes de validar: "Tasca do Largo" → "tasca-do-largo".
  const raw = new FormData();
  for (const [k, v] of form.entries()) raw.set(k, v);
  raw.set("slug", slugify(String(form.get("slug") || "") || String(form.get("name") || "")));

  const parsed = parseForm(restaurantInput, raw);
  if (!parsed.ok) return { error: parsed.error };
  const { name, slug, city, default_lang } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .insert({ name, slug, city, default_lang })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: `O endereço "${slug}" já está ocupado. Escolhe outro.` };
    return { error: error.message };
  }
  revalidatePath("/painel");
  redirect(`/painel/${data.id}`);
}

export async function updateRestaurant(id: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = parseForm(restaurantInput.omit({ slug: true }), form);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("restaurants").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/painel/${id}`);
  return {};
}
