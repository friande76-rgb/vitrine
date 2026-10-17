import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type RateLimit = { allowed: boolean; count: number; limit: number; resetAt: Date };

/**
 * Contador simples por janela fixa, guardado na base de dados (funciona com
 * várias instâncias do servidor, ao contrário de um contador em memória).
 *
 * Exemplo: allow("model:" + userId, 10, 60) → no máximo 10 modelos por hora.
 */
export async function allow(key: string, limit: number, windowMinutes: number): Promise<RateLimit> {
  const ms = windowMinutes * 60_000;
  const windowAt = windowStart(new Date(), windowMinutes);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("bump_usage_counter", {
    p_key: key,
    p_window_at: windowAt.toISOString(),
  });

  // Se o contador falhar, deixamos passar: um limite partido não pode
  // impedir o dono de trabalhar. O erro fica no registo do servidor.
  if (error) {
    console.error("rate-limit", error.message);
    return { allowed: true, count: 0, limit, resetAt: new Date(windowAt.getTime() + ms) };
  }

  const count = Number(data ?? 0);
  return { allowed: count <= limit, count, limit, resetAt: new Date(windowAt.getTime() + ms) };
}

/** Início da janela a que um instante pertence. Função pura, testada. */
export function windowStart(now: Date, windowMinutes: number): Date {
  const ms = windowMinutes * 60_000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/** Minutos que faltam até o limite voltar a zero, para a mensagem de erro. */
export function minutesUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000));
}
