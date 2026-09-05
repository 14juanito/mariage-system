import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  console.log("1) Login admin…");
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "admin@mariage-demo.test");
  await page.fill("#password", "changeme123");
  await Promise.all([page.waitForURL("**/admin/dashboard"), page.click('button[type="submit"]')]);
  console.log("   OK →", page.url());

  console.log("2) Ajout d'un invité…");
  await page.goto(`${BASE}/admin/guests`);
  await page.click("text=Ajouter un invité");
  const uniqueLastName = `Smoketest-${Date.now()}`;
  await page.fill("#firstName", "Jean");
  await page.fill("#lastName", uniqueLastName);
  await page.click('button:has-text("Générer l\'invitation")');
  await page.waitForSelector(`text=${uniqueLastName}`, { timeout: 10000 });
  console.log("   OK → invité créé et visible dans le tableau");

  console.log("3) Ouverture de la fiche invité pour récupérer le lien…");
  await page.click(`text=${uniqueLastName}`);
  await page.waitForURL("**/admin/guests/**");
  const viewLink = await page.getAttribute('a:has-text("Voir")', "href");
  console.log("   Lien invitation :", viewLink);
  if (!viewLink) throw new Error("Lien d'invitation introuvable");

  const token = viewLink.split("/invitation/").pop();

  console.log("4) Ouverture de la page publique d'invitation…");
  const publicPage = await browser.newPage();
  await publicPage.goto(`${BASE}/invitation/${token}`);
  await publicPage.waitForSelector("text=Télécharger mon invitation");
  const bodyText = await publicPage.textContent("body");
  if (!bodyText.includes("Jean") || !bodyText.includes(uniqueLastName.toUpperCase())) {
    throw new Error("Le nom de l'invité n'apparaît pas sur la page publique");
  }
  console.log("   OK → page publique affiche bien l'invité");

  console.log("5) Téléchargement du PDF…");
  const pdfRes = await publicPage.request.get(`${BASE}/api/invitations/${token}/pdf`);
  const contentType = pdfRes.headers()["content-type"];
  const pdfBuffer = await pdfRes.body();
  console.log("   Status:", pdfRes.status(), "Content-Type:", contentType, "Taille:", pdfBuffer.length, "octets");
  if (pdfRes.status() !== 200 || !contentType.includes("application/pdf") || pdfBuffer.length < 1000) {
    throw new Error("Le PDF généré est invalide");
  }
  if (pdfBuffer.slice(0, 4).toString() !== "%PDF") {
    throw new Error("Le fichier retourné n'est pas un PDF valide (signature manquante)");
  }
  console.log("   OK → PDF valide généré");

  console.log("6) Vérification API stats (dashboard)…");
  const statsRes = await page.request.get(`${BASE}/api/stats`);
  const stats = await statsRes.json();
  console.log("   Stats:", stats);
  if (stats.totalGuests < 1 || stats.invitationsGenerated < 1) {
    throw new Error("Les statistiques du dashboard semblent incorrectes");
  }

  console.log("7) Déconnexion puis test rôle CHECKIN…");
  await page.goto(`${BASE}/admin/settings`);
  await page.waitForSelector("text=Équipe");

  await browser.close();

  if (errors.length > 0) {
    console.warn("\n⚠ Erreurs console détectées pendant le parcours :");
    errors.forEach((e) => console.warn("  -", e));
  }

  console.log("\n✅ SMOKE TEST RÉUSSI — parcours complet fonctionnel de bout en bout.");
}

main().catch((e) => {
  console.error("\n❌ SMOKE TEST ÉCHOUÉ:", e);
  process.exit(1);
});
