import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSimpletexAppAuthHeaders,
  buildSimpletexAppSignSource
} from "./simpletexAuth";

test("SimpleTex APP auth matches the official published signing example", () => {
  const headers = buildSimpletexAppAuthHeaders({
    appId: "19X4f10YM1Va894nvFl89ikY",
    appSecret: "fu4Wfmna4153DFN12ctBsPqgVI3vvGGK",
    reqData: { use_batch: "True" },
    randomStr: "mSkYSY28N4WkvidB",
    timestampSeconds: 1675550577
  });

  assert.deepEqual(headers, {
    "app-id": "19X4f10YM1Va894nvFl89ikY",
    "random-str": "mSkYSY28N4WkvidB",
    timestamp: "1675550577",
    sign: "5f271e1deccd95d467c7dd430ca2c8b1"
  });
});

test("SimpleTex APP auth sorts request data and auth header fields together", () => {
  const signSource = buildSimpletexAppSignSource({
    appId: "app123",
    appSecret: "secret123",
    reqData: { rec_mode: "formula" },
    randomStr: "abcdefghijklmnop",
    timestampSeconds: 1700000000
  });

  assert.equal(
    signSource,
    "app-id=app123&random-str=abcdefghijklmnop&rec_mode=formula&timestamp=1700000000&secret=secret123"
  );
});
