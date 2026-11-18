const fs = require("node:fs");
const path = require("node:path");
const sharp = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\sharp");

const assetDirectory = path.join(
  process.cwd(),
  "web",
  "si-shi-ba-yang",
  "assets",
);

const assets = [
  [
    "C:\\Users\\liyage\\Pictures\\俞六药糖街市甘味铺.png",
    "imitation-market.png",
  ],
  [
    "C:\\Users\\liyage\\Pictures\\老少街谈药糖摊.png",
    "innovation-talk.png",
  ],
  [
    "C:\\Users\\liyage\\Pictures\\水墨糖果桶与庭院人物.png",
    "signature-carry.png",
  ],
];

async function copyAndOptimize() {
  for (const [source, destination] of assets) {
    const copiedPath = path.join(assetDirectory, destination);
    const webpPath = copiedPath.replace(/\.png$/i, ".webp");
    fs.copyFileSync(source, copiedPath);
    const metadata = await sharp(source).metadata();
    await sharp(source)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 84, effort: 5 })
      .toFile(webpPath);
    const { size: pngSize } = fs.statSync(copiedPath);
    const { size: webpSize } = fs.statSync(webpPath);
    console.log(
      `${destination}: ${metadata.width}x${metadata.height}, ${pngSize} bytes; ${path.basename(webpPath)}: ${webpSize} bytes`,
    );
  }
}

copyAndOptimize().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
