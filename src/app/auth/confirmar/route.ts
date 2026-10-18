import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Esta rota recebe o clique no link do email de confirmação. O Supabase manda
// para aqui com um código de uso único; trocamo-lo por uma sessão e a pessoa
// entra directamente no painel. Sem isto, o link do email levava a uma página
// que não sabia o que fazer com o código e devolvia a pessoa ao ecrã de entrada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Só aceitamos destinos dentro da própria aplicação. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/painel") ? value : "/painel";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  // Formato novo (PKCE): ?code=…
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Formato antigo dos modelos de email: ?token_hash=…&type=signup
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && (type === "signup" || type === "email" || type === "recovery" || type === "magiclink")) {
    const { error } = await supabase.auth.verifyOtp({
      type: type === "signup" ? "signup" : type === "recovery" ? "recovery" : "email",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/entrar?erro=confirmacao`);
}
