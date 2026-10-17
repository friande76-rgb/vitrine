function need(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Falta a variável de ambiente ${name}. Vê o ficheiro .env.example.`);
  return value;
}

export const env = {
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseSecret: () => need("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  meshyKey: () => need("MESHY_API_KEY", process.env.MESHY_API_KEY),
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
};
