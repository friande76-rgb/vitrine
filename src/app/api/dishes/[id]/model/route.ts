import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncDishModel } from "@/lib/model-pipeline";
import type { Dish } from "@/lib/types";

export const maxDuration = 60;

// GET /api/dishes/:id/model — o painel chama isto de poucos em poucos segundos.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  // A regra RLS só devolve o prato se for do dono (ou se estiver publicado).
  const { data: dish } = await supabase
    .from("dishes")
    .select("*, restaurants!inner(owner_id)")
    .eq("id", id)
    .eq("restaurants.owner_id", auth.claims.sub)
    .maybeSingle<Dish>();
  if (!dish) return NextResponse.json({ error: "Prato não encontrado" }, { status: 404 });

  try {
    return NextResponse.json(await syncDishModel(dish));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 502 });
  }
}
