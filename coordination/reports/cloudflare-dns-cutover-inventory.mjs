#!/usr/bin/env node

import {
  resolve4,
  resolve6,
  resolveCaa,
  resolveCname,
  resolveMx,
  resolveNs,
  resolveSoa,
  resolveTxt
} from "node:dns/promises";

const domain = "mais.hk";
const wildcardProbe = `nonexistent-s22-${Date.now()}.${domain}`;
const hostnamesToReview = [
  domain,
  `www.${domain}`,
  `api.${domain}`,
  `app.${domain}`,
  `mail.${domain}`,
  `smtp.${domain}`,
  `_dmarc.${domain}`,
  `_vercel.${domain}`,
  `_acme-challenge.${domain}`,
  wildcardProbe
];

function relativeName(hostname) {
  if (hostname === domain) return "@";
  if (hostname.endsWith(`.${domain}`)) return hostname.slice(0, -1 * (`.${domain}`.length));
  return hostname;
}

async function tryResolve(label, resolver) {
  try {
    const records = await resolver();
    return {
      ok: true,
      records: Array.isArray(records) ? records : [records]
    };
  } catch (error) {
    return {
      ok: false,
      records: [],
      code: error?.code ?? null,
      message: error instanceof Error ? error.message : String(error),
      label
    };
  }
}

async function inspectHostname(hostname) {
  const [a, aaaa, cname, mx, txt, caa] = await Promise.all([
    tryResolve("A", () => resolve4(hostname, { ttl: true })),
    tryResolve("AAAA", () => resolve6(hostname, { ttl: true })),
    tryResolve("CNAME", () => resolveCname(hostname)),
    tryResolve("MX", () => resolveMx(hostname)),
    tryResolve("TXT", () => resolveTxt(hostname)),
    tryResolve("CAA", () => resolveCaa(hostname))
  ]);

  return {
    hostname,
    name: relativeName(hostname),
    records: {
      A: a.records,
      AAAA: aaaa.records,
      CNAME: cname.records,
      MX: mx.records,
      TXT: txt.records,
      CAA: caa.records
    },
    emptyTypes: Object.entries({ A: a, AAAA: aaaa, CNAME: cname, MX: mx, TXT: txt, CAA: caa })
      .filter(([, result]) => result.records.length === 0)
      .map(([type]) => type)
  };
}

function toZoneFileRecord({ name, type, value, ttl = 300 }) {
  if (type === "CAA") {
    return `${name} ${ttl} IN CAA ${value.critical} ${value.tag} "${value.value}"`;
  }
  if (type === "MX") {
    return `${name} ${ttl} IN MX ${value.priority} ${value.exchange}.`;
  }
  if (type === "TXT") {
    return `${name} ${ttl} IN TXT "${value.join("")}"`;
  }
  return `${name} ${ttl} IN ${type} ${value}`;
}

function aRecordSuggestions(hostInspection, purpose, importPriority) {
  return hostInspection.records.A.map((record) => ({
    name: hostInspection.name,
    type: "A",
    value: record.address,
    ttl: record.ttl,
    purpose,
    importPriority,
    proxyRecommendation: importPriority === "required-web-cutover" ? "Proxied after validation" : "DNS Only until reviewed"
  }));
}

function caaRecordSuggestions(hostInspection) {
  return hostInspection.records.CAA.map((record) => ({
    name: hostInspection.name,
    type: "CAA",
    value: {
      critical: record.critical,
      tag: record.tag ?? (record.issue ? "issue" : record.iodef ? "iodef" : "unknown"),
      value: record.value ?? record.issue ?? record.iodef ?? ""
    },
    ttl: 300,
    purpose: "Preserve certificate authority policy",
    importPriority: "required-policy-preservation",
    proxyRecommendation: "DNS Only"
  }));
}

const [ns, soa, ...hostnameInspections] = await Promise.all([
  tryResolve("NS", () => resolveNs(domain)),
  tryResolve("SOA", () => resolveSoa(domain)),
  ...hostnamesToReview.map((hostname) => inspectHostname(hostname))
]);

