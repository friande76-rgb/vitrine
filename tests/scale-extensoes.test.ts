import { readFileSync } from "node:fs";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { describe, expect, it } from "vitest";
import { scaleGlbToWidth } from "@/lib/scale-model";

// Um .glb real da Meshy traz texturas comprimidas e declara extensões como
// obrigatórias (aqui, EXT_texture_webp). Antes de as registarmos, o leitor
// recusava o ficheiro logo à entrada e o "Gerar 3D" morria em modelos
// perfeitamente válidos. Este teste existe para isso não voltar.
describe("modelos com extensões obrigatórias", () => {
  const original = new Uint8Array(readFileSync("tests/fixtures/modelo-com-extensao.glb"));

  it("declara mesmo uma extensão obrigatória", () => {
    const texto = Buffer.from(original).toString("latin1");
    expect(texto).toContain("extensionsRequired");
  });

  it("é redimensionado em vez de ser recusado", async () => {
    const saida = await scaleGlbToWidth(original, 22);
    const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(saida);
    const cena = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
    if (!cena) throw new Error("sem cena");
    const { min, max } = getBounds(cena);
    const larguraCm = Math.max(max[0] - min[0], max[2] - min[2]) * 100;
    expect(larguraCm).toBeGreaterThan(21.9);
    expect(larguraCm).toBeLessThan(22.1);
    expect(Math.abs(min[1])).toBeLessThan(0.001);
  });
});
