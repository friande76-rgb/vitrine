import { afterEach, describe, expect, it, vi } from "vitest";
import { DownloadError, fetchBinary } from "../src/lib/fetch-binary";

function reply(body: Uint8Array, init: { status?: number; contentLength?: string } = {}) {
  const headers = new Headers();
  if (init.contentLength !== undefined) headers.set("content-length", init.contentLength);
  return new Response(body as unknown as BodyInit, { status: init.status ?? 200, headers });
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchBinary", () => {
  it("devolve os bytes quando está tudo bem", async () => {
    vi.stubGlobal("fetch", async () => reply(new Uint8Array([1, 2, 3])));
    expect((await fetchBinary("https://exemplo/x.glb")).byteLength).toBe(3);
  });

  it("recusa uma resposta de erro em vez de a tratar como modelo", async () => {
    vi.stubGlobal("fetch", async () => reply(new TextEncoder().encode("<html>404</html>"), { status: 404 }));
    await expect(fetchBinary("https://exemplo/x.glb")).rejects.toBeInstanceOf(DownloadError);
  });

  it("recusa antes de ler quando o content-length passa o limite", async () => {
    vi.stubGlobal("fetch", async () => reply(new Uint8Array(10), { contentLength: "999999999" }));
    await expect(fetchBinary("https://exemplo/x.glb", { maxBytes: 1000 })).rejects.toThrow(/limite/);
  });

  it("recusa quando o content-length mente e o ficheiro real é maior", async () => {
    vi.stubGlobal("fetch", async () => reply(new Uint8Array(5000), { contentLength: "10" }));
    await expect(fetchBinary("https://exemplo/x.glb", { maxBytes: 1000 })).rejects.toThrow(/limite/);
  });

  it("recusa um ficheiro vazio", async () => {
    vi.stubGlobal("fetch", async () => reply(new Uint8Array(0)));
    await expect(fetchBinary("https://exemplo/x.glb")).rejects.toThrow(/vazio/);
  });

  it("transforma um tempo esgotado numa mensagem em português", async () => {
    vi.stubGlobal("fetch", async () => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    });
    await expect(fetchBinary("https://exemplo/x.glb")).rejects.toThrow(/demasiado tempo/);
  });
});
