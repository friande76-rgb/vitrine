import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { allow } from "@/lib/rate-limit";

export const runtime = "nodejs";

// O menu público chama isto a partir do browser, sem sessão: validamos tudo
// e limitamos por origem para as estatísticas não poderem ser enchidas.
const viewInput = z
  .object({
    restaurant_id: z.string().uuid(),
    dish_id: z.string().uuid().nullish(),
    kind: z.enum(["menu", "3d", "ar"]),
    table: z
      .string()
      .max(10)
      .regex(/^[\w-]*$/)
      .nullish(),
  })
  .strict();

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "desconhecido";
  return `views:${ip}`;
}

export async function POST(req: Request) {
  const parsed = viewInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });

  const { allowed } = await allow(clientKey(req), 120, 60);
  if (!allowed) return NextResponse.json({ error: "Demasiados pedidos" }, { status: 429 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  );
  const { restaurant_id, dish_id, kind, table } = parsed.data;
  const { error } = await supabase.from("menu_views").insert({
    restaurant_id,
    dish_id: dish_id ?? null,
    kind,
    table_label: table ?? null,
  });
  // Uma estatística perdida não pode partir o menu do cliente.
  if (error) return NextResponse.json({ ok: false }, { status: 202 });
  return NextResponse.json({ ok: true });
}
