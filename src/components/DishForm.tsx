"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/dishes";
import type { Dish } from "@/lib/types";
import { SubmitButton } from "@/components/SubmitButton";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export function DishForm({ action, dish, submitLabel }: { action: Action; dish?: Dish; submitLabel: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-6">
      <label className="field sm:col-span-4">
        Nome (PT)
        <input id="d-name" name="name" required defaultValue={dish?.name} className="input" placeholder="Polvo à lagareiro" />
      </label>
      <label className="field sm:col-span-2">
        Categoria
        <input id="d-cat" name="category" defaultValue={dish?.category ?? ""} className="input" placeholder="Pratos principais" />
      </label>
      <label className="field sm:col-span-6">
        Descrição (PT)
        <input id="d-desc" name="description" defaultValue={dish?.description ?? ""} className="input" placeholder="Batata a murro, azeite, alho" />
      </label>
      <label className="field sm:col-span-3">
        Nom (FR) <span className="font-normal text-muted">opcional</span>
        <input id="d-name-fr" name="name_fr" defaultValue={dish?.name_fr ?? ""} className="input" placeholder="Pieuvre grillée" />
      </label>
      <label className="field sm:col-span-3">
        Description (FR) <span className="font-normal text-muted">opcional</span>
        <input id="d-desc-fr" name="description_fr" defaultValue={dish?.description_fr ?? ""} className="input" />
      </label>
      <label className="field sm:col-span-2">
        Preço (€)
        <input id="d-price" name="price" inputMode="decimal" required defaultValue={dish ? (dish.price_cents / 100).toFixed(2) : ""} className="input font-mono" placeholder="21,00" />
      </label>
      <label className="field sm:col-span-2">
        Largura do prato (cm)
        <input id="d-width" name="width_cm" inputMode="decimal" required defaultValue={dish?.width_cm ?? 26} className="input font-mono" />
        <span className="text-xs font-normal text-muted">Mede o prato/travessa de lado a lado. Define o tamanho real em AR.</span>
      </label>
      <label className="field sm:col-span-2">
        Serve
        <select id="d-serves" name="serves" defaultValue={dish?.serves ?? 1} className="input">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "pessoa" : "pessoas"}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-4 sm:col-span-6">
        <SubmitButton>{submitLabel}</SubmitButton>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-accent">{state.ok}</p>}
      </div>
    </form>
  );
}
