import nextConfig, { readOnlyConfigMode } from "../next.config.ts";

if (readOnlyConfigMode !== true || typeof nextConfig !== "function") {
  throw new Error("NEXT_CONFIG_READ_ONLY_IMPORT_AUTHORITY_INVALID");
}

const validatedReadOnlyConfig = nextConfig("mais-next-config-read-only-import");
if (
  !validatedReadOnlyConfig
  || typeof validatedReadOnlyConfig !== "object"
  || Array.isArray(validatedReadOnlyConfig)
) {
  throw new Error("NEXT_CONFIG_READ_ONLY_IMPORT_RESULT_INVALID");
}

export default validatedReadOnlyConfig;
