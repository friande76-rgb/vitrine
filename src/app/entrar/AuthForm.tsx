"use client";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function AuthForm({ next, initialMode }: { next: string; initialMode: "signin" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [inState, inAction] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "signin" ? inState : upState;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {mode === "signin" ? "Entrar no painel" : "Criar conta"}
        </h1>
        <p className="mt-1 text-muted">
          {mode === "signin" ? "Gere os pratos e os QR codes do teu restaurante." : "Grátis para começar. Só precisas de um email."}
        </p>
      </div>
      <form action={mode === "signin" ? inAction : upAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="field">
          Email
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="field">
          Palavra-passe
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="input"
          />
        </label>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state.info && <p className="text-sm text-accent">{state.info}</p>}
        <SubmitButton pending="Um momento…">{mode === "signin" ? "Entrar" : "Criar conta"}</SubmitButton>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="justify-self-start text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        {mode === "signin" ? "Ainda não tens conta? Cria uma" : "Já tens conta? Entra"}
      </button>
    </div>
  );
}
