"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModelViewer } from "@/components/ModelViewer";
import { euros, photoUrl } from "@/lib/format";
import type { Lang, PublicDish, PublicRestaurant } from "@/lib/types";

const T = {
  pt: { table: "Mesa", see3d: "Ver em 3D", ar: "Ver na minha mesa", hint: "Arraste para girar", serves: (n: number) => `serve ${n}`, close: "Fechar", empty: "O menu ainda está a ser preparado.", other: "Outros" },
  fr: { table: "Table", see3d: "Voir en 3D", ar: "Voir sur ma table", hint: "Glissez pour tourner", serves: (n: number) => `${n} pers.`, close: "Fermer", empty: "La carte est en préparation.", other: "Autres" },
};

function track(body: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/views", blob)) fetch("/api/views", { method: "POST", body: JSON.stringify(body), keepalive: true });
}

export function MenuView({ restaurant, dishes, initialLang, table }: { restaurant: PublicRestaurant; dishes: PublicDish[]; initialLang: Lang; table?: string }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [open, setOpen] = useState<PublicDish | null>(null);
  const t = T[lang];
  const name = (d: PublicDish) => (lang === "fr" && d.name_fr) || d.name;
  const desc = (d: PublicDish) => (lang === "fr" && d.description_fr) || d.description;

  useEffect(() => {
    track({ restaurant_id: restaurant.id, kind: "menu", table });
  }, [restaurant.id, table]);

  useEffect(() => {
    document.documentElement.lang = lang;
    const u = new URL(location.href);
    u.searchParams.set("lang", lang);
    history.replaceState(null, "", u);
  }, [lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, PublicDish[]>();
    for (const d of dishes) {
      const k = d.category || t.other;
      m.set(k, [...(m.get(k) ?? []), d]);
    }
    return [...m.entries()];
  }, [dishes, t.other]);

  const openDish = (d: PublicDish) => {
    setOpen(d);
    track({ restaurant_id: restaurant.id, dish_id: d.id, kind: "3d", table });
  };
  const onAr = useCallback(() => {
    if (open) track({ restaurant_id: restaurant.id, dish_id: open.id, kind: "ar", table });
  }, [open, restaurant.id, table]);

  return (
    <main className="mx-auto max-w-xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-ground/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{restaurant.name}</h1>
          {table && <p className="label-mono">{t.table} {table}</p>}
        </div>
        <div role="group" aria-label="Língua / Langue" className="flex rounded-full border border-line bg-surface p-[3px]">
          {(["pt", "fr"] as const).map((l) => (
            <button
              key={l}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold tracking-wide ${lang === l ? "bg-ink text-ground" : "text-muted"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {dishes.length === 0 && <p className="py-20 text-center text-muted">{t.empty}</p>}

      {groups.map(([cat, list]) => (
        <section key={cat} className="pt-6">
          <h2 className="label-mono border-b border-line pb-2">{cat}</h2>
          <ul>
            {list.map((d) => {
              const has3d = Boolean(d.model_url);
              return (
                <li key={d.id} className="border-b border-line">
                  <button
                    type="button"
                    disabled={!has3d}
                    onClick={() => has3d && openDish(d)}
                    className="grid w-full grid-cols-[76px_1fr] gap-4 py-4 text-left disabled:cursor-default"
                  >
                    <span className="size-[76px] overflow-hidden rounded-2xl bg-stage">
                      {d.photo_paths[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl(d.photo_paths[0])} alt="" loading="lazy" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="grid min-w-0 content-center gap-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{name(d)}</span>
                        <span className="shrink-0 font-mono text-sm tabular-nums">{euros(d.price_cents, lang)}</span>
                      </span>
                      {desc(d) && <span className="text-sm text-muted">{desc(d)}</span>}
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-mono">{Number(d.width_cm)} cm · {t.serves(d.serves)}</span>
                        {has3d && <span className="ml-auto rounded-full border border-accent px-2.5 py-0.5 font-semibold text-accent">{t.see3d}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {open && open.model_url && (
        <div role="dialog" aria-modal="true" aria-label={name(open)} className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center" onClick={() => setOpen(null)}>
          <div className="w-full max-w-xl rounded-t-3xl bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-extrabold">{name(open)}</p>
                <p className="font-mono text-sm text-muted">{euros(open.price_cents, lang)} · {Number(open.width_cm)} cm · {t.serves(open.serves)}</p>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold">{t.close}</button>
            </div>
            <ModelViewer
              key={open.id}
              src={open.model_url}
              alt={name(open)}
              arLabel={t.ar}
              hint={t.hint}
              widthCm={Number(open.width_cm)}
              poster={open.photo_paths[0] ? photoUrl(open.photo_paths[0]) : undefined}
              onAr={onAr}
              className="aspect-square w-full"
            />
          </div>
        </div>
      )}
    </main>
  );
}
