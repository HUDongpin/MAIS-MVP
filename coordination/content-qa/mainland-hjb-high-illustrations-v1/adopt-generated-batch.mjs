import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const defaultSourceDir = "/Users/dongpinhu/.codex/generated_images/019e68ba-9ee0-7eb1-ae26-40d25f7bef3c";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const start = Number(argValue("--start", "0"));
const count = Number(argValue("--count", "0"));
const marker = argValue("--marker");
const sourceDir = argValue("--source-dir", defaultSourceDir);

if (!Number.isInteger(start) || start < 0) throw new Error(`Invalid --start ${start}`);
if (!Number.isInteger(count) || count <= 0) throw new Error(`Invalid --count ${count}`);
if (!marker || !existsSync(marker)) throw new Error(`Marker file is required and must exist: ${marker}`);
if (!existsSync(sourceDir)) throw new Error(`Source image directory is missing: ${sourceDir}`);

const markerMtime = Number(execFileSync("stat", ["-f", "%m", marker], { encoding: "utf8" }).trim());
const plan = JSON.parse(readFileSync(path.join(__dirname, "illustration-plan.json"), "utf8"));
const batch = plan.illustrations.slice(start, start + count);

if (batch.length !== count) {
  throw new Error(`Plan has only ${batch.length} entries for start=${start}, count=${count}`);
}

const sourceFiles = execFileSync("find", [sourceDir, "-maxdepth", "1", "-type", "f", "-name", "*.png"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((filePath) => {
    const mtime = Number(execFileSync("stat", ["-f", "%m", filePath], { encoding: "utf8" }).trim());
    return { filePath, mtime };
  })
  .filter((entry) => entry.mtime >= markerMtime)
  .sort((left, right) => left.mtime - right.mtime || left.filePath.localeCompare(right.filePath));

if (sourceFiles.length !== count) {
  console.log(JSON.stringify({ sourceDir, marker, markerMtime, expected: count, found: sourceFiles.length, files: sourceFiles }, null, 2));
  throw new Error(`Expected exactly ${count} generated PNGs after marker, found ${sourceFiles.length}`);
}

batch.forEach((illustration, index) => {
  const destination = path.join(projectRoot, illustration.candidatePath);
  const tempDestination = `${destination}.raw.png`;
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(sourceFiles[index].filePath, tempDestination);
  execFileSync("sips", ["-z", "900", "1600", tempDestination, "--out", destination], { stdio: "ignore" });
});

console.log(JSON.stringify({
  adopted: batch.map((illustration, index) => ({
    id: illustration.id,
    source: sourceFiles[index].filePath,
    destination: illustration.candidatePath
  }))
}, null, 2));
