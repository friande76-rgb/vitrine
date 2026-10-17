import QRCode from "qrcode";
import { env } from "@/lib/env";

// GET /api/qr?slug=tasca-do-largo&mesa=7 → descarrega PNG do QR code
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").replace(/[^a-z0-9-]/g, "");
  const mesa = (url.searchParams.get("mesa") || "").replace(/[^\w-]/g, "").slice(0, 10);
  if (!slug) return new Response("slug em falta", { status: 400 });
  const target = `${env.siteUrl()}/m/${slug}${mesa ? `?mesa=${mesa}` : ""}`;
  const png = await QRCode.toBuffer(target, { width: 1200, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${slug}${mesa ? `-mesa-${mesa}` : ""}.png"`,
    },
  });
}
