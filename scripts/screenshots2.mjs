import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = "/tmp/mariage-screenshots";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill("#email", "admin@mariage-demo.test");
  await page.fill("#password", "changeme123");
  await Promise.all([page.waitForURL("**/admin/dashboard"), page.click('button[type="submit"]')]);

  // Empty state (no guests currently)
  await page.goto(`${BASE}/admin/guests`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/guests-empty.png` });

  await page.goto(`${BASE}/admin/invitations`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/invitations-empty.png` });

  await page.goto(`${BASE}/admin/settings`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/settings.png` });

  // create a guest to view detail page
  await page.goto(`${BASE}/admin/guests`);
  await page.click("text=Ajouter un invité");
  await page.fill("#firstName", "Sophie");
  await page.fill("#lastName", "Detail-QA");
  await page.click('button:has-text("Générer l\'invitation")');
  await page.waitForSelector("text=Detail-QA");
  await page.click("text=Detail-QA");
  await page.waitForURL("**/admin/guests/**");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/guest-detail.png`, fullPage: true });

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
