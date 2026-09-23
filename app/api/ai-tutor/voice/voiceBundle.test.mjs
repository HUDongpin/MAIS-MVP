import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";
const routeFile = path.resolve(distDir, "server/app/api/ai-tutor/voice/route.js");

test("the compiled Nova voice route uses a working ws package for long realtime frames", { timeout: 10_000 }, async () => {
  assert.ok(existsSync(routeFile), `Build the app first; voice bundle missing: ${routeFile}`);
  const bundle = readFileSync(routeFile, "utf8");
  const externalWsModule = bundle.match(/(\d+):[a-zA-Z_$][\w$]*=>\{[a-zA-Z_$][\w$]*\.exports=(?:import|require)\("ws"\)\}/);
  assert.ok(externalWsModule, "compiled voice route must load ws externally");

  require(routeFile);
  const webpackRuntime = require(path.resolve(distDir, "server/webpack-runtime.js"));
  const loadedWebSocket = await webpackRuntime(Number(externalWsModule[1]));
  const routeWebSocket = loadedWebSocket?.default ?? loadedWebSocket;
  assert.equal(typeof routeWebSocket, "function", "compiled voice route must load ws externally");

  const { WebSocketServer } = require("ws");
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  try {
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    const payload = JSON.stringify({ type: "session.update", padding: "X".repeat(64) });
    const received = new Promise((resolve, reject) => {
      server.once("connection", (socket) => socket.once("message", (data) => resolve(data.toString())));
      server.once("error", reject);
    });
    const client = new routeWebSocket(`ws://127.0.0.1:${server.address().port}`);
    try {
      await new Promise((resolve, reject) => { client.once("open", resolve); client.once("error", reject); });
      client.send(payload);
      assert.equal(await received, payload);
    } finally {
      client.terminate();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
