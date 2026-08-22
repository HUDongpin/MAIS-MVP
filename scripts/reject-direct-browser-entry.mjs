import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function directBrowserEntryFailureMessage(
  requestedEntry = "direct Playwright entry"
) {
  return `${requestedEntry} is disabled: actual Playwright execution must use the owner-manifest runner on the physical /Volumes/Starship mount.`;
}

export function rejectDirectBrowserEntry(requestedEntry) {
  throw new Error(directBrowserEntryFailureMessage(requestedEntry));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.error(directBrowserEntryFailureMessage(process.argv[2]));
  process.exitCode = 1;
}
