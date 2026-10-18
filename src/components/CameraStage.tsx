"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  widthCm?: number;
  onClose: () => void;
};

type Estado = "a-pedir" | "ligada" | "recusada" | "sem-camara";

/**
 * Plano B da realidade aumentada: muitos telemóveis Android não têm o
 * "Google Play Services for AR" e o iPhone só faz AR em Safari. Sem isto, o
 * cliente carrega em "Ver na minha mesa" e não acontece nada — que é a única
 * coisa que esta aplicação não pode fazer.
 *
 * Aqui abrimos a câmara de trás e pomos o modelo 3D por cima, com a régua do
 * tamanho real. Não é AR com deteção de superfícies, mas mostra o prato em
 * cima da mesa do cliente, que é o que vende.
 */
export function CameraStage({ src, alt, widthCm, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  // Este componente só é montado depois de um toque, portanto já estamos no
  // browser: dá para decidir à partida se há câmara, sem passar pelo efeito.
  const [estado, setEstado] = useState<Estado>(() =>
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function"
      ? "a-pedir"
      : "sem-camara",
  );

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
        if (video.current) {
          video.current.srcObject = stream;
          void video.current.play().catch(() => {});
        }
        setEstado("ligada");
      })
      .catch(() => setEstado("recusada"));
    return () => parar?.();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={video}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
      {estado === "ligada" && (
        <model-viewer
          src={src}
          alt={alt}
          camera-controls=""
          touch-action="none"
          auto-rotate=""
          rotation-per-second="14deg"
          camera-orbit="25deg 72deg auto"
          shadow-intensity="1.4"
          shadow-softness="0.9"
          interaction-prompt="none"
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

      {widthCm && estado === "ligada" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[14%] bottom-24 flex items-center gap-2.5 font-mono text-xs text-white/90"
        >
          <span className="h-px flex-1 bg-white/70" />
          {widthCm} cm
          <span className="h-px flex-1 bg-white/70" />
        </div>
      ) : null}

      <p className="pointer-events-none absolute inset-x-0 bottom-14 text-center text-[13px] text-white/80">
        Aponta a câmara para a mesa · arrasta para girar
      </p>
      <button type="button" onClick={onClose} className="btn absolute right-4 top-4 bg-white/95">
        Fechar
      </button>
    </div>
  );
}
