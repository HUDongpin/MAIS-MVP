import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

test("file-backed LangGraph saver survives process-style reopen", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const { AgentOpsFileSaver } = await import("./langgraph-saver");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-langgraph-"));
  const runId = "agentops-langgraph-test";
  const store = new AgentOpsRunStore(repoRoot, runId);
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });
  const saver = await AgentOpsFileSaver.open(store);
  const State = Annotation.Root({ count: Annotation<number>() });
  const graph = new StateGraph(State)
    .addNode("increment", (state) => ({ count: state.count + 1 }))
    .addEdge(START, "increment")
    .addEdge("increment", END)
    .compile({ checkpointer: saver });
  const config = { configurable: { thread_id: runId } };
  const result = await graph.invoke({ count: 0 }, config);
  assert.equal(result.count, 1);

  const reopened = await AgentOpsFileSaver.open(store);
  const tuple = await reopened.getTuple(config);
  assert.ok(tuple);
  assert.equal(tuple?.checkpoint.channel_values.count, 1);
  await assert.rejects(() => reopened.deleteThread(runId), /delete|v1|forbidden/i);
});

test("file-backed LangGraph saver rejects a tampered memory snapshot", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const { AgentOpsFileSaver } = await import("./langgraph-saver");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-langgraph-tamper-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-langgraph-tamper");
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });
  const saver = await AgentOpsFileSaver.open(store);
  await saver.putWrites(
    {
      configurable: {
        thread_id: store.runId,
        checkpoint_ns: "",
        checkpoint_id: "checkpoint-1",
      },
    },
    [["safe", { value: true }]],
    "task-1",
  );
  const snapshotPath = path.join(store.runDirectory, "langgraph-memory.json");
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as Record<string, unknown>;
  snapshot.snapshotDigest = "0".repeat(64);
  await writeFile(snapshotPath, `${JSON.stringify(snapshot)}\n`, "utf8");

  await assert.rejects(() => AgentOpsFileSaver.open(store), /digest|integrity|tamper/i);
});
