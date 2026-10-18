"use client";
import { useEffect, useRef, useState } from "react";
import { CameraStage } from "./CameraStage";

// Diz ao TypeScript que existe a etiqueta <model-viewer>.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}

type Props = {
  src: string;
  alt: string;
  arLabel?: string;
  hint?: string;
  widthCm?: number;
  poster?: string;
  onAr?: () => void;
  className?: string;
};

/**
 * Visualizador 3D + botão de realidade aumentada.
 * Android → Scene Viewer / WebXR · iPhone → AR Quick Look (o USDZ é gerado automaticamente).
 * ar-scale="fixed" impede o cliente de mudar o tamanho: o prato aparece em tamanho real.
 */
export function ModelViewer({ src, alt, arLabel = "Ver na minha mesa", hint, widthCm, poster, onAr, className }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [temArNativa, setTemArNativa] = useState(false);
  const [camara, setCamara] = useState(false);

  useEffect(() => {
    import("@google/model-viewer").then(() => setReady(true));
  }, []);

  // O <model-viewer> só sabe dizer se consegue AR nativa depois de carregar o
  // modelo. Antes isto dependia só do evento "load": se ele chegasse antes de
  // o componente estar à escuta, ficávamos sem botão nenhum — o cliente
  // carregava e não acontecia nada. Agora o botão existe sempre e só o que ele
  // faz é que muda; aqui limitamo-nos a ver, sem pressa, se há AR nativa.
  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    const ver = () => setTemArNativa(Boolean((el as unknown as { canActivateAR?: boolean }).canActivateAR));
    const agora = setTimeout(ver, 0);
    const depois = setTimeout(ver, 1500);
    el.addEventListener("load", ver);
    return () => {
      clearTimeout(agora);
      clearTimeout(depois);
      el.removeEventListener("load", ver);
    };
  }, [ready]);

  // Um só botão, sempre visível: AR nativa quando existe, câmara quando não.
  function verNaMesa() {
    onAr?.();
    const el = ref.current as unknown as { canActivateAR?: boolean; activateAR?: () => void } | null;
    if (el?.canActivateAR && el.activateAR) {
      el.activateAR();
      return;
    }
    setCamara(true);
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-stage ${className ?? "aspect-square w-full"}`}>
      <model-viewer
        ref={ref}
        src={src}
        alt={alt}
        poster={poster}
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement="floor"
        camera-controls=""
        touch-action="pan-y"
        auto-rotate=""
        rotation-per-second="18deg"
        camera-orbit="30deg 62deg auto"
        min-camera-orbit="auto 10deg auto"
        max-camera-orbit="auto 85deg auto"
        shadow-intensity="1.1"
        shadow-softness="0.8"
        interaction-prompt="none"
        style={{ width: "100%", height: "100%", background: "transparent" }}
      />
      {ready && (
        <button type="button" onClick={verNaMesa} className="btn-primary absolute right-4 top-4 shadow-lg">
          {arLabel}
        </button>
      )}
      {camara && <CameraStage src={src} alt={alt} widthCm={widthCm} onClose={() => setCamara(false)} />}
      {!ready && <div className="absolute inset-0 grid place-items-center label-mono">3D…</div>}
      {hint && (
        <p className="pointer-events-none absolute inset-x-0 bottom-11 text-center text-[13px] text-muted">
          {hint}
          {!temArNativa && " · sem AR neste aparelho: abre a câmara"}
        </p>
      )}
      {widthCm ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-[12%] bottom-4 flex items-center gap-2.5 font-mono text-xs text-muted">
          <span className="h-px flex-1 bg-muted" />
          {widthCm} cm
          <span className="h-px flex-1 bg-muted" />
        </div>
      ) : null}
    </div>
  );
}
