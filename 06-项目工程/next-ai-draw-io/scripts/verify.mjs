import { chromium } from "playwright-core";

const executablePath =
  process.env.CHROME_PATH ||
  "/Users/kangweiqing/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3210", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem("next-ai-draw-io:theme", "light");
  localStorage.removeItem("next-ai-draw-io:doc:v1");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".react-flow__node", { timeout: 20000 });
await page.waitForTimeout(1200);

const report = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".react-flow__node")].map((el) => {
    const label = el.querySelector(".node-label");
    const rect = el.getBoundingClientRect();
    const lr = label?.getBoundingClientRect();
    const overflow = label
      ? label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1
      : false;
    return {
      id: el.getAttribute("data-id"),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      overflow,
    };
  });

  const overlaps = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i].rect;
      const b = nodes[j].rect;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 2 && oy > 2) {
        overlaps.push({ a: nodes[i].id, b: nodes[j].id, ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
  }

  return {
    nodeCount: nodes.length,
    overlaps,
    overflow: nodes.filter((n) => n.overflow).map((n) => n.id),
  };
});

console.log(JSON.stringify(report));
await browser.close();
