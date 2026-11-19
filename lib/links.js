// Ambil link unduhan dari caption (Mega, Drive, Telegram, dll). Link Instagram dilewati.
const LABELS = [
  ["mega.nz", "Mega"],
  ["mega.io", "Mega"],
  ["drive.google.com", "Google Drive"],
  ["docs.google.com", "Google Docs"],
  ["t.me", "Telegram"],
  ["telegram.me", "Telegram"],
  ["mediafire.com", "MediaFire"],
  ["pixeldrain.com", "Pixeldrain"],
  ["dropbox.com", "Dropbox"],
];

export function extractLinks(text, max = 4) {
  const out = new Map();
  for (const raw of String(text || "").match(/https?:\/\/[^\s]+/g) || []) {
    const url = raw.replace(/[)\].,;!?'"]+$/, "");
    let host;
    try {
      host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    if (host === "instagram.com" || host.endsWith(".instagram.com")) continue;
    if (out.has(url)) continue;
    const hit = LABELS.find(([h]) => host === h || host.endsWith(`.${h}`));
    out.set(url, { url, label: hit ? hit[1] : host });
  }
  return [...out.values()].slice(0, max);
}
