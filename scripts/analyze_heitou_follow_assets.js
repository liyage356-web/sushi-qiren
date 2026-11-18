const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const ORIGIN = process.argv[2] || "http://127.0.0.1:4183/";
const ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(ROOT, "web", "images", "hei-tou", "follow");
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

async function main() {
  const executablePath = BROWSER_CANDIDATES.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executablePath) throw new Error("No installed Edge or Chrome.");

  const files = fs
    .readdirSync(ASSET_ROOT)
    .filter((name) => name.endsWith(".png"))
    .sort();
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(ORIGIN, { waitUntil: "domcontentloaded" });
    const measurements = await page.evaluate(async (names) => {
      async function inspect(name) {
        const image = new Image();
        image.src = `images/hei-tou/follow/${name}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });
        context.drawImage(image, 0, 0);
        const data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let left = canvas.width;
        let right = -1;
        let top = canvas.height;
        let bottom = -1;
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            if (data[(y * canvas.width + x) * 4 + 3] <= 8) continue;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        const width = right - left + 1;
        const height = bottom - top + 1;
        return {
          name,
          naturalWidth: canvas.width,
          naturalHeight: canvas.height,
          bbox: { left, top, right, bottom, width, height },
          ratios: {
            left: left / canvas.width,
            right:
              (canvas.width - 1 - right) / canvas.width,
            top: top / canvas.height,
            bottom: (canvas.height - 1 - bottom) / canvas.height,
            visibleWidth: width / canvas.width,
            visibleHeight: height / canvas.height,
          },
          visibleAspect: width / height,
        };
      }
      return Promise.all(names.map(inspect));
    }, files);
    const reportPath = path.join(
      ROOT,
      "output",
      "heitou-follow-asset-alpha-bounds.json",
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      `${JSON.stringify(measurements, null, 2)}\n`,
    );
    console.log(JSON.stringify(measurements, null, 2));
    console.log(reportPath);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
