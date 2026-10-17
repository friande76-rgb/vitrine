export type Lang = "pt" | "fr";

export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  city: string | null;
  default_lang: Lang;
  created_at: string;
};

export type ModelStatus = "none" | "processing" | "finalizing" | "ready" | "failed";

export type Dish = {
  id: string;
  restaurant_id: string;
  name: string;
  name_fr: string | null;
  description: string | null;
  description_fr: string | null;
  category: string | null;
  price_cents: number;
  width_cm: number;
  serves: number;
  position: number;
  published: boolean;
  photo_paths: string[];
  model_status: ModelStatus;
  model_progress: number;
  model_error: string | null;
  meshy_task_id: string | null;
  model_url: string | null;
  created_at: string;
};

/** O que o menu público vê. Tudo o resto fica no servidor. */
export type PublicRestaurant = Pick<Restaurant, "id" | "name" | "slug" | "city" | "default_lang">;

export type PublicDish = Pick<
  Dish,
  | "id"
  | "name"
  | "name_fr"
  | "description"
  | "description_fr"
  | "category"
  | "price_cents"
  | "width_cm"
  | "serves"
  | "photo_paths"
  | "model_url"
>;
