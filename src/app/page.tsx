import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/entrar" className="btn-ghost">Entrar</Link>
      </header>
      <section className="grid flex-1 content-center gap-6 py-16">
        <p className="label-mono">Menu 3D · Realidade aumentada · Sem app</p>
        <h1 className="max-w-[14ch] font-display text-[clamp(42px,7vw,84px)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          O prato na mesa <span className="text-accent">antes</span> do pedido.
        </h1>
        <p className="max-w-[48ch] text-lg text-muted">
          Tira 3 ou 4 fotos do prato. A Vitrine cria o modelo 3D à escala real, gera o QR code e o
          cliente vê o prato em cima da mesa pelo telemóvel.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/entrar?modo=registo" className="btn-primary">Criar conta</Link>
          <Link href="/entrar" className="btn-ghost">Já tenho conta</Link>
        </div>
      </section>
    </main>
  );
}
