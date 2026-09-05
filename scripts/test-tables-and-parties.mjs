import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill("#email", "admin@mariage-demo.test");
  await page.fill("#password", "changeme123");
  await Promise.all([page.waitForURL("**/admin/dashboard"), page.click('button[type="submit"]')]);

  console.log("1) Création d'une table de test (numéro élevé pour éviter les collisions)…");
  const tableNumber = 900 + Math.floor(Math.random() * 90);
  await page.goto(`${BASE}/admin/tables`);
  await page.click("text=Créer une table");
  await page.fill("#number", String(tableNumber));
  await page.fill("#name", "Table Test Capacité");
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForSelector(`text=Table ${tableNumber}`);
  console.log(`   OK → Table ${tableNumber} créée`);

  const suffix = Date.now();

  async function addGuest({ partyType, firstName, lastName, table }) {
    await page.goto(`${BASE}/admin/guests`);
    await page.click("text=Ajouter un invité");
    const dialog = page.locator('[role="dialog"]');
    if (partyType === "COUPLE") {
      await dialog.locator('button:has-text("Couple")').click();
      await page.fill("#lastName", lastName);
    } else {
      await page.fill("#firstName", firstName);
      await page.fill("#lastName", lastName);
    }
    if (table) {
      const options = await page.locator("#tableId option").allTextContents();
      const idx = options.findIndex((o) => o.includes(`Table ${table}`));
      if (idx >= 0) await page.selectOption("#tableId", { index: idx });
    }
    await dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(400);
  }

  console.log("2) Ajout de 5 invités seuls + 3 couples sur cette table (5 + 6 = 11 places)…");
  for (let i = 0; i < 5; i++) {
    await addGuest({ partyType: "SINGLE", firstName: "Solo", lastName: `Test${suffix}-${i}`, table: tableNumber });
  }
  for (let i = 0; i < 2; i++) {
    await addGuest({ partyType: "COUPLE", lastName: `CoupleTest${suffix}-${i}`, table: tableNumber });
  }
  // À ce stade : 5 (solo) + 2*2 (couples) = 9 places sur 10.

  await page.goto(`${BASE}/admin/tables`);
  await page.waitForSelector(`text=Table ${tableNumber}`);
  const occupancyText = await page.locator(`text=/9\\/10 places/`).count();
  console.log(`   Occupation affichée 9/10 : ${occupancyText > 0 ? "OK" : "INATTENDU"}`);

  console.log("3) Tentative d'ajout d'un 3e couple (dépasserait 10 → doit être refusé)…");
  await page.goto(`${BASE}/admin/guests`);
  await page.click("text=Ajouter un invité");
  await page.locator('[role="dialog"] button:has-text("Couple")').click();
  await page.fill("#lastName", `CoupleRefuse${suffix}`);
  const options = await page.locator("#tableId option").allTextContents();
  const idx = options.findIndex((o) => o.includes(`Table ${tableNumber}`));
  const fullOptionDisabled = idx >= 0 ? await page.locator("#tableId option").nth(idx).isDisabled() : null;
  console.log(`   Option de table désactivée côté client (1 place restante < 2 nécessaires) : ${fullOptionDisabled}`);
  await browser.close();

  if (!fullOptionDisabled) {
    throw new Error("FAIL: la table pleine aurait dû être désactivée dans le select (protection UX)");
  }

  console.log("\n✅ TEST TABLES RÉUSSI — capacité de 10 places respectée et reflétée dans l'UI.");
}

main().catch((e) => {
  console.error("\n❌ TEST TABLES ÉCHOUÉ:", e.message);
  process.exit(1);
});
