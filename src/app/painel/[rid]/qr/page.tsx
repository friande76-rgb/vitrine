import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { Restaurant } from "@/lib/types";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "QR codes" };

export default async function QrPage({ params, searchParams }: { params: Promise<{ rid: string }>; searchParams: Promise<{ mesas?: string }> }) {
  const { rid } = await params;
  const mesas = Math.max(0, Math.min(60, Number((await searchParams).mesas ?? 6) || 0));
  const supabase = await createClient();
  const { data: r } = await supabase.from("restaurants").select("*").eq("id", rid).maybeSingle<Restaurant>();
  if (!r) notFound();

  const fr = r.default_lang === "fr";
  const base = `${env.siteUrl()}/m/${r.slug}`;
  const items = [
    { label: fr ? "Carte" : "Menu", mesa: "", url: base },
    ...Array.from({ length: mesas }, (_, i) => ({
      label: `${fr ? "Table" : "Mesa"} ${i + 1}`,
      mesa: String(i + 1),
      url: `${base}?mesa=${i + 1}`,
    })),
  ];
  const svgs = await Promise.all(items.map((it) => QRCode.toString(it.url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })));

  return (
    <main className="grid gap-8">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/painel/${rid}`} className="text-sm text-muted hover:text-ink">← {r.name}</Link>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">QR codes</h1>
          <p className="text-muted">Um QR geral e um por mesa (para saberes de que mesa vêm as visitas).</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <form className="flex items-end gap-2">
            <label className="field">
              Nº de mesas
              <input id="mesas" name="mesas" type="number" min={0} max={60} defaultValue={mesas} className="input w-24 font-mono" />
            </label>
            <button className="btn-ghost">Atualizar</button>
          </form>
          <PrintButton />
        </div>
      </div>
      {env.siteUrl().includes("localhost") && (
        <p className="no-print card border-pit/50 p-4 text-sm text-pit">
          Atenção: os QR apontam para localhost. Define NEXT_PUBLIC_SITE_URL com o endereço público antes de imprimir.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-6">
        {items.map((it, i) => (
          <li key={it.url} className="card grid justify-items-center gap-2 p-5 text-center [break-inside:avoid] print:border-black">
            <p className="font-display text-lg font-extrabold">{r.name}</p>
            <div className="w-full max-w-[200px] text-ink [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svgs[i] }} />
            <p className="text-sm">{fr ? "Voyez les plats sur votre table" : "Veja os pratos na sua mesa"}</p>
            <p className="label-mono">{it.label}</p>
            <a href={`/api/qr?slug=${r.slug}&mesa=${it.mesa}`} className="no-print text-sm font-semibold text-accent underline underline-offset-4">
              Descarregar PNG
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
