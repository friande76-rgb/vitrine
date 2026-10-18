import { describe, expect, it } from "vitest";
import {
  anguloVerticalDoSensor,
  anguloVerticalVisivel,
  fracaoDaAltura,
  paraGraus,
  paraRadianos,
} from "@/lib/camera-scale";

describe("escala na vista de câmara", () => {
  it("uma câmara 4:3 de 65° na horizontal dá cerca de 51° na vertical", () => {
    expect(paraGraus(anguloVerticalDoSensor(65, 4 / 3))).toBeCloseTo(51.0, 0);
  });

  it("num ecrã mais largo do que a imagem, o ângulo visível encolhe", () => {
    const cheio = anguloVerticalVisivel({ proporcaoVideo: 4 / 3, proporcaoEcra: 4 / 3 });
    const cortado = anguloVerticalVisivel({ proporcaoVideo: 4 / 3, proporcaoEcra: 16 / 9 });
    expect(cortado).toBeLessThan(cheio);
  });

  it("num ecrã mais estreito do que a imagem, o ângulo vertical mantém-se", () => {
    const sensor = anguloVerticalDoSensor(65, 16 / 9);
    expect(anguloVerticalVisivel({ proporcaoVideo: 16 / 9, proporcaoEcra: 9 / 16 })).toBeCloseTo(sensor, 10);
  });

  it("o dobro da distância dá metade do tamanho", () => {
    const fov = paraRadianos(51);
    const perto = fracaoDaAltura(0.34, 0.45, fov);
    const longe = fracaoDaAltura(0.34, 0.9, fov);
    expect(longe).toBeCloseTo(perto / 2, 10);
  });

  it("um robalo de 34 cm a 45 cm da mesa ocupa boa parte do ecrã, não uma moeda", () => {
    const fov = anguloVerticalVisivel({ proporcaoVideo: 4 / 3, proporcaoEcra: 390 / 844 });
    const fracao = fracaoDaAltura(0.34, 0.45, fov);
    expect(fracao).toBeGreaterThan(0.3);
    expect(fracao).toBeLessThan(1.2);
  });

  it("recusa medidas impossíveis em vez de devolver um tamanho errado em silêncio", () => {
    expect(() => anguloVerticalDoSensor(65, 0)).toThrow();
    expect(() => anguloVerticalVisivel({ proporcaoVideo: 4 / 3, proporcaoEcra: 0 })).toThrow();
    expect(() => fracaoDaAltura(0.34, 0, paraRadianos(51))).toThrow();
  });
});
