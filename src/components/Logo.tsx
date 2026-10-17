import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight">
      <span aria-hidden className="size-3 rounded-full bg-accent shadow-[inset_-3px_-3px_0_var(--pit)]" />
      Vitrine
    </Link>
  );
}
