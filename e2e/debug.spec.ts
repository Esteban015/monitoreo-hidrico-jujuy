
import { expect, loadBundle, openApp, selectCase, test } from "./fixtures";

test("DEBUG imagenes offline", async ({ page }) => {
  page.on("request", (r) => { if (r.url().includes("quicklook")) console.log("REQ", r.url()); });
  page.on("requestfailed", (r) => { if (r.url().includes("quicklook")) console.log("FAIL", r.url(), r.failure()?.errorText); });
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  await page.getByText("Imágenes de control Sentinel-2").click();
  const imgs = page.getByTestId("results").locator("img");
  console.log("count", await imgs.count());
  for (let i = 0; i < (await imgs.count()); i++) {
    const img = imgs.nth(i);
    await img.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    console.log(i, JSON.stringify(await img.evaluate((el) => ({ src: (el as HTMLImageElement).src, complete: (el as HTMLImageElement).complete, nw: (el as HTMLImageElement).naturalWidth, rect: el.getBoundingClientRect().toJSON() }))));
  }
  console.log("scroll", await page.getByTestId("results").evaluate((el) => ({ top: el.scrollTop, h: el.scrollHeight, ch: el.clientHeight })));
});
