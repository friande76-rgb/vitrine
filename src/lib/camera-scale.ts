/**
 * Contas da escala real na vista de câmara.
 *
 * Para o prato aparecer do tamanho que tem, o 3D tem de ser desenhado com a
 * mesma lente com que a câmara filma. Estas funções são puras de propósito:
 * é aqui que se decide se um robalo de 34 cm parece um robalo ou uma moeda.
 */

export const ANGULO_HORIZONTAL_GRAUS = 65;

export const paraGraus = (radianos: number) => (radianos * 180) / Math.PI;
export const paraRadianos = (graus: number) => (graus * Math.PI) / 180;

/** Ângulo vertical do sensor, a partir do horizontal e da proporção da imagem. */
export function anguloVerticalDoSensor(anguloHorizontalGraus: number, proporcaoVideo: number): number {
  if (!(proporcaoVideo > 0)) throw new Error("A proporção do vídeo tem de ser maior do que zero.");
  return 2 * Math.atan(Math.tan(paraRadianos(anguloHorizontalGraus) / 2) / proporcaoVideo);
}

/**
 * Ângulo vertical realmente visível no ecrã. O vídeo é mostrado com
 * "object-cover": se o ecrã for mais largo do que a imagem, a imagem é cortada
 * em cima e em baixo e o ângulo vertical visível encolhe na mesma proporção.
 * Sem esta correção o modelo sai com o tamanho errado em ecrãs compridos —
 * que é exatamente a forma de um telemóvel.
 */
export function anguloVerticalVisivel(opcoes: {
  proporcaoVideo: number;
  proporcaoEcra: number;
  anguloHorizontalGraus?: number;
}): number {
  const { proporcaoVideo, proporcaoEcra, anguloHorizontalGraus = ANGULO_HORIZONTAL_GRAUS } = opcoes;
  if (!(proporcaoEcra > 0)) throw new Error("A proporção do ecrã tem de ser maior do que zero.");
  const vertical = anguloVerticalDoSensor(anguloHorizontalGraus, proporcaoVideo);
  if (proporcaoEcra <= proporcaoVideo) return vertical;
  return 2 * Math.atan(Math.tan(vertical / 2) * (proporcaoVideo / proporcaoEcra));
}

/**
 * Que fração da altura do ecrã um objeto ocupa. Serve para provar nos testes
 * que a escala está certa: dobrar a distância tem de dar metade do tamanho.
 */
export function fracaoDaAltura(alturaMetros: number, distanciaMetros: number, anguloVerticalRad: number): number {
  if (!(distanciaMetros > 0)) throw new Error("A distância tem de ser maior do que zero.");
  return alturaMetros / (2 * distanciaMetros * Math.tan(anguloVerticalRad / 2));
}
