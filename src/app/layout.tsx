import type { Metadata, Viewport } from "next";
// Letras servidas pela própria aplicação (pacotes @fontsource). Antes vinham do
// Google Fonts: isso enviava o IP de cada cliente do restaurante para a Google,
// sem consentimento — um problema real de RGPD para quem vende em Portugal e no
// Luxemburgo — e punha a app a depender de um domínio externo para pintar o
// texto. Assim os ficheiros saem do nosso domínio e o menu abre sem rede extra.
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource/instrument-sans/latin-400.css";
import "@fontsource/instrument-sans/latin-500.css";
import "@fontsource/instrument-sans/latin-600.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vitrine — menu 3D", template: "%s · Vitrine" },
  description: "O prato na mesa antes do pedido. Menu em 3D e realidade aumentada, sem app.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4e7a1f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-dvh bg-ground text-ink">{children}</body>
    </html>
  );
}
