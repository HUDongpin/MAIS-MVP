import assert from "node:assert/strict";
import test from "node:test";
import { mayUseUnverifiedBrowserRecognition, permittedBrowserSpeechVoice } from "./browserSpeechPolicy";
import { speakPracticeText } from "./practiceReadAloud";

test("US and unresolved regions cannot start an unidentified browser speech service", () => {
  assert.equal(mayUseUnverifiedBrowserRecognition("US"), false);
  assert.equal(mayUseUnverifiedBrowserRecognition(null), false);
  assert.equal(mayUseUnverifiedBrowserRecognition("HK"), true);
  assert.equal(mayUseUnverifiedBrowserRecognition("MAINLAND"), true);
});

test("restricted read-aloud selects an explicit local voice and cannot fall back to a remote default", () => {
  const remote = { name: "Remote", lang: "en-US", localService: false };
  const local = { name: "Local", lang: "en-GB", localService: true };
  assert.equal(permittedBrowserSpeechVoice("US", [remote, local], "en-US"), local);
  assert.equal(permittedBrowserSpeechVoice(null, [remote], "en-US"), null);
  assert.equal(permittedBrowserSpeechVoice("US", [], "en-US"), null);
  assert.equal(permittedBrowserSpeechVoice("US", [local], "zh-CN"), null);
  assert.equal(permittedBrowserSpeechVoice("HK", [remote], "en-US"), undefined);
});

test("the practice and guided-tour speaker never calls synthesis with a remote or default US voice", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldUtterance = Object.getOwnPropertyDescriptor(globalThis, "SpeechSynthesisUtterance");
  const spoken: Array<{ voice?: unknown }> = [];
  const remote = { name: "Remote", lang: "en-US", localService: false };
  const local = { name: "Local", lang: "en-GB", localService: true };
  let voices = [remote];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { speechSynthesis: {
    cancel() {}, getVoices: () => voices, speak: (utterance: { voice?: unknown }) => spoken.push(utterance)
  } } });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable: true, value: class {
    constructor(public text: string) {}
  } });
  try {
    assert.equal(speakPracticeText("Read the problem", "en-US", { region: "US" }), false);
    assert.equal(speakPracticeText("Read the problem", "en-US"), false, "missing context is restrictive");
    assert.equal(spoken.length, 0);
    voices = [remote, local];
    assert.equal(speakPracticeText("Read the problem", "en-US", { region: "US" }), true);
    assert.equal(spoken[0].voice, local);
    assert.equal(speakPracticeText("Read the problem", "en-US", { region: "HK" }), true);
    assert.equal(spoken[1].voice, remote);
    assert.equal(speakPracticeText("Read the problem", "en-US", { region: "MAINLAND" }), true);
    assert.equal(spoken[2].voice, remote);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldUtterance) Object.defineProperty(globalThis, "SpeechSynthesisUtterance", oldUtterance); else Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
  }
});
