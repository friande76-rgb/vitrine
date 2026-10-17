import { z } from "zod";
import { describe, expect, it } from "vitest";
import { dishInput, restaurantInput } from "../src/lib/contracts/dish";

const base = {
  name: "Polvo à lagareiro",
  name_fr: "",
  description: "Batata a murro",
  description_fr: "",
  category: "Pratos principais",
  price_cents: "21,00",
  width_cm: "30",
  serves: "2",
};

describe("dishInput", () => {
  it("aceita preço com vírgula e converte em cêntimos", () => {
    const d = dishInput.parse(base);
    expect(d.price_cents).toBe(2100);
    expect(d.width_cm).toBe(30);
    expect(d.serves).toBe(2);
  });

  it("transforma texto vazio em null", () => {
    expect(dishInput.parse(base).name_fr).toBeNull();
  });

  it("recusa prato sem nome", () => {
    expect(dishInput.safeParse({ ...base, name: "  " }).success).toBe(false);
  });

  it("recusa larguras fora do intervalo 2–150 cm", () => {
    expect(dishInput.safeParse({ ...base, width_cm: "1" }).success).toBe(false);
    expect(dishInput.safeParse({ ...base, width_cm: "900" }).success).toBe(false);
  });

  it("ignora campos que o cliente não pode escrever", () => {
    const d = dishInput.parse({ ...base, published: "true", restaurant_id: "outro", model_url: "http://x" });
    expect(d).not.toHaveProperty("published");
    expect(d).not.toHaveProperty("restaurant_id");
    expect(d).not.toHaveProperty("model_url");
  });
});

describe("restaurantInput", () => {
  it("recusa endereços com acentos ou espaços", () => {
    expect(restaurantInput.safeParse({ name: "Tasca", slug: "tasca do largo" }).success).toBe(false);
    expect(restaurantInput.safeParse({ name: "Tasca", slug: "tascá" }).success).toBe(false);
  });

  it("aceita um endereço válido", () => {
    const r = restaurantInput.parse({ name: "Tasca do Largo", slug: "tasca-do-largo" });
    expect(r.slug).toBe("tasca-do-largo");
    expect(r.default_lang).toBe("pt");
  });
});

describe("validação das visitas do menu público", () => {
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

  const ok = { restaurant_id: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", kind: "menu" as const };

  it("recusa um id que não é uuid", () => {
    expect(viewInput.safeParse({ ...ok, restaurant_id: "'; drop table" }).success).toBe(false);
  });

  it("recusa um tipo de visita inventado", () => {
    expect(viewInput.safeParse({ ...ok, kind: "admin" }).success).toBe(false);
  });

  it("recusa mesas com caracteres estranhos ou demasiado longas", () => {
    expect(viewInput.safeParse({ ...ok, table: "<script>" }).success).toBe(false);
    expect(viewInput.safeParse({ ...ok, table: "12345678901" }).success).toBe(false);
  });

  it("aceita uma visita normal", () => {
    expect(viewInput.safeParse({ ...ok, table: "7" }).success).toBe(true);
  });
});
