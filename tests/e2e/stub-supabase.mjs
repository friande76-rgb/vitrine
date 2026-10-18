// Supabase de mentira, só para os testes de ataque: responde ao que a app
// pede (tabelas, rpc dos limites, storage) sem guardar nada a sério.
import http from "node:http";

const RESTAURANT = { id: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", name: "Tasca do Largo", slug: "tasca-do-largo", city: "Lisboa", default_lang: "pt" };
const counters = new Map();

export function startStub(port = 54321) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const send = (body, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    // Contador de limites: devolve o novo valor, como a função SQL.
    if (url.pathname.endsWith("/rpc/bump_usage_counter")) {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const { p_key: key } = JSON.parse(raw || "{}");
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        send(next);
      });
      return;
    }

    if (url.pathname.includes("/auth/")) return send({ error: "sem sessão" }, 401);
    if (url.pathname.endsWith("/restaurants")) return send([RESTAURANT]);
    if (url.pathname.endsWith("/dishes")) return send([]);
    if (url.pathname.endsWith("/menu_views")) return send([], 201);
    return send([]);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

export const stubRestaurantId = RESTAURANT.id;
