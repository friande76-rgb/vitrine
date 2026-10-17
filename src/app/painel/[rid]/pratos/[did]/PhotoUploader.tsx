"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { savePhotos } from "@/app/actions/dishes";
import { photoUrl } from "@/lib/format";

/** Reduz a foto para no máximo 2048px e converte para JPEG (resolve também fotos HEIC do iPhone). */
async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Foto inválida"))), "image/jpeg", 0.9));
}

export function PhotoUploader({ restaurantId, dishId, initial, locked }: { restaurantId: string; dishId: string; initial: string[]; locked: boolean }) {
  const [paths, setPaths] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function persist(next: string[]) {
    setPaths(next);
    await savePhotos(dishId, next);
    startTransition(() => router.refresh());
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(undefined);
    setBusy(true);
    const supabase = createClient();
    try {
      const room = 4 - paths.length;
      const added: string[] = [];
      for (const f of Array.from(files).slice(0, room)) {
        const blob = await toJpeg(f);
        const path = `${restaurantId}/${dishId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        added.push(path);
      }
      await persist([...paths, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro a carregar a foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(path: string) {
    const supabase = createClient();
    await supabase.storage.from("photos").remove([path]);
    await persist(paths.filter((p) => p !== path));
  }

  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {paths.map((p, i) => (
          <li key={p} className="relative aspect-square overflow-hidden rounded-xl bg-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(p)} alt={`Foto ${i + 1}`} className="size-full object-cover" />
            {!locked && (
              <button
                type="button"
                onClick={() => remove(p)}
                className="absolute right-2 top-2 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink"
              >
                Remover
              </button>
            )}
          </li>
        ))}
        {paths.length < 4 && !locked && (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-muted/60 text-sm font-semibold text-muted hover:border-accent hover:text-accent"
            >
              {busy ? "A carregar…" : `+ Foto ${paths.length + 1} de 4`}
            </button>
          </li>
        )}
      </ul>
      <input ref={input} id="photo-input" type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <p className="text-sm text-muted">
        Dicas: prato sozinho numa mesa lisa, boa luz, fotos à volta do prato (frente, lados, de cima a 45°). Nada de talheres ou copos à frente.
      </p>
    </div>
  );
}
