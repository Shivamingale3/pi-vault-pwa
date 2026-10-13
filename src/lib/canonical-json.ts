// src/lib/canonical-json.ts
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map(canonicalize);

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source).sort()) {
    result[key] = canonicalize(source[key]);
  }

  return result;
}
