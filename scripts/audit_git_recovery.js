const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const REPORT = path.join(ROOT, "output", "audit-git-recovery.json");
const CODE_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
]);

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      [".git", ".qa-edge-feeding", "node_modules", "output"].includes(
        entry.name,
      )
    ) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function gitBlobHash(buffer) {
  return crypto
    .createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

function classify(buffer) {
  const text = buffer.toString("utf8");
  const markers = [];
  const probes = new Map([
    ["首页与档案", ["archiveExperience", "archiveFolder"]],
    ["黑头", ["heiTouExperience", "heitou"]],
    ["狗不理", ["dogBuLiExperience", "gou-bu-li"]],
    ["泥人张", ["niRenZhangExperience", "ni-ren-zhang"]],
    ["四十八样", ["walk8Experience", "dragonAssembly", "sishi"]],
    ["原文阅读", ["original-text", "readingDialog"]],
  ]);
  for (const [story, needles] of probes) {
    if (needles.some((needle) => text.includes(needle))) markers.push(story);
  }
  let kind = "other";
  if (/^<!doctype html|<html[\s>]/i.test(text)) kind = "html";
  else if (/^\s*@font-face|^[\s\S]*\.[\w-]+\s*\{/.test(text)) kind = "css";
  else if (/\bfunction\s|\bconst\s|\bimport\s|\bexport\s/.test(text)) {
    kind = "javascript";
  } else if (/^\s*#\s|^\s*[\[{]/m.test(text)) kind = "text-or-data";
  return {
    kind,
    markers,
    preview: text.replace(/\s+/gu, " ").trim().slice(0, 180),
  };
}

function shingles(text, size = 48, limit = 2400) {
  const normalized = text.replace(/\s+/gu, " ");
  const values = [];
  const step = Math.max(1, Math.ceil(normalized.length / limit));
  for (let index = 0; index < normalized.length; index += step) {
    values.push(normalized.slice(index, index + size));
  }
  return new Set(values);
}

function nearestCurrentFile(buffer, extension, candidatesByExtension) {
  const candidates = candidatesByExtension.get(extension) || [];
  const source = shingles(buffer.toString("utf8"));
  let best = null;
  for (const candidate of candidates) {
    let overlap = 0;
    for (const shingle of candidate.shingles) {
      if (source.has(shingle)) overlap += 1;
    }
    const score =
      overlap / Math.max(1, Math.min(source.size, candidate.shingles.size));
    if (!best || score > best.similarity) {
      best = {
        path: candidate.path,
        similarity: Number(score.toFixed(4)),
      };
    }
  }
  return best;
}

function identifiers(text, kind) {
  const values = new Set();
  if (kind === "css") {
    for (const match of text.matchAll(/([.#])([a-zA-Z][\w-]{5,})/gu)) {
      values.add(match[2]);
    }
  } else if (kind === "html") {
    for (const match of text.matchAll(
      /\bid=["']([^"']+)["']|\bclass=["']([^"']+)["']/giu,
    )) {
      for (const value of (match[1] || match[2] || "").split(/\s+/u)) {
        if (value.length >= 6) values.add(value);
      }
    }
  }
  return values;
}

function runGit(args) {
  const result = require("node:child_process").spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return result.stdout || "";
}

const codeFiles = walk(ROOT).filter((file) =>
  CODE_EXTENSIONS.has(path.extname(file).toLowerCase()),
);
const currentByHash = new Map();
const candidatesByExtension = new Map();
const currentCodeText = [];
for (const file of codeFiles) {
  const buffer = fs.readFileSync(file);
  currentCodeText.push(buffer.toString("utf8"));
  const hash = gitBlobHash(buffer);
  const matches = currentByHash.get(hash) || [];
  matches.push(path.relative(ROOT, file).replaceAll("\\", "/"));
  currentByHash.set(hash, matches);
  const extension = path.extname(file).toLowerCase();
  const candidates = candidatesByExtension.get(extension) || [];
  candidates.push({
    path: path.relative(ROOT, file).replaceAll("\\", "/"),
    shingles: shingles(buffer.toString("utf8")),
  });
  candidatesByExtension.set(extension, candidates);
}

const refs = runGit(["show-ref"]).trim();
const log = runGit(["log", "--all", "--oneline", "-10"]).trim();
const fsck = runGit([
  "fsck",
  "--full",
  "--no-reflogs",
  "--unreachable",
]);
const danglingIds = [
  ...new Set(
    [...fsck.matchAll(/dangling blob ([0-9a-f]{40})/giu)].map(
      (match) => match[1],
    ),
  ),
];
const dangling = danglingIds.map((id) => {
  const { status, stdout } = require("node:child_process").spawnSync(
    "git",
    ["cat-file", "-p", id],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
  );
  if (status !== 0) {
    return { id, readable: false };
  }
  const classified = classify(stdout);
  const text = stdout.toString("utf8");
  const missingIdentifiers = [...identifiers(text, classified.kind)]
    .filter((token) => !currentCodeText.some((entry) => entry.includes(token)))
    .slice(0, 40);
  const extensionHint =
    classified.kind === "html"
      ? ".html"
      : classified.kind === "css"
        ? ".css"
        : classified.kind === "javascript"
          ? ".js"
          : ".md";
  return {
    id,
    readable: true,
    bytes: stdout.length,
    currentMatches: currentByHash.get(id) || [],
    nearestCurrentFile: nearestCurrentFile(
      stdout,
      extensionHint,
      candidatesByExtension,
    ),
    missingIdentifiers,
    ...classified,
  };
});

const unique = dangling.filter((item) => !item.currentMatches?.length);
const report = {
  projectRoot: ROOT,
  hasCommits: Boolean(log),
  refs: refs ? refs.split(/\r?\n/u) : [],
  recentCommits: log ? log.split(/\r?\n/u) : [],
  scannedCodeFiles: codeFiles.length,
  danglingBlobCount: dangling.length,
  matchedCurrentBlobCount: dangling.length - unique.length,
  uniqueDanglingBlobCount: unique.length,
  dangling,
  summary:
    "No commits or refs were found. Dangling blobs are compared by exact Git object hash with the current code tree.",
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      hasCommits: report.hasCommits,
      refCount: report.refs.length,
      scannedCodeFiles: report.scannedCodeFiles,
      danglingBlobCount: report.danglingBlobCount,
      matchedCurrentBlobCount: report.matchedCurrentBlobCount,
      uniqueDanglingBlobCount: report.uniqueDanglingBlobCount,
      unique: unique.map((item) => ({
        id: item.id,
        bytes: item.bytes,
        kind: item.kind,
        markers: item.markers,
        preview: item.preview,
      })),
      report: REPORT,
    },
    null,
    2,
  ),
);
