"use client";
import { useActionState, useState } from "react";
import { createRestaurant, type FormState } from "@/app/actions/restaurants";
import { SubmitButton } from "@/components/SubmitButton";
import { slugify } from "@/lib/format";

export function NewRestaurantForm() {
  const [state, action] = useActionState<FormState, FormData>(createRestaurant, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="field">
        Nome
        <input
          id="r-name"
          name="name"
          required
          className="input"
          placeholder="Tasca do Largo"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setSlug(slugify(e.target.value));
          }}
        />
      </label>
      <label className="field">
        Cidade
        <input id="r-city" name="city" className="input" placeholder="Lisboa, Luxembourg…" />
      </label>
      <label className="field">
        Endereço do menu
        <div className="flex items-center rounded-xl border border-line bg-surface pl-3.5">
          <span className="font-mono text-sm text-muted">/m/</span>
          <input
            id="r-slug"
            name="slug"
            className="w-full bg-transparent px-1 py-2.5 text-base font-normal outline-none"
            value={slug}
            onChange={(e) => {
              setTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="tasca-do-largo"
          />
        </div>
      </label>
      <label className="field">
        Língua principal do menu
        <select id="r-lang" name="default_lang" className="input">
          <option value="pt">Português</option>
          <option value="fr">Français</option>
        </select>
      </label>
      {state.error && <p role="alert" className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <SubmitButton pending="A criar…">Criar restaurante</SubmitButton>
      </div>
    </form>
  );
}
