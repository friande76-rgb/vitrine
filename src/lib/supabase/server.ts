import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Cliente com a sessão do utilizador (respeita as regras de segurança RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado a partir de um Server Component: o proxy trata de renovar a sessão
        }
      },
    },
  });
}

/** Cliente de administração — SÓ no servidor. Ignora RLS; usar apenas depois de verificar o dono. */
export function createAdminClient() {
  return createPlainClient(env.supabaseUrl(), env.supabaseSecret(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
