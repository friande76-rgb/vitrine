import "server-only";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";

/**
 * Pega num .glb e devolve-o à escala real:
 * - a maior medida horizontal (largura/profundidade) fica igual a widthCm
 * - o prato fica centrado e pousado em y = 0 (em cima da mesa)
 * O glTF usa metros, por isso 20 cm = 0.2.
 */
export async function scaleGlbToWidth(input: Uint8Array, widthCm: number): Promise<Uint8Array> {
  const io = new NodeIO();
  const doc = await io.readBinary(input);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  if (!scene) throw new Error("O modelo não tem cena.");

  const { min, max } = getBounds(scene);
  const sizeX = max[0] - min[0];
  const sizeZ = max[2] - min[2];
  const current = Math.max(sizeX, sizeZ);
  if (!Number.isFinite(current) || current <= 0) throw new Error("Modelo vazio ou inválido.");

  const s = widthCm / 100 / current;
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;

  // Novo nó "raiz" que escala e move tudo o que estava na cena.
  const wrapper = doc
    .createNode("vitrine_scale")
    .setScale([s, s, s])
    .setTranslation([-cx * s, -min[1] * s, -cz * s]);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);

  await doc.transform(dedup(), prune());
  return io.writeBinary(doc);
}
