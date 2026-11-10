import { chromium } from "playwright-core";

const executablePath =
  process.env.CHROME_PATH ||
  "/Users/kangweiqing/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const appUrl = process.env.APP_URL || "http://localhost:3210";
const outputPath = process.argv[2];

if (!outputPath) {
  console.error("用法: node scripts/screenshot.mjs <输出 PNG 路径>");
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 1150 },
  deviceScaleFactor: 2,
});

await page.goto(appUrl, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem("next-ai-draw-io:theme", "light");
  localStorage.removeItem("next-ai-draw-io:doc:v1");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".react-flow__node", { timeout: 20000 });
await page.waitForTimeout(1500);

const title = await page.locator(".topbar-title").inputValue();
const nodeCount = await page.locator(".react-flow__node").count();
const edgeCount = await page.locator(".react-flow__edge").count();

await page.locator(".react-flow").screenshot({ path: outputPath, scale: "device" });

console.log(JSON.stringify({ title, nodeCount, edgeCount, outputPath }));
await browser.close();
