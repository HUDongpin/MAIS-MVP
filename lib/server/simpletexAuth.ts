import { createHash, randomInt } from "node:crypto";

type SimpletexFieldValue = string | number | boolean;

export type SimpletexRequestFields = Record<string, SimpletexFieldValue>;

type SimpletexAuthOptions = {
  appId: string;
  appSecret: string;
  reqData: SimpletexRequestFields;
  randomStr?: string;
  timestampSeconds?: number;
};

function randomSimpletexString(length = 16) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function stringifySimpletexFieldValue(value: SimpletexFieldValue) {
  return String(value);
}

function compareSimpletexKeys(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function buildSimpletexAppSignSource({
  appId,
  appSecret,
  reqData,
  randomStr = randomSimpletexString(),
  timestampSeconds = Math.floor(Date.now() / 1000)
}: SimpletexAuthOptions) {
  const signedFields: SimpletexRequestFields = {
    ...reqData,
    "app-id": appId,
    "random-str": randomStr,
    timestamp: timestampSeconds
  };

  return [
    ...Object.entries(signedFields)
      .sort(([left], [right]) => compareSimpletexKeys(left, right))
      .map(([key, value]) => `${key}=${stringifySimpletexFieldValue(value)}`),
    `secret=${appSecret}`
  ].join("&");
}

export function buildSimpletexAppAuthHeaders(options: SimpletexAuthOptions) {
  const randomStr = options.randomStr ?? randomSimpletexString();
  const timestamp = String(options.timestampSeconds ?? Math.floor(Date.now() / 1000));
  const signSource = buildSimpletexAppSignSource({
    ...options,
    randomStr,
    timestampSeconds: Number(timestamp)
  });

  return {
    "app-id": options.appId,
    "random-str": randomStr,
    timestamp,
    sign: createHash("md5").update(signSource, "utf8").digest("hex")
  };
}
