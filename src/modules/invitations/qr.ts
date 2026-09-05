import "server-only";
import QRCode from "qrcode";
import { getAppUrl } from "@/lib/app-url";

function invitationUrl(token: string) {
  return `${getAppUrl()}/invitation/${token}`;
}

/** SVG (léger, net à toute résolution) pour l'affichage web. */
export async function generateQrSvg(token: string): Promise<string> {
  return QRCode.toString(invitationUrl(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2, // zone de silence requise pour une lecture fiable au scan
    color: { dark: "#26322B", light: "#FFFFFF" },
  });
}

/** PNG haute résolution pour l'impression dans le PDF A4. */
export async function generateQrPngBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(invitationUrl(token), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 10, // haute résolution pour rester net à l'impression
    color: { dark: "#26322B", light: "#FFFFFF" },
  });
}
