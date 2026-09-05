import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("Connexion en tant que compte ACCUEIL (CHECKIN)…");
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "accueil@mariage-demo.test");
  await page.fill("#password", "changeme123");
  await Promise.all([page.waitForURL("**/admin/check-in"), page.click('button[type="submit"]')]);
  console.log("  OK → redirigé vers", page.url());

  console.log("Tentative d'accès direct à /admin/guests (doit être refusé)…");
  await page.goto(`${BASE}/admin/guests`);
  await page.waitForTimeout(500);
  if (!page.url().endsWith("/admin/check-in")) {
    throw new Error(`FAIL: le rôle CHECKIN a pu accéder à ${page.url()}`);
  }
  console.log("  OK → redirigé vers /admin/check-in");

  console.log("Tentative d'accès direct à /admin/settings (doit être refusé)…");
  await page.goto(`${BASE}/admin/settings`);
  await page.waitForTimeout(500);
  if (!page.url().endsWith("/admin/check-in")) {
    throw new Error(`FAIL: le rôle CHECKIN a pu accéder à ${page.url()}`);
  }
  console.log("  OK → redirigé vers /admin/check-in");

  console.log("Tentative d'appel direct à l'API /api/guests (doit renvoyer 401)…");
  const res = await page.request.get(`${BASE}/api/guests`);
  if (res.status() !== 401) {
    throw new Error(`FAIL: /api/guests a renvoyé ${res.status()} au lieu de 401 pour un compte CHECKIN`);
  }
  console.log("  OK → 401 Unauthorized");

  console.log("Tentative d'appel direct à l'API /api/stats (doit renvoyer 401)…");
  const statsRes = await page.request.get(`${BASE}/api/stats`);
  if (statsRes.status() !== 401) {
    throw new Error(`FAIL: /api/stats a renvoyé ${statsRes.status()} au lieu de 401 pour un compte CHECKIN`);
  }
  console.log("  OK → 401 Unauthorized");

  await browser.close();
  console.log("\n✅ TEST DE RÔLE RÉUSSI — le compte CHECKIN est correctement cantonné au scanner.");
}

main().catch((e) => {
  console.error("\n❌ TEST DE RÔLE ÉCHOUÉ:", e.message);
  process.exit(1);
});
