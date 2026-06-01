import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmBaseArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];

const services = [
  { name: "backend", color: "\x1b[36m", args: ["--prefix", "backend", "run", "dev"] },
  { name: "frontend", color: "\x1b[35m", args: ["--prefix", "frontend", "run", "dev"] },
];

const reset = "\x1b[0m";
const children = new Set();
let shuttingDown = false;

function prefixStream(stream, service, output) {
  const rl = readline.createInterface({ input: stream });

  rl.on("line", (line) => {
    output.write(`${service.color}[${service.name}]${reset} ${line}\n`);
  });
}

function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`\nStopping dev servers (${signal})...`);

  for (const child of children) {
    stopProcess(child);
  }
}

for (const service of services) {
  const child = spawn(npmCommand, [...npmBaseArgs, ...service.args], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);
  prefixStream(child.stdout, service, process.stdout);
  prefixStream(child.stderr, service, process.stderr);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (!shuttingDown && code !== 0) {
      console.error(`${service.name} stopped unexpectedly (${signal ?? `code ${code}`}).`);
      shutdown(`${service.name} failed`);
      process.exitCode = code ?? 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
