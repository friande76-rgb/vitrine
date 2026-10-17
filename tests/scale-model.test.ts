import { Document, NodeIO, getBounds } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { scaleGlbToWidth } from "../src/lib/scale-model";

/** Cria um .glb com um único triângulo de `size` metros de lado, longe da origem. */
async function cube(size: number, offset: number): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(
      new Float32Array([
        offset, offset, offset,
        offset + size, offset, offset,
        offset + size, offset + size / 2, offset + size,
      ]),
    )
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute("POSITION", position);
  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  doc.createScene().addChild(node);
  return new NodeIO().writeBinary(doc);
}

describe("scaleGlbToWidth", () => {
  it("põe a maior medida horizontal na largura pedida", async () => {
    const out = await scaleGlbToWidth(await cube(3, 10), 26);
    const doc = await new NodeIO().readBinary(out);
    const scene = doc.getRoot().listScenes()[0];
    if (!scene) throw new Error("sem cena");
    const { min, max } = getBounds(scene);
    const [minX = 0, , minZ = 0] = min;
    const [maxX = 0, , maxZ = 0] = max;
    expect(Math.max(maxX - minX, maxZ - minZ)).toBeCloseTo(0.26, 4);
  });

  it("pousa o modelo em y = 0 e centra-o em x e z", async () => {
    const out = await scaleGlbToWidth(await cube(0.4, -7), 30);
    const doc = await new NodeIO().readBinary(out);
    const scene = doc.getRoot().listScenes()[0];
    if (!scene) throw new Error("sem cena");
    const { min, max } = getBounds(scene);
    const [minX = 0, minY = 0, minZ = 0] = min;
    const [maxX = 0, , maxZ = 0] = max;
    expect(minY).toBeCloseTo(0, 5);
    expect((minX + maxX) / 2).toBeCloseTo(0, 5);
    expect((minZ + maxZ) / 2).toBeCloseTo(0, 5);
  });

  it("recusa um ficheiro sem geometria", async () => {
    const doc = new Document();
    doc.createScene();
    const empty = await new NodeIO().writeBinary(doc);
    await expect(scaleGlbToWidth(empty, 20)).rejects.toThrow();
  });
});
