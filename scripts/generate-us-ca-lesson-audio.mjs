#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons.ts";
import { lessonSlugForTopicId } from "../lib/lessonLinks.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "public/audio/lessons/us-ca-math");
const defaultBaseUrl = "https://dashscope.aliyuncs.com";
const defaultModel = "cosyvoice-v3-flash";
const defaultVoice = "longanyang";

function parseArgs(argv) {
  const options = {
    force: false,
    limit: Number.POSITIVE_INFINITY,
    slug: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--slug") {
      options.slug = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--limit") {
      options.limit = Number(argv[index + 1] ?? "");
      index += 1;
    }
  }

  return options;
}

function readOptionalEnv(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function stripDotEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

async function loadLocalEnv() {
  const filePath = path.join(projectRoot, ".env.local");
  let text = "";
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (!name || process.env[name]) continue;
    process.env[name] = stripDotEnvValue(rawValue ?? "");
  }
}

function cleanLessonAudioText(value) {
  return value
    .replace(/\$\$?/g, " ")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/g, "$1")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_[\]^]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function providerConfig() {
  const lessonBaseUrl = readOptionalEnv(process.env.LESSON_TTS_BASE_URL);
  const dashscopeBaseUrl = readOptionalEnv(process.env.DASHSCOPE_BASE_URL);
  const dashscopeOrigin = dashscopeBaseUrl
    ? new URL(dashscopeBaseUrl).origin
    : undefined;
  const baseUrl = lessonBaseUrl ?? dashscopeOrigin ?? defaultBaseUrl;

  return {
    apiKey: readOptionalEnv(process.env.DASHSCOPE_API_KEY) ?? readOptionalEnv(process.env.QWEN_API_KEY),
    apiUrl: `${baseUrl.replace(/\/$/, "")}/api/v1/services/audio/tts/SpeechSynthesizer`,
    model: readOptionalEnv(process.env.LESSON_TTS_MODEL) ?? defaultModel,
    voice: readOptionalEnv(process.env.LESSON_TTS_EN_VOICE) ?? readOptionalEnv(process.env.LESSON_TTS_VOICE) ?? defaultVoice
  };
}

function audioJobs(options) {
  return usCaliforniaLessonSeeds.flatMap((lesson) => {
    const slug = lessonSlugForTopicId(lesson.topicId);
    if (options.slug && options.slug !== slug && options.slug !== lesson.topicId) return [];

    return lesson.blocks
      .filter((block) => block.type === "concept" && block.content?.en)
      .map((block) => {
        const blockId = `${slug}-${block.idSuffix}`;
        return {
          blockId,
          outputPath: path.join(outputRoot, slug, `${blockId}.mp3`),
          slug,
          text: cleanLessonAudioText(block.content.en),
          title: block.title?.en ?? blockId
        };
      });
  });
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size > 0;
  } catch {
    return false;
  }
}

async function synthesizeAudio(job, config) {
  let synthesizeResponse;
  try {
    synthesizeResponse = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        input: {
          text: job.text,
          voice: config.voice,
          format: "mp3",
          language_hints: ["en"]
        }
      })
    });
  } catch (error) {
    const code = error?.cause?.code ?? error?.name ?? "unknown";
    throw new Error(`synthesis-transport-failed:${code}`);
  }

  if (!synthesizeResponse.ok) {
    throw new Error(`synthesis-failed:${synthesizeResponse.status}`);
  }

  const body = await synthesizeResponse.json();
  const audioUrl = body?.output?.audio?.url;
  if (typeof audioUrl !== "string" || !audioUrl) {
    throw new Error("synthesis-missing-audio-url");
  }

  let audioResponse;
  try {
    audioResponse = await fetch(audioUrl);
  } catch (error) {
    const code = error?.cause?.code ?? error?.name ?? "unknown";
    let host = "unknown-host";
    try {
      host = new URL(audioUrl).host;
    } catch {
      host = "invalid-audio-url";
    }
    throw new Error(`download-transport-failed:${host}:${code}`);
  }
  if (!audioResponse.ok) {
    throw new Error(`download-failed:${audioResponse.status}`);
  }

  const audio = Buffer.from(await audioResponse.arrayBuffer());
  if (!audio.byteLength) throw new Error("empty-audio");
  return audio;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadLocalEnv();
  const config = providerConfig();
  if (!config.apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY or QWEN_API_KEY in local environment.");
  }

  const limit = Number.isFinite(options.limit) ? options.limit : undefined;
  const jobs = audioJobs(options).slice(0, limit);
  let generated = 0;
  let skipped = 0;

  console.log(`US-CA lesson audio jobs: ${jobs.length}`);
  console.log(`Provider: aliyun-cosyvoice; model: ${config.model}; voice: ${config.voice}; credential: ${config.apiKey ? "present" : "missing"}`);

  for (const [index, job] of jobs.entries()) {
    if (!options.force && await fileExists(job.outputPath)) {
      skipped += 1;
      console.log(`[${index + 1}/${jobs.length}] skip ${job.slug}/${job.blockId}`);
      continue;
    }

    await fs.mkdir(path.dirname(job.outputPath), { recursive: true });
    const audio = await synthesizeAudio(job, config);
    await fs.writeFile(job.outputPath, audio);
    generated += 1;
    console.log(`[${index + 1}/${jobs.length}] wrote ${path.relative(projectRoot, job.outputPath)} (${audio.byteLength} bytes)`);
  }

  console.log(`Done. generated=${generated} skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
