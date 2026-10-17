import { z } from "zod";

/** Converte "21,00" ou "21.00" em cêntimos. */
const euros = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number().finite().min(0).max(100_000))
  .transform((v) => Math.round(v * 100));

const decimal = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number().finite());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .default(null);

/**
 * Campos que o dono do restaurante pode escrever num prato.
 * Tudo o resto (id, restaurant_id, model_*, meshy_task_id, published)
 * é escrito só pelo servidor e nunca vem do browser.
 */
export const dishInput = z.object({
  name: z.string().trim().min(1, "O prato precisa de um nome.").max(120),
  name_fr: optionalText(120),
  description: optionalText(500),
  description_fr: optionalText(500),
  category: optionalText(80),
  price_cents: euros,
  width_cm: decimal.pipe(
    z.number().min(2, "A largura tem de ser pelo menos 2 cm.").max(150, "A largura máxima é 150 cm."),
  ),
  serves: z.coerce.number().int().min(1).max(20),
});

export type DishInput = z.infer<typeof dishInput>;

export const restaurantInput = z.object({
  name: z.string().trim().min(2, "Escreve o nome do restaurante.").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,40}$/, "O endereço só pode ter letras minúsculas, números e hífens (3 a 40)."),
  city: optionalText(80),
  default_lang: z.enum(["pt", "fr"]).default("pt"),
});

/** Lê um formulário e devolve os dados validados ou a primeira mensagem de erro. */
export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export function parseForm<T extends z.ZodTypeAny>(schema: T, form: FormData): Parsed<z.infer<T>> {
  const result = schema.safeParse(Object.fromEntries(form.entries()));
  if (result.success) return { ok: true, data: result.data as z.infer<T> };
  return { ok: false, error: result.error.issues[0]?.message ?? "Dados inválidos." };
}
