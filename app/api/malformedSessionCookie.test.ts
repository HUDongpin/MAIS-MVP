import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { NextResponse } from "next/server";
import * as grades from "@/data/grades";
import * as curriculum from "@/lib/curriculumProfile";
import * as difficulty from "@/lib/difficulty";

function fixture() {
  const tokens: string[] = [];
  let accountReads = 0;
  const authenticated = { user: { id: "synthetic-student", role: "student", curriculumProfile: curriculum.defaultCurriculumProfile } };
  const auth: Record<string, (...args: any[]) => Promise<any>> = {};
  const load = (file: string, exports: object, require: (name: string) => unknown) => {
    runInNewContext(ts.transpileModule(readFileSync(path.join(process.cwd(), file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText, { exports, require, Request, Response, URL, process: { env: {} }, globalThis: {} });
  };
  load("lib/server/auth.ts", auth, (name) => {
    if (name === "node:crypto") return crypto;
    if (name === "@/lib/session") return {
      SESSION_COOKIE_NAME: "hk_math_session",
      verifySessionToken: async (token: string) => { tokens.push(token); return { sub: "synthetic-student", sr: 1 }; }
    };
    if (name === "@/lib/server/userStore/auth") return {
      getAuthenticatedUserForSession: async () => { accountReads += 1; return authenticated; }
    };
    throw new Error(name);
  });
  const route: Record<string, (request: Request) => Promise<Response>> = {};
  load("app/api/questions/route.ts", route, (name) => {
    if (name === "next/server") return { NextResponse };
    if (name === "@/data/grades") return grades;
    if (name === "@/lib/curriculumProfile") return curriculum;
    if (name === "@/lib/difficulty") return difficulty;
    if (name === "@/lib/session") return { SESSION_COOKIE_NAME: "hk_math_session" };
    if (name === "@/lib/server/auth") return auth;
    if (name === "@/lib/server/userStore") return { getStudentAccommodations: async () => ({ maxAnswerChoices: 0 }) };
    if (name === "@/lib/server/questionStore") return { getPublicQuestionsFromStore: async () => [] };
    throw new Error(name);
  });
  return { auth, route, tokens, get accountReads() { return accountReads; } };
}

test("malformed selected session cookies fail unauthenticated before token or account work", async () => {
  for (const token of ["%", "%ZZ", "%E0%A4%A"]) {
    const f = fixture();
    const request = new Request("http://localhost/api/questions", { headers: { cookie: `hk_math_session=${token}` } });
    assert.equal(await f.auth.requireAuthenticatedUser(request), null);
    assert.equal(await f.auth.requireAiTutorAuthenticatedUser(request, new AbortController().signal), null);
    assert.deepEqual(f.tokens, []);
    assert.equal(f.accountReads, 0);
  }
});

test("malformed selected question cookies retain anonymous preview without account work", async () => {
  for (const token of ["%", "%ZZ", "%E0%A4%A"]) {
    const f = fixture();
    const response = await f.route.GET(new Request("http://localhost/api/questions", { headers: { cookie: `hk_math_session=${token}` } }));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).questions, []);
    assert.deepEqual(f.tokens, []);
    assert.equal(f.accountReads, 0);
  }
});

test("malformed unrelated cookies do not block a valid encoded selected session", async () => {
  for (const prefix of ["other=%", "hk_math_session_other=%E0%A4%A"]) {
    const f = fixture();
    const request = new Request("http://localhost/api/questions", { headers: { cookie: `${prefix}; hk_math_session=synthetic%2Etoken` } });
    assert.equal((await f.auth.requireAuthenticatedUser(request)).user.id, "synthetic-student");
    assert.equal((await f.route.GET(request)).status, 200);
    assert.deepEqual(f.tokens, ["synthetic.token", "synthetic.token"]);
    assert.equal(f.accountReads, 2);
  }
});
