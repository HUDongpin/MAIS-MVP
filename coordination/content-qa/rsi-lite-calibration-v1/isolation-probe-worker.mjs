import { appendFile, chmod, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";

const [inputPath, ownOutbox] = process.argv.slice(2);

async function denied(operation) {
  try {
    await operation();
    return false;
  } catch (error) {
    return error?.code === "EPERM" || error?.code === "EACCES";
  }
}

async function networkDenied() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 9 });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 750);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve(error?.code === "EPERM" || error?.code === "EACCES");
    });
  });
}

async function symlinkEscapeDenied(target, linkPath, operation) {
  try {
    await symlink(target, linkPath);
  } catch (error) {
    return error?.code === "EPERM" || error?.code === "EACCES";
  }
  return denied(() => operation(linkPath));
}

function childProcessSpawnDenied() {
  try {
    const result = spawnSync(process.execPath, ["-e", "process.exit(0)"], {
      stdio: "ignore",
      timeout: 1_000
    });
    return result.error?.code === "EPERM" || result.error?.code === "EACCES";
  } catch (error) {
    return error?.code === "EPERM" || error?.code === "EACCES";
  }
}

try {
  const inputText = await readFile(inputPath, "utf8");
  const input = JSON.parse(inputText);
  const ownProbePath = path.join(ownOutbox, "own-write-canary.txt");
  let ownOutboxWriteAllowed = false;
  try {
    await writeFile(ownProbePath, "synthetic-own-outbox-write\n", { flag: "wx", mode: 0o600 });
    ownOutboxWriteAllowed = true;
  } catch {}

  const credentialPattern = /(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|^HOME$|USERPROFILE|^SSH_|^AWS_|^GOOGLE_|^VERCEL|^GITHUB)/i;
  const protectedLinkPath = path.join(ownOutbox, "protected-canary-link");
  const siblingLinkPath = path.join(ownOutbox, "sibling-outbox-link");
  const result = {
    roleId: input.roleId,
    inputReadAllowed: true,
    ownOutboxWriteAllowed,
    protectedCanaryReadDenied: await denied(() => readFile(input.protectedCanaryPath, "utf8")),
    protectedCanaryMetadataDenied: await denied(() => stat(input.protectedCanaryPath)),
    protectedSymlinkEscapeDenied: await symlinkEscapeDenied(
      input.protectedCanaryPath,
      protectedLinkPath,
      (linkPath) => readFile(linkPath, "utf8")
    ),
    inputWriteDenied: await denied(() => appendFile(inputPath, "tamper")),
    inputChmodDenied: await denied(() => chmod(inputPath, 0o600)),
    siblingOutboxWriteDenied: await denied(() => writeFile(path.join(input.siblingOutbox, "cross-write.txt"), "tamper")),
    siblingSymlinkWriteDenied: await symlinkEscapeDenied(
      input.siblingOutbox,
      siblingLinkPath,
      (linkPath) => writeFile(path.join(linkPath, "cross-write-through-link.txt"), "tamper")
    ),
    repositoryReadDenied: await denied(() => readFile(input.repositoryCanaryPath, "utf8")),
    networkDenied: await networkDenied(),
    credentialEnvironmentAbsent: Object.keys(process.env).every((key) => !credentialPattern.test(key)),
    childProcessSpawnDenied: childProcessSpawnDenied()
  };
  const passed = Object.values(result).slice(1).every((value) => value === true);
  await writeFile(path.join(ownOutbox, "probe-result.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  if (!passed) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
