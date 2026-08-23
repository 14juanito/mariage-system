import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();

  // Admin crée un invité de test et récupère son token.
  const adminPage = await browser.newPage();
  await adminPage.goto(`${BASE}/login`);
  await adminPage.fill("#email", "admin@mariage-demo.test");
  await adminPage.fill("#password", "changeme123");
  await Promise.all([adminPage.waitForURL("**/admin/dashboard"), adminPage.click('button[type="submit"]')]);

  await adminPage.goto(`${BASE}/admin/guests`);
  await adminPage.click("text=Ajouter un invité");
  const lastName = `ScanAPI-${Date.now()}`;
  await adminPage.fill("#firstName", "Marie");
  await adminPage.fill("#lastName", lastName);
  await adminPage.click('button:has-text("Générer l\'invitation")');
  await adminPage.waitForSelector(`text=${lastName}`);

  const guestsRes = await adminPage.request.get(`${BASE}/api/guests?q=${encodeURIComponent(lastName)}`);
  const { guests } = await guestsRes.json();
  const token = guests[0].invitation.token;
  console.log("Token de test :", token);

  // Connexion en tant que compte ACCUEIL pour scanner via l'API réelle.
  const checkinPage = await browser.newPage();
  await checkinPage.goto(`${BASE}/login`);
  await checkinPage.fill("#email", "accueil@mariage-demo.test");
  await checkinPage.fill("#password", "changeme123");
  await Promise.all([
    checkinPage.waitForURL("**/admin/check-in"),
    checkinPage.click('button[type="submit"]'),
  ]);

  console.log("Premier scan via /api/check-in/scan…");
  const scan1 = await checkinPage.request.post(`${BASE}/api/check-in/scan`, {
    data: { token: `${BASE}/invitation/${token}` }, // simule le contenu réel scanné (URL complète)
  });
  const outcome1 = await scan1.json();
  console.log("  →", outcome1);
  if (outcome1.result !== "VALID") throw new Error(`FAIL: premier scan attendu VALID, obtenu ${outcome1.result}`);

  console.log("Deuxième scan (même token)…");
  const scan2 = await checkinPage.request.post(`${BASE}/api/check-in/scan`, {
    data: { token },
  });
  const outcome2 = await scan2.json();
  console.log("  →", outcome2);
  if (outcome2.result !== "ALREADY_USED")
    throw new Error(`FAIL: deuxième scan attendu ALREADY_USED, obtenu ${outcome2.result}`);

  console.log("Scan d'un token invalide…");
  const scan3 = await checkinPage.request.post(`${BASE}/api/check-in/scan`, {
    data: { token: "00000000-0000-0000-0000-000000000000" },
  });
  const outcome3 = await scan3.json();
  console.log("  →", outcome3);
  if (outcome3.result !== "INVALID") throw new Error(`FAIL: attendu INVALID, obtenu ${outcome3.result}`);

  await browser.close();
  console.log("\n✅ TEST API SCAN RÉUSSI — VALID → ALREADY_USED → INVALID, comme attendu, via le rôle CHECKIN.");
}

main().catch((e) => {
  console.error("\n❌ TEST API SCAN ÉCHOUÉ:", e.message);
  process.exit(1);
});
