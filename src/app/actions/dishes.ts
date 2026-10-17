"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMeshyTask } from "@/lib/meshy";
import { rescaleExistingModel } from "@/lib/model-pipeline";
import { photoUrl } from "@/lib/format";
import { dishInput, parseForm } from "@/lib/contracts/dish";
import { allow, minutesUntil } from "@/lib/rate-limit";
import type { Dish } from "@/lib/types";

export type FormState = { error?: string; ok?: string };

async function getOwnedDish(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("dishes").select("*").eq("id", id).maybeSingle<Dish>();
  if (!data) throw new Error("Prato não encontrado.");
  return { supabase, dish: data };
}

export async function createDish(restaurantId: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = parseForm(dishInput, form);
  if (!parsed.ok) return { error: parsed.error };
  const values = parsed.data;
  const supabase = await createClient();
  const { count } = await supabase
    .from("dishes")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  const { data, error } = await supabase
    .from("dishes")
    .insert({ ...values, restaurant_id: restaurantId, position: count ?? 0 })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(`/painel/${restaurantId}/pratos/${data.id}`);
}

export async function updateDish(id: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = parseForm(dishInput, form);
  if (!parsed.ok) return { error: parsed.error };
  const values = parsed.data;
  const { supabase, dish } = await getOwnedDish(id);
  const { error } = await supabase.from("dishes").update(values).eq("id", id);
  if (error) return { error: error.message };
  if (dish.model_status === "ready" && Number(dish.width_cm) !== values.width_cm) {
    await rescaleExistingModel(dish, values.width_cm);
  }
  revalidatePath(`/painel/${dish.restaurant_id}`, "layout");
  return { ok: "Guardado." };
}

export async function savePhotos(id: string, paths: string[]) {
  const { supabase, dish } = await getOwnedDish(id);
  const clean = paths.filter((p) => p.startsWith(`${dish.restaurant_id}/${dish.id}/`)).slice(0, 4);
  const { error } = await supabase.from("dishes").update({ photo_paths: clean }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/painel/${dish.restaurant_id}/pratos/${id}`);
}

export async function startModel(id: string): Promise<FormState> {
  const { supabase, dish } = await getOwnedDish(id);
  if (dish.photo_paths.length === 0) return { error: "Carrega pelo menos 1 foto (idealmente 3 ou 4)." };
  if (dish.model_status === "processing" || dish.model_status === "finalizing")
    return { error: "O modelo já está a ser criado." };

  // Cada modelo gasta créditos pagos na Meshy: limitamos por utilizador.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? "anon";
  const hourly = await allow(`model:hour:${userId}`, 10, 60);
  if (!hourly.allowed)
    return { error: `Já criaste ${hourly.limit} modelos nesta hora. Tenta daqui a ${minutesUntil(hourly.resetAt)} min.` };
  const daily = await allow(`model:day:${userId}`, 40, 60 * 24);
  if (!daily.allowed) return { error: "Limite diário de 40 modelos atingido. Continua amanhã." };

  try {
    const taskId = await createMeshyTask(dish.photo_paths.map(photoUrl));
    const { error } = await supabase
      .from("dishes")
      .update({ meshy_task_id: taskId, model_status: "processing", model_progress: 0, model_error: null })
      .eq("id", id);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro a contactar a Meshy." };
  }
  revalidatePath(`/painel/${dish.restaurant_id}/pratos/${id}`);
  return { ok: "A criar o modelo 3D…" };
}

export async function togglePublished(id: string) {
  const { supabase, dish } = await getOwnedDish(id);
  await supabase.from("dishes").update({ published: !dish.published }).eq("id", id);
  revalidatePath(`/painel/${dish.restaurant_id}`, "layout");
}

export async function deleteDish(id: string) {
  const { supabase, dish } = await getOwnedDish(id);
  if (dish.photo_paths.length) await supabase.storage.from("photos").remove(dish.photo_paths);
  await supabase.from("dishes").delete().eq("id", id);
  revalidatePath(`/painel/${dish.restaurant_id}`);
  redirect(`/painel/${dish.restaurant_id}`);
}
