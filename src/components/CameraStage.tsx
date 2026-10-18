"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { anguloVerticalVisivel, paraGraus } from "@/lib/camera-scale";

type Props = {
  src: string;
  alt: string;
  widthCm?: number;
  onClose: () => void;
};

type Estado = "a-pedir" | "ligada" | "recusada" | "sem-camara";

/** Distância inicial do telemóvel à mesa, em metros (braço esticado, sentado). */
const DISTANCIA_INICIAL = 0.45;
const DISTANCIA_MIN = 0.2;
const DISTANCIA_MAX = 1.5;

/**
 * Plano B da realidade aumentada, para os telemóveis sem AR nativa.
 *
 * O ponto todo desta aplicação é o prato aparecer **do tamanho real**. Pôr o
 * modelo por cima do vídeo não chega: é preciso desenhá-lo com a mesma lente
 * com que a câmara filma. Se o ângulo de visão não bater certo, um robalo de
 * 34 cm aparece do tamanho de uma moeda.
 *
 * Por isso aqui:
 *  - o campo de visão do 3D é calculado a partir do ângulo da câmara e do
 *    recorte que o "object-cover" faz ao vídeo;
 *  - a câmara virtual fica a uma distância conhecida do prato, como se fosse
 *    o telemóvel acima da mesa;
 *  - o zoom está trancado, para ninguém desfazer a escala sem dar por isso.
 * A distância é ajustável, porque é a única coisa que não se consegue medir
 * sem sensores de profundidade.
 */
export function CameraStage({ src, alt, widthCm, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const visor = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<Estado>(() =>
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function"
      ? "a-pedir"
      : "sem-camara",
  );
  const [distancia, setDistancia] = useState(DISTANCIA_INICIAL);
  const [tamanhoVideo, setTamanhoVideo] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let parar: (() => void) | undefined;
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (typeof media?.getUserMedia !== "function") return;
    media
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        parar = () => {
          for (const t of stream.getTracks()) t.stop();
        };
        const s = stream.getVideoTracks()[0]?.getSettings();
        if (s?.width && s?.height) setTamanhoVideo({ w: s.width, h: s.height });
        if (video.current) {
          video.current.srcObject = stream;
          void video.current.play().catch(() => {});
        }
        setEstado("ligada");
      })
      .catch(() => setEstado("recusada"));
    return () => parar?.();
  }, []);

  /** Campo de visão vertical visível (ver src/lib/camera-scale.ts). */
  const anguloVertical = useCallback(
    (larguraEcra: number, alturaEcra: number) =>
      anguloVerticalVisivel({
        proporcaoVideo: tamanhoVideo ? tamanhoVideo.w / tamanhoVideo.h : 4 / 3,
        proporcaoEcra: larguraEcra / Math.max(alturaEcra, 1),
      }),
    [tamanhoVideo],
  );

  /** Aponta a câmara virtual ao prato, à escala. */
  const enquadrar = useCallback(() => {
    const el = visor.current as unknown as
      | { getDimensions?: () => { x: number; y: number; z: number }; fieldOfView?: string; cameraTarget?: string; cameraOrbit?: string; minCameraOrbit?: string; maxCameraOrbit?: string }
      | null;
    const caixa = visor.current?.getBoundingClientRect();
    if (!el?.getDimensions || !caixa) return;
    const d = el.getDimensions();
    const fov = paraGraus(anguloVertical(caixa.width, caixa.height));
    el.fieldOfView = `${fov.toFixed(2)}deg`;
    el.cameraTarget = `0m ${(d.y / 2).toFixed(3)}m 0m`;
    el.minCameraOrbit = `-Infinity 5deg ${distancia}m`;
    el.maxCameraOrbit = `Infinity 88deg ${distancia}m`;
    el.cameraOrbit = `0deg 68deg ${distancia}m`;
  }, [anguloVertical, distancia]);

  useEffect(() => {
    const el = visor.current;
    if (!el || estado !== "ligada") return;
    const t = setTimeout(enquadrar, 0);
    el.addEventListener("load", enquadrar);
    window.addEventListener("resize", enquadrar);
    return () => {
      clearTimeout(t);
      el.removeEventListener("load", enquadrar);
      window.removeEventListener("resize", enquadrar);
    };
  }, [estado, enquadrar]);

  const afastar = (passo: number) =>
    setDistancia((d) => Math.min(DISTANCIA_MAX, Math.max(DISTANCIA_MIN, +(d + passo).toFixed(2))));

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video ref={video} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {estado === "ligada" && (
        <model-viewer
          ref={visor}
          src={src}
          alt={alt}
          camera-controls=""
          disable-zoom=""
          touch-action="none"
          interaction-prompt="none"
          shadow-intensity="1.4"
          shadow-softness="0.9"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent" }}
        />
      )}

      {estado === "a-pedir" && (
        <p className="absolute inset-0 grid place-items-center px-8 text-center text-white">
          A pedir autorização para usar a câmara…
        </p>
      )}
      {estado === "recusada" && (
        <p className="absolute inset-0 grid place-items-center px-8 text-center text-white">
          Não deste autorização para a câmara. Carrega no cadeado ao lado do endereço, liga a câmara e tenta outra vez.
        </p>
      )}
      {estado === "sem-camara" && (
        <p className="absolute inset-0 grid place-items-center px-8 text-center text-white">
          Este browser não dá acesso à câmara. Abre a página no Chrome ou no Safari.
        </p>
      )}

      {estado === "ligada" && (
        <>
          {widthCm ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[14%] bottom-32 flex items-center gap-2.5 font-mono text-xs text-white/90"
            >
              <span className="h-px flex-1 bg-white/70" />
              {widthCm} cm
              <span className="h-px flex-1 bg-white/70" />
            </div>
          ) : null}

          {/* A altura a que seguras o telemóvel é a única medida que falta: */}
          <div className="absolute inset-x-0 bottom-20 flex items-center justify-center gap-3">
            <button type="button" onClick={() => afastar(-0.05)} className="btn bg-white/95" aria-label="Prato maior">
              −
            </button>
            <span className="rounded-full bg-black/55 px-3 py-1 font-mono text-xs text-white">
              {Math.round(distancia * 100)} cm da mesa
            </span>
            <button type="button" onClick={() => afastar(0.05)} className="btn bg-white/95" aria-label="Prato menor">
              +
            </button>
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-8 px-6 text-center text-[13px] text-white/80">
            Ajusta até bater certo com a altura do telemóvel
          </p>
        </>
      )}

      <button type="button" onClick={onClose} className="btn absolute right-4 top-4 bg-white/95">
        Fechar
      </button>
    </div>
  );
}
