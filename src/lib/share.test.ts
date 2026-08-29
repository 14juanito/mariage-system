import { describe, it, expect } from "vitest";
import { sanitizePhoneForWhatsapp, whatsappShareUrl } from "./share";

describe("sanitizePhoneForWhatsapp", () => {
  it("convertit un numéro local RDC (0...) en international 243...", () => {
    expect(sanitizePhoneForWhatsapp("0813337193")).toBe("243813337193");
  });

  it("garde un numéro déjà saisi avec le +", () => {
    expect(sanitizePhoneForWhatsapp("+243813337193")).toBe("243813337193");
  });

  it("gère le préfixe international 00", () => {
    expect(sanitizePhoneForWhatsapp("00243813337193")).toBe("243813337193");
  });

  it("nettoie les espaces/tirets", () => {
    expect(sanitizePhoneForWhatsapp("081 333 71-93")).toBe("243813337193");
  });

  it("laisse un numéro déjà en 243... tel quel", () => {
    expect(sanitizePhoneForWhatsapp("243813337193")).toBe("243813337193");
  });
});

describe("whatsappShareUrl", () => {
  it("produit un lien wa.me avec l'indicatif international", () => {
    const url = whatsappShareUrl("0813337193", "Bonjour");
    expect(url).toBe("https://wa.me/243813337193?text=Bonjour");
  });
});
