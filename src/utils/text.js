export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "custom-profile";
}

export function cleanToken(value) {
  return String(value)
    .toLowerCase()
    .replace(/^#+|[^a-z0-9_ -]/g, "")
    .trim();
}

export function titleCase(value) {
  return String(value)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

export function truncate(value, maxLength = 120) {
  const text = String(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function tokenize(value) {
  const stopwords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "but",
    "for",
    "from",
    "i",
    "in",
    "into",
    "is",
    "it",
    "like",
    "me",
    "my",
    "of",
    "on",
    "or",
    "page",
    "that",
    "the",
    "to",
    "tiktok",
    "vibe",
    "want",
    "with"
  ]);

  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopwords.has(token));
}
