import { randomBytes } from "crypto";

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || "note";
}

export function shareToken() {
  return randomBytes(18).toString("base64url");
}
