import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("autorise les requêtes tant que la capacité n'est pas dépassée", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { capacity: 5, refillPerSecond: 0.001 }).allowed).toBe(true);
    }
  });

  it("bloque au-delà de la capacité", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      rateLimit(key, { capacity: 5, refillPerSecond: 0.001 });
    }
    expect(rateLimit(key, { capacity: 5, refillPerSecond: 0.001 }).allowed).toBe(false);
  });
});
