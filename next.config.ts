import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança. A Vercel não envia nenhum por omissão: tudo o que
 * está aqui é explícito e vale para todas as páginas e rotas.
 *
 * A Permissions-Policy tem de deixar a câmara passar (camera=self), senão o
 * "Ver na minha mesa" nem chega a pedir autorização ao cliente.
 */
const isDev = process.env.NODE_ENV === "development";

// Em desenvolvimento o Supabase pode estar em http://localhost; em produção
// vem sempre por https, por isso o http só entra aqui fora da produção.
const localSources = isDev ? " http://localhost:* ws://localhost:* http://*:* ws://*:*" : "";

// Em desenvolvimento o Next recarrega o código com eval (HMR). Em produção
// não entra: lá basta o wasm-unsafe-eval que o <model-viewer> exige.
const devEval = isDev ? " 'unsafe-eval'" : "";

const securityHeaders = [
  // HSTS e upgrade-insecure-requests só em produção: em desenvolvimento a app
  // corre em http (localhost, ou o IP da rede local para testar no telemóvel)
  // e estes dois obrigariam o browser a trocar tudo para https, que não existe.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    // frame-ancestors 'none' faz o mesmo que o X-Frame-Options nos browsers
    // modernos. O resto fecha a página ao que ela não precisa; os modelos 3D
    // e as fotos vêm do Supabase por https, daí o https: em img/media/connect.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      // As letras são servidas pela própria app (@fontsource), por isso nem
      // o Google Fonts nem nenhum outro domínio externo entram aqui.
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // 'wasm-unsafe-eval' é obrigatório: o <model-viewer> compila WebAssembly
      // para desenhar o 3D. Sem isto, o prato nunca aparece.
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${devEval}`,
      "worker-src 'self' blob:",
      `connect-src 'self' blob: data: https:${localSources}`,
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
