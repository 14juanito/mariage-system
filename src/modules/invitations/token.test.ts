import { describe, it, expect } from "vitest";
import { generateInvitationToken } from "./token";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateInvitationToken", () => {
  it("génère un UUID v4 valide", () => {
    expect(generateInvitationToken()).toMatch(UUID_V4_REGEX);
  });

  it("ne génère jamais deux fois le même token (1000 tirages)", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateInvitationToken()));
    expect(tokens.size).toBe(1000);
  });

  it("ne ressemble jamais à un ID séquentiel", () => {
    expect(generateInvitationToken()).not.toMatch(/^\d+$/);
  });
});
