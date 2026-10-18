// Testes de ataque contra a aplicação a correr a sério.
//
// Levanta o servidor de produção e bate-lhe à porta como um atacante faria:
// sem sessão, com dados inválidos, com um id alheio, e aos milhares.
// Falha com código 1 à primeira verificação que não passe.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { startStub, stubRestaurantId } from "./stub-supabase.mjs";

const PORT = 3300;
const BASE = `http://localhost:${PORT}`;
let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  OK   ${name}`);
  } else {
    failures++;
    console.log(`  FALHA ${name} ${detail}`);
  }
}

async function waitForServer(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(BASE, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("o servidor não arrancou");
}

const stub = await startStub();
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://localhost:54321`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
    SUPABASE_SECRET_KEY: "sb_secret_teste",
    MESHY_API_KEY: "msy_dummy_api_key_for_test_mode_12345678",
    NEXT_PUBLIC_SITE_URL: BASE,
  },
  stdio: "ignore",
});

try {
  await waitForServer();
  console.log("\nCabeçalhos de segurança");
  const home = await fetch(BASE);
  const h = (name) => home.headers.get(name) ?? "";
  check("X-Content-Type-Options: nosniff", h("x-content-type-options") === "nosniff");
  check("X-Frame-Options: DENY", h("x-frame-options") === "DENY");
  check("Strict-Transport-Security presente", h("strict-transport-security").includes("max-age"));
  check("Referrer-Policy presente", h("referrer-policy").length > 0);
  check("Permissions-Policy deixa a câmara", h("permissions-policy").includes("camera=(self)"));
  check("Permissions-Policy fecha o microfone", h("permissions-policy").includes("microphone=()"));
  check("CSP com frame-ancestors 'none'", h("content-security-policy").includes("frame-ancestors 'none'"));
  check("sem X-Powered-By", !home.headers.has("x-powered-by"));
  // As letras são nossas (@fontsource). Se alguém voltar a pôr o Google Fonts,
  // isto apanha: passa a sair o IP de cada cliente do restaurante para fora.
  check(
    "CSP sem domínios externos de letras",
    !h("content-security-policy").includes("fonts.googleapis.com") &&
      !h("content-security-policy").includes("fonts.gstatic.com"),
  );
  // 'unsafe-eval' só existe em desenvolvimento (recarregamento do Next). Em
  // produção abriria a porta a executar texto vindo de fora como código.
  check(
    "CSP de produção sem 'unsafe-eval'",
    !h("content-security-policy").replace("wasm-unsafe-eval", "").includes("unsafe-eval"),
  );
  check("CSP força https (upgrade-insecure-requests)", h("content-security-policy").includes("upgrade-insecure-requests"));

  console.log("\nPainel e rotas privadas sem sessão");
  const painel = await fetch(`${BASE}/painel`, { redirect: "manual" });
  check("/painel redireciona para /entrar", [302, 303, 307, 308].includes(painel.status) && (painel.headers.get("location") ?? "").includes("/entrar"), `status ${painel.status}`);

  const model = await fetch(`${BASE}/api/dishes/${stubRestaurantId}/model`);
  check("estado do modelo 3D exige sessão (401)", model.status === 401, `status ${model.status}`);

  console.log("\nRota pública das visitas");
  const bad = await fetch(`${BASE}/api/views`, { method: "POST", body: JSON.stringify({ kind: "admin", restaurant_id: "x" }) });
  check("tipo de visita inventado é recusado (400)", bad.status === 400, `status ${bad.status}`);

  const sqlish = await fetch(`${BASE}/api/views`, { method: "POST", body: JSON.stringify({ kind: "menu", restaurant_id: "'; drop table dishes; --" }) });
  check("id que não é uuid é recusado (400)", sqlish.status === 400, `status ${sqlish.status}`);

  const xss = await fetch(`${BASE}/api/views`, { method: "POST", body: JSON.stringify({ kind: "menu", restaurant_id: stubRestaurantId, table: "<script>alert(1)</script>" }) });
  check("mesa com HTML é recusada (400)", xss.status === 400, `status ${xss.status}`);

  const extra = await fetch(`${BASE}/api/views`, { method: "POST", body: JSON.stringify({ kind: "menu", restaurant_id: stubRestaurantId, is_admin: true }) });
  check("campo a mais é recusado (400)", extra.status === 400, `status ${extra.status}`);

  const good = await fetch(`${BASE}/api/views`, { method: "POST", body: JSON.stringify({ kind: "menu", restaurant_id: stubRestaurantId, table: "7" }) });
  check("visita normal é aceite", good.ok, `status ${good.status}`);

  console.log("\nLimite de pedidos (inundação)");
  let blocked = 0;
  for (let i = 0; i < 130; i++) {
    const r = await fetch(`${BASE}/api/views`, { method: "POST", body: JSON.stringify({ kind: "menu", restaurant_id: stubRestaurantId }) });
    if (r.status === 429) blocked++;
  }
  check("a inundação acaba bloqueada (429)", blocked > 0, `bloqueados: ${blocked}`);

  console.log("\nGerador de QR codes");
  const traversal = await fetch(`${BASE}/api/qr?slug=../../../etc/passwd`);
  const ct = traversal.headers.get("content-type") ?? "";
  check("caminho com ../ não escapa (devolve PNG ou erro)", traversal.status === 400 || ct.includes("image/png"), `status ${traversal.status} ${ct}`);
  const qrBody = await traversal.arrayBuffer();
  check("o QR não contém texto do sistema", !new TextDecoder().decode(qrBody).includes("root:"), "");

  console.log("\nMenu público");
  const menu = await fetch(`${BASE}/m/tasca-do-largo?mesa=7`);
  const html = await menu.text();
  check("o menu abre", menu.ok, `status ${menu.status}`);
  check("o menu não revela o dono nem chaves", !/owner_id|meshy_task_id|sb_secret|service_role/.test(html));
} finally {
  server.kill("SIGTERM");
  stub.close();
}

console.log(failures === 0 ? "\n=== ATAQUES OK: todas as verificações passaram ===" : `\n=== ${failures} VERIFICAÇÕES FALHARAM ===`);
process.exit(failures === 0 ? 0 : 1);
