import { env } from "@/lib/env";

export function euros(cents: number, lang: "pt" | "fr" = "pt") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-LU" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function photoUrl(path: string) {
  return `${env.supabaseUrl()}/storage/v1/object/public/photos/${path}`;
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
