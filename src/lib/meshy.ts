import "server-only";
import { env } from "@/lib/env";

const BASE = "https://api.meshy.ai/openapi/v1/multi-image-to-3d";

export type MeshyStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type MeshyTask = {
  id: string;
  status: MeshyStatus;
  progress: number;
  model_urls?: { glb?: string };
  thumbnail_url?: string;
  task_error?: { message?: string };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.meshyKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    // Sem isto, um pedido pendurado prende a rota até ao limite da Vercel.
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meshy ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Cria a tarefa foto→3D. Recebe 1 a 4 URLs públicos de fotos do mesmo prato. */
export async function createMeshyTask(imageUrls: string[]): Promise<string> {
  const { result } = await call<{ result: string }>("", {
    method: "POST",
    body: JSON.stringify({
      image_urls: imageUrls.slice(0, 4),
      ai_model: "latest",
      should_texture: true,
      enable_pbr: false,
      should_remesh: true,
      topology: "triangle",
      target_polycount: 60000, // detalhe bom e ficheiro leve para telemóvel
      texture_resolution: "2k",
      image_enhancement: true,
      remove_lighting: true,
      target_formats: ["glb"],
    }),
  });
  return result;
}

export async function getMeshyTask(id: string): Promise<MeshyTask> {
  return call<MeshyTask>(`/${encodeURIComponent(id)}`);
}
