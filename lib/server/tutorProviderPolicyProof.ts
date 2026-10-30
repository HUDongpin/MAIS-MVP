import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { normalizeProviderVoiceText, type ProviderPolicyRegion } from "@/lib/aiProviderCompanyPolicy";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const key = () => process.env.AUTH_SESSION_SECRET?.trim();

// This signs a server decision about one reply; it grants no provider or
// authentication authority. The current authenticated actor is checked again.
export function createTutorProviderPolicyProof(userId: string, reply: string, region: ProviderPolicyRegion): string | undefined {
  const secret = key();
  if (!secret || secret.length < 16 || !userId) return undefined;
  const payload = Buffer.from(JSON.stringify({ v: 1, user: digest(userId), text: digest(normalizeProviderVoiceText(reply)), region })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyTutorProviderPolicyProof(userId: string, text: string, proof: unknown): ProviderPolicyRegion | undefined {
  const secret = key();
  if (!secret || secret.length < 16 || typeof proof !== "string" || proof.length > 1024) return undefined;
  const match = proof.match(/^([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/);
  if (!match) return undefined;
  const expected = createHmac("sha256", secret).update(match[1]).digest();
  if (!timingSafeEqual(expected, Buffer.from(match[2], "hex"))) return undefined;
  try {
    const value = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
    if (!value || Object.keys(value).sort().join(",") !== "region,text,user,v" || value.v !== 1 ||
      value.user !== digest(userId) || value.text !== digest(normalizeProviderVoiceText(text)) ||
      !["US", "HK", "MAINLAND", null].includes(value.region)) return undefined;
    return value.region;
  } catch { return undefined; }
}
