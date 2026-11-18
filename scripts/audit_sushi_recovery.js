const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPORT = path.join(ROOT, "output", "audit-sushi-recovery-references.json");
const CODE_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".md",
  ".json",
]);
const ASSET_EXTENSIONS =
  /\.(?:png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|ttf|otf|woff2?|mp4|webm)(?:[?#].*)?$/i;
const VENDOR_SCRIPT_PATTERN = /(?:^|[\\/])(?:gsap(?:\.min)?|vendor)(?:\.[^\\/]+)?\.m?js$/i;
const INTENTIONALLY_PENDING_ASSETS = new Set([
  "public/assets/forty-eight/dragon-assembly/audio/assembly-step.mp3",
  "public/assets/forty-eight/dragon-assembly/audio/assembly-complete.mp3",
]);

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      [".git", "output", ".qa-edge-feeding", "node_modules", "scripts"].includes(
        entry.name,
      )
    ) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute));
    else output.push(absolute);
  }
  return output;
}

function stripReference(value) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/[?#].*$/, "");
}

function isLocalAsset(reference) {
  return (
    reference &&
    !reference.startsWith("data:") &&
    !reference.startsWith("blob:") &&
    !reference.startsWith("http:") &&
    !reference.startsWith("https:") &&
    !reference.startsWith("mailto:") &&
    !reference.startsWith("tel:") &&
    !reference.startsWith("#")
  );
}

function hasAssetExtension(reference) {
  return ASSET_EXTENSIONS.test(reference);
}

function findReferences(file, content) {
  const extension = path.extname(file);
  const references = [];
  if (VENDOR_SCRIPT_PATTERN.test(file)) return references;
  if (extension === ".html") {
    for (const match of content.matchAll(
      /\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi,
    )) {
      if (isLocalAsset(match[1])) references.push(match[1]);
    }
  }
  if (extension === ".css") {
    for (const match of content.matchAll(
      /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    )) {
      if (isLocalAsset(match[1])) references.push(match[1]);
    }
  }
  if (extension === ".js" || extension === ".mjs") {
    for (const match of content.matchAll(
      /["'`]([^"'`\r\n]+?\.(?:png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|ttf|otf|woff2?))(?:\?[^"'`]*)?["'`]/gi,
    )) {
      const prefix = content.slice(Math.max(0, match.index - 80), match.index);
      if (
        isLocalAsset(match[1]) &&
        !/\bdownload\s*=\s*$/i.test(prefix)
      ) {
        references.push(match[1]);
      }
    }
  }
  return [...new Set(references.map(stripReference))];
}

function findAssetRoot(file, content) {
  if (![".js", ".mjs"].includes(path.extname(file))) return null;
  const match = content.match(
    /\bconst\s+(?:ASSET_ROOT|DEFAULT_ROOT)\s*=\s*["'`]([^"'`]+)["'`]/,
  );
  if (!match) return null;
  const value = match[1];
  const publicIndex = value.indexOf("public/");
  return publicIndex >= 0
    ? path.join(ROOT, value.slice(publicIndex))
    : value.startsWith("/")
    ? path.join(ROOT, value.replace(/^\/+/, ""))
    : path.resolve(path.dirname(file), value);
}

function resolveReference(file, reference, assetRoot) {
  const cleaned = reference.replace(/^\/+/u, "");
  const candidates = [];

  if (reference.startsWith("/")) {
    candidates.push(path.join(ROOT, cleaned));
  } else {
    candidates.push(path.resolve(path.dirname(file), reference));
    if (assetRoot) candidates.push(path.resolve(assetRoot, reference));
  }

  candidates.push(path.join(ROOT, cleaned));
  candidates.push(path.join(ROOT, "web", cleaned));
  return [...new Set(candidates)];
}

function classify(file) {
  const relative = path.relative(ROOT, file).replaceAll("\\", "/");
  if (relative.startsWith("web/si-shi-ba-yang/")) return "四十八样";
  if (relative.includes("gou-bu-li")) return "狗不理";
  if (relative.includes("ni-ren-zhang") || relative.includes("mi-ren-zhang")) {
    return "泥人张";
  }
  if (relative.includes("hei-tou")) return "黑头";
  if (relative.includes("archive")) return "首页与档案";
  return "全项目";
}

const files = walk(ROOT).filter((file) =>
  CODE_EXTENSIONS.has(path.extname(file).toLowerCase()),
);
const missing = [];
const found = [];
let referenceCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const assetRoot = findAssetRoot(file, content);
  for (const reference of findReferences(file, content)) {
    if (
      !hasAssetExtension(reference) ||
      reference.includes("${") ||
      reference.includes("*")
    ) {
      continue;
    }
    referenceCount += 1;
    const candidates = resolveReference(file, reference, assetRoot);
    const target = candidates.find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );
    const missingTarget =
      target ||
      (assetRoot ? path.resolve(assetRoot, reference) : candidates[0]);
    const relativeTarget = path
      .relative(ROOT, missingTarget)
      .replaceAll("\\", "/");
    const pendingByDesign = INTENTIONALLY_PENDING_ASSETS.has(relativeTarget);
    const record = {
      story: classify(file),
      sourceFile: path.relative(ROOT, file).replaceAll("\\", "/"),
      reference,
      target: relativeTarget,
      status: target ? "found" : pendingByDesign ? "pending" : "missing",
      ...(assetRoot
        ? {
            assetRoot: path.relative(ROOT, assetRoot).replaceAll("\\", "/"),
          }
        : {}),
    };
    if (target) {
      found.push(record);
    } else {
      missing.push(record);
    }
  }
}

const storySummary = {};
for (const record of [...found, ...missing]) {
  storySummary[record.story] ||= { found: 0, missing: 0 };
  storySummary[record.story][
    missing.includes(record) ? "missing" : "found"
  ] += 1;
}

const report = {
  projectRoot: ROOT,
  scannedCodeFiles: files.length,
  referenceCount,
  foundCount: found.length,
  missingCount: missing.length,
  missingWithoutDeclaredPending: missing.filter(
    (record) => record.status !== "pending",
  ).length,
  storySummary,
  missing,
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      scannedCodeFiles: report.scannedCodeFiles,
      referenceCount: report.referenceCount,
      foundCount: report.foundCount,
      missingCount: report.missingCount,
      storySummary: report.storySummary,
      missing: report.missing,
      report: REPORT,
    },
    null,
    2,
  ),
);
