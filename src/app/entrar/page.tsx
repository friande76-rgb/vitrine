import { Logo } from "@/components/Logo";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; modo?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-8 px-5 py-10">
      <Logo />
      <AuthForm next={sp.next ?? "/painel"} initialMode={sp.modo === "registo" ? "signup" : "signin"} />
    </main>
  );
}