const byHostname = new Map(hostnameInspections.map((inspection) => [inspection.hostname, inspection]));
const apex = byHostname.get(domain);
const www = byHostname.get(`www.${domain}`);
const wildcard = byHostname.get(wildcardProbe);
const wildcardDetected = wildcard.records.A.length > 0 || wildcard.records.AAAA.length > 0 || wildcard.records.CNAME.length > 0;

const requiredRecords = [
  ...aRecordSuggestions(apex, "Apex web traffic currently served by Vercel DNS", "required-web-cutover"),
  ...aRecordSuggestions(www, "Primary www web traffic currently served by Vercel DNS", "required-web-cutover"),
  ...caaRecordSuggestions(apex)
];

const reviewRecords = [];
if (wildcardDetected) {
  for (const record of wildcard.records.A) {
    reviewRecords.push({
      name: "*",
      type: "A",
      value: record.address,
      ttl: record.ttl,
      purpose: "Current Vercel DNS wildcard behavior; decide whether unknown subdomains should continue resolving",
      importPriority: "review-before-import",
      proxyRecommendation: "DNS Only until S22/S12 review"
    });
  }
}

for (const hostname of [`api.${domain}`, `app.${domain}`, `mail.${domain}`, `smtp.${domain}`]) {
  const inspection = byHostname.get(hostname);
  const wildcardLike =
    wildcardDetected &&
    inspection.records.A.length === wildcard.records.A.length &&
    inspection.records.A.every((record) => wildcard.records.A.some((wild) => wild.address === record.address));

  reviewRecords.push({
    hostname,
    name: inspection.name,
    recordTypesWithAnswers: Object.entries(inspection.records)
      .filter(([, records]) => records.length > 0)
      .map(([type]) => type),
    inferredFromWildcard: wildcardLike,
    note: wildcardLike
      ? "Matches the detected wildcard A behavior; do not assume this is an intentionally configured service."
      : "Has public DNS answers that need owner/S12 review before Cloudflare import."
  });
}

for (const hostname of [`_dmarc.${domain}`, `_vercel.${domain}`, `_acme-challenge.${domain}`]) {
  const inspection = byHostname.get(hostname);
  const hasOnlyARecords =
    inspection.records.A.length > 0 &&
    Object.entries(inspection.records).every(([type, records]) => type === "A" || records.length === 0);

  reviewRecords.push({
    hostname,
    name: inspection.name,
    recordTypesWithAnswers: Object.entries(inspection.records)
      .filter(([, records]) => records.length > 0)
      .map(([type]) => type),
    inferredFromWildcard: hasOnlyARecords,
    note: hasOnlyARecords
      ? "Only wildcard-like A records answered; no TXT record was visible. Do not import this as a verification/mail record without dashboard confirmation."
      : "Verification or policy hostname has public DNS answers that need dashboard review."
  });
}

const zoneFilePreview = [
  `$ORIGIN ${domain}.`,
  "; Required web/policy records to review before Cloudflare import.",
  ...requiredRecords.map(toZoneFileRecord),
  "",
  "; Optional wildcard continuity records. Review before importing.",
  ...reviewRecords
    .filter((record) => record.type === "A")
    .map(toZoneFileRecord)
];

const result = {
  checkedAt: new Date().toISOString(),
  responsibleSession: "S22 production reliability",
  target: {
    domain,
    currentNameservers: ns.records,
    soa: soa.records[0] ?? null
  },
  publicDnsInspections: hostnameInspections,
  wildcardProbe: {
    hostname: wildcardProbe,
    detected: wildcardDetected,
    records: wildcard.records
  },
  cloudflareCutoverCandidates: {
    requiredRecords,
    reviewRecords,
    notes: [
      "Public DNS is not a complete zone export. Confirm records in the Vercel domain dashboard before changing registrar nameservers.",
      "Cloudflare full setup will replace Vercel nameservers with Cloudflare nameservers; do not import current NS/SOA records.",
      "Proxy only web hostnames needed for AI Crawl Control, initially apex and www. Keep verification/email-style records DNS Only."
    ]
  },
  zoneFilePreview
};

console.log(JSON.stringify(result, null, 2));
