import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchBinary } from "@/lib/fetch-binary";
import { getMeshyTask } from "@/lib/meshy";
import { scaleGlbToWidth } from "@/lib/scale-model";
import type { Dish } from "@/lib/types";

/**
 * Vê em que ponto está a tarefa da Meshy e, quando terminar,
 * descarrega o .glb, põe-no à escala real e guarda-o no Supabase.
 * É seguro chamar várias vezes seguidas (o painel faz polling).
 */
export async function syncDishModel(dish: Dish): Promise<Pick<Dish, "model_status" | "model_progress" | "model_error" | "model_url">> {
  const admin = createAdminClient();
  const current = {
    model_status: dish.model_status,
    model_progress: dish.model_progress,
    model_error: dish.model_error,
    model_url: dish.model_url,
  };
  if (dish.model_status !== "processing" || !dish.meshy_task_id) return current;

  const task = await getMeshyTask(dish.meshy_task_id);

  if (task.status === "FAILED" || task.status === "CANCELED") {
    const patch = {
      model_status: "failed" as const,
      model_error: task.task_error?.message || "A Meshy não conseguiu criar o modelo. Tenta outras fotos.",
    };
    await admin.from("dishes").update(patch).eq("id", dish.id);
    return { ...current, ...patch };
  }

  if (task.status !== "SUCCEEDED") {
    const progress = Math.max(0, Math.min(99, task.progress ?? 0));
    if (progress !== dish.model_progress) {
      await admin.from("dishes").update({ model_progress: progress }).eq("id", dish.id);
    }
    return { ...current, model_progress: progress };
  }

  // Terminou. Reclama o trabalho de finalizar (evita dois pedidos a fazerem o mesmo).
  const { data: claimed } = await admin
    .from("dishes")
    .update({ model_status: "finalizing", model_progress: 99 })
    .eq("id", dish.id)
    .eq("model_status", "processing")
    .select("id")
    .maybeSingle();
  if (!claimed) return { ...current, model_status: "finalizing", model_progress: 99 };

  try {
    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) throw new Error("A Meshy não devolveu ficheiro .glb.");
    const raw = await fetchBinary(glbUrl, { maxBytes: 80 * 1024 * 1024, timeoutMs: 45_000 });
    const scaled = await scaleGlbToWidth(raw, Number(dish.width_cm));

    const path = `${dish.restaurant_id}/${dish.id}-${Date.now()}.glb`;
    const up = await admin.storage
      .from("models")
      .upload(path, scaled, { contentType: "model/gltf-binary", upsert: false });
    if (up.error) throw up.error;
    const { data: pub } = admin.storage.from("models").getPublicUrl(path);

    const patch = { model_status: "ready" as const, model_progress: 100, model_error: null, model_url: pub.publicUrl };
    await admin.from("dishes").update(patch).eq("id", dish.id);
    return patch;
  } catch (e) {
    const patch = { model_status: "failed" as const, model_error: e instanceof Error ? e.message : String(e) };
    await admin.from("dishes").update(patch).eq("id", dish.id);
    return { ...current, ...patch };
  }
}

/** Volta a escalar o modelo que já existe (quando o dono muda a largura em cm). */
export async function rescaleExistingModel(dish: Dish, widthCm: number) {
  if (!dish.model_url) return;
  const admin = createAdminClient();
  const raw = await fetchBinary(dish.model_url, { maxBytes: 80 * 1024 * 1024, timeoutMs: 45_000 });
  const scaled = await scaleGlbToWidth(raw, widthCm);
  const path = `${dish.restaurant_id}/${dish.id}-${Date.now()}.glb`;
  const up = await admin.storage.from("models").upload(path, scaled, { contentType: "model/gltf-binary", upsert: false });
  if (up.error) throw up.error;
  const { data: pub } = admin.storage.from("models").getPublicUrl(path);
  await admin.from("dishes").update({ model_url: pub.publicUrl }).eq("id", dish.id);
}
