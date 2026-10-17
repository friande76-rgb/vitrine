"use client";
import { useEffect, useRef, useState } from "react";

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
  const [canAr, setCanAr] = useState(true);

  useEffect(() => {
    import("@google/model-viewer").then(() => setReady(true));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    const onLoad = () => setCanAr(Boolean((el as unknown as { canActivateAR?: boolean }).canActivateAR));
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [ready]);

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
      >
        <button
          slot="ar-button"
          onClick={() => onAr?.()}
          className="btn-primary absolute right-4 top-4 shadow-lg"
        >
          {arLabel}
        </button>
      </model-viewer>
      {!ready && <div className="absolute inset-0 grid place-items-center label-mono">3D…</div>}
      {hint && (
        <p className="pointer-events-none absolute inset-x-0 bottom-11 text-center text-[13px] text-muted">
          {hint}
          {!canAr && " · AR indisponível neste aparelho"}
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
