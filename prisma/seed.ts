import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@mariage-demo.test";
  const checkinEmail = "accueil@mariage-demo.test";
  const defaultPassword = "changeme123";

  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Marié·e Admin", passwordHash },
  });

  const checkinUser = await prisma.user.upsert({
    where: { email: checkinEmail },
    update: {},
    create: { email: checkinEmail, name: "Équipe Accueil", passwordHash },
  });

  const existingWedding = await prisma.wedding.findFirst({ where: { ownerId: admin.id } });
  const wedding =
    existingWedding ??
    (await prisma.wedding.create({
      data: {
        ownerId: admin.id,
        brideName: "Amina",
        groomName: "Junior",
        weddingDate: new Date("2026-11-14"),
        weddingTime: "16:00",
        venueName: "Domaine des Eucalyptus",
        venueAddress: "12 Avenue des Palmiers, Kinshasa",
        welcomeMessage:
          "Nous serions heureux de vous compter parmi nous pour partager ce moment unique, entouré de ceux qui comptent le plus.",
      },
    }));

  await prisma.weddingStaff.upsert({
    where: { weddingId_userId: { weddingId: wedding.id, userId: admin.id } },
    update: {},
    create: { weddingId: wedding.id, userId: admin.id, role: "ADMIN" },
  });

  await prisma.weddingStaff.upsert({
    where: { weddingId_userId: { weddingId: wedding.id, userId: checkinUser.id } },
    update: {},
    create: { weddingId: wedding.id, userId: checkinUser.id, role: "CHECKIN" },
  });

  for (const number of [1, 2]) {
    await prisma.table.upsert({
      where: { weddingId_number: { weddingId: wedding.id, number } },
      update: {},
      create: { weddingId: wedding.id, number, name: number === 1 ? "Table d'honneur" : undefined },
    });
  }

  console.log("✔ Seed terminé.");
  console.log(`  Admin      : ${adminEmail} / ${defaultPassword}`);
  console.log(`  Accueil    : ${checkinEmail} / ${defaultPassword}`);
  console.log(`  Mariage    : ${wedding.brideName} & ${wedding.groomName} (${wedding.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
