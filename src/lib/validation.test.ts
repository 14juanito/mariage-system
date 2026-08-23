import { describe, it, expect } from "vitest";
import { guestSchema, loginSchema, resetCheckInSchema, tableSchema } from "./validation";

describe("guestSchema", () => {
  it("accepte un invité seul minimal (prénom + nom uniquement)", () => {
    const result = guestSchema.safeParse({ firstName: "Jean", lastName: "Dupont", partyType: "SINGLE" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it("rejette un prénom vide pour un invité seul", () => {
    const result = guestSchema.safeParse({ firstName: "  ", lastName: "Dupont", partyType: "SINGLE" });
    expect(result.success).toBe(false);
  });

  it("accepte un couple sans prénom (juste le nom du couple)", () => {
    const result = guestSchema.safeParse({ lastName: "Mbaya", partyType: "COUPLE" });
    expect(result.success).toBe(true);
  });

  it("rejette un e-mail invalide s'il est renseigné", () => {
    const result = guestSchema.safeParse({ firstName: "Jean", lastName: "Dupont", email: "pas-un-email" });
    expect(result.success).toBe(false);
  });

  it("accepte une civilité MR/MME ou vide", () => {
    expect(guestSchema.safeParse({ firstName: "Jean", lastName: "Dupont", civility: "MR" }).success).toBe(true);
    expect(guestSchema.safeParse({ firstName: "Jean", lastName: "Dupont", civility: "" }).success).toBe(true);
  });
});

describe("tableSchema", () => {
  it("exige un numéro de table valide", () => {
    expect(tableSchema.safeParse({ number: "4" }).success).toBe(true);
    expect(tableSchema.safeParse({ number: "0" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejette une adresse e-mail invalide", () => {
    expect(loginSchema.safeParse({ email: "pas-un-email", password: "x" }).success).toBe(false);
  });

  it("rejette un mot de passe vide", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("resetCheckInSchema", () => {
  it("exige un motif d'au moins 5 caractères", () => {
    const invitationId = "550e8400-e29b-41d4-a716-446655440000";
    expect(resetCheckInSchema.safeParse({ invitationId, reason: "oups" }).success).toBe(false);
    expect(resetCheckInSchema.safeParse({ invitationId, reason: "Erreur de scan" }).success).toBe(true);
  });
});
