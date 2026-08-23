/**
 * Test critique (voir cahier des charges, section 37) :
 *   Invitation A → Scan 1 : ACCEPTED, Scan 2 : ALREADY USED
 *   Deux appareils, même QR, même moment → un seul ACCEPTED.
 *
 * Ce script crée un invité/invitation jetables, déclenche deux scans
 * strictement concurrents (Promise.all) sur le même token, puis vérifie
 * qu'exactement un résultat est VALID et l'autre ALREADY_USED.
 *
 * Usage : npm run test:concurrency
 */
import { PrismaClient } from "@prisma/client";
import { scanInvitationToken } from "../src/modules/check-in/service";
import { generateInvitationToken } from "../src/modules/invitations/token";

const prisma = new PrismaClient();

async function main() {
  const wedding = await prisma.wedding.findFirst();
  const scanner = await prisma.user.findFirst();
  if (!wedding || !scanner) {
    throw new Error("Base de test vide — exécutez `npm run prisma:seed` d'abord.");
  }

  const guest = await prisma.guest.create({
    data: {
      weddingId: wedding.id,
      firstName: "Test",
      lastName: `Concurrence-${Date.now()}`,
    },
  });

  const invitation = await prisma.invitation.create({
    data: { guestId: guest.id, weddingId: wedding.id, token: generateInvitationToken() },
  });

  console.log(`Invitation de test créée : ${invitation.token}`);
  console.log("Lancement de deux scans strictement concurrents…");

  const [resultA, resultB] = await Promise.all([
    scanInvitationToken(invitation.token, scanner.id),
    scanInvitationToken(invitation.token, scanner.id),
  ]);

  console.log("Résultat scan A :", resultA.result);
  console.log("Résultat scan B :", resultB.result);

  const results = [resultA.result, resultB.result];
  const validCount = results.filter((r) => r === "VALID").length;
  const alreadyUsedCount = results.filter((r) => r === "ALREADY_USED").length;

  await prisma.guest.delete({ where: { id: guest.id } }); // cascade sur invitation + check_ins

  if (validCount === 1 && alreadyUsedCount === 1) {
    console.log("\n✅ TEST RÉUSSI — un seul scan a obtenu VALID, l'autre ALREADY_USED.");
    process.exit(0);
  } else {
    console.error(
      `\n❌ TEST ÉCHOUÉ — attendu 1×VALID + 1×ALREADY_USED, obtenu : ${validCount}×VALID, ${alreadyUsedCount}×ALREADY_USED.`,
    );
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
