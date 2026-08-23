import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = process.env.SCREENSHOT_DIR || "/tmp/mariage-screenshots";

async function main() {
  const browser = await chromium.launch();

  // Desktop context — login + dashboard
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dpage = await desktop.newPage();
  await dpage.goto(`${BASE}/login`);
  await dpage.screenshot({ path: `${OUT}/login-desktop.png` });

  await dpage.fill("#email", "admin@mariage-demo.test");
  await dpage.fill("#password", "changeme123");
  await Promise.all([dpage.waitForURL("**/admin/dashboard"), dpage.click('button[type="submit"]')]);
  await dpage.waitForTimeout(500);
  await dpage.screenshot({ path: `${OUT}/dashboard-desktop.png`, fullPage: true });

  await dpage.goto(`${BASE}/admin/guests`);
  await dpage.waitForTimeout(300);
  await dpage.screenshot({ path: `${OUT}/guests-desktop.png`, fullPage: true });

  const invLink = await dpage.locator('a:has-text("Voir")').first();
  await dpage.goto(`${BASE}/admin/wedding`);
  await dpage.screenshot({ path: `${OUT}/wedding-desktop.png`, fullPage: true });

  // Mobile context — invitation + check-in
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();

  const guestsRes = await dpage.request.get(`${BASE}/api/guests`);
  const { guests } = await guestsRes.json();
  const token = guests.find((g) => g.invitation)?.invitation?.token;

  if (token) {
    await mpage.goto(`${BASE}/invitation/${token}`);
    await mpage.waitForTimeout(300);
    await mpage.screenshot({ path: `${OUT}/invitation-mobile.png`, fullPage: true });
  }

  await mpage.goto(`${BASE}/login`);
  await mpage.screenshot({ path: `${OUT}/login-mobile.png` });
  await mpage.fill("#email", "accueil@mariage-demo.test");
  await mpage.fill("#password", "changeme123");
  await Promise.all([mpage.waitForURL("**/admin/check-in"), mpage.click('button[type="submit"]')]);
  await mpage.waitForTimeout(300);
  await mpage.screenshot({ path: `${OUT}/checkin-mobile.png` });

  await browser.close();
  console.log("Captures enregistrées dans", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
