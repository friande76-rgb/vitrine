"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthState = { error?: string; info?: string };

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/painel") ? s : "/painel";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") || "").trim(),
    password: String(form.get("password") || ""),
  });
  if (error) return { error: "Email ou palavra-passe errados." };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") || "");
  if (password.length < 8) return { error: "A palavra-passe precisa de pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") || "").trim(),
    password,
    options: { emailRedirectTo: `${env.siteUrl()}/painel` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { info: "Conta criada. Confirma o email que te enviámos e depois entra." };
  redirect("/painel");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
