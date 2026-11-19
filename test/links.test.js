import test from "node:test";
import assert from "node:assert/strict";
import { extractLinks } from "../lib/links.js";

test("extractLinks mengenali Mega, Drive, Telegram dan melewati Instagram", () => {
  const caption = "LINK:\nhttps://mega.nz/folder/8r4SnaJL#NDpK0QS7 (full)\nTG: https://t.me/+qPN7YuijU142NWM0.\nIG https://www.instagram.com/p/abc/\nulang https://mega.nz/folder/8r4SnaJL#NDpK0QS7";
  const links = extractLinks(caption);
  assert.deepEqual(links.map((l) => l.label), ["Mega", "Telegram"]);
  assert.equal(links[1].url, "https://t.me/+qPN7YuijU142NWM0");
});

test("extractLinks memakai nama host untuk situs lain dan membatasi jumlahnya", () => {
  const links = extractLinks("https://contoh.com/a https://www.lain.net/b", 1);
  assert.deepEqual(links, [{ url: "https://contoh.com/a", label: "contoh.com" }]);
  assert.deepEqual(extractLinks(null), []);
});
