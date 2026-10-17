import "server-only";

export type FetchBinaryOptions = {
  /** Limite de bytes aceites. Um ficheiro maior é recusado sem ser lido todo. */
  maxBytes?: number;
  /** Tempo máximo do pedido, em milissegundos. */
  timeoutMs?: number;
};

export class DownloadError extends Error {}

/**
 * Descarrega um ficheiro binário com três travões que o `fetch` não tem:
 * estado HTTP verificado, tamanho máximo e tempo máximo.
 *
 * Sem isto, um erro do fornecedor (uma página HTML de 404) chegava ao leitor
 * de glTF como se fosse um modelo, e um ficheiro enorme ocupava a memória
 * toda do servidor.
 */
export async function fetchBinary(url: string, options: FetchBinaryOptions = {}): Promise<Uint8Array> {
  const maxBytes = options.maxBytes ?? 80 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 60_000;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new DownloadError(
      e instanceof Error && e.name === "TimeoutError"
        ? "O download do modelo demorou demasiado tempo."
        : "Não foi possível descarregar o modelo.",
    );
  }

  if (!res.ok) throw new DownloadError(`O fornecedor respondeu ${res.status} ao pedir o modelo.`);

  const declared = Number(res.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new DownloadError(`O modelo tem ${Math.round(declared / 1e6)} MB e o limite é ${Math.round(maxBytes / 1e6)} MB.`);
  }

  const buffer = new Uint8Array(await res.arrayBuffer());
  // O content-length pode faltar ou mentir: confirmamos com o tamanho real.
  if (buffer.byteLength > maxBytes) {
    throw new DownloadError(`O modelo tem ${Math.round(buffer.byteLength / 1e6)} MB e o limite é ${Math.round(maxBytes / 1e6)} MB.`);
  }
  if (buffer.byteLength === 0) throw new DownloadError("O fornecedor devolveu um ficheiro vazio.");
  return buffer;
}
