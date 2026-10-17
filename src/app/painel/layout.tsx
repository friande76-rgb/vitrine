import { Logo } from "@/components/Logo";
import { signOut } from "@/app/actions/auth";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <header className="no-print flex items-center justify-between gap-4 py-5">
        <Logo href="/painel" />
        <form action={signOut}>
          <button className="text-sm font-medium text-muted hover:text-ink">Sair</button>
        </form>
      </header>
      {children}
    </div>
  );
}
