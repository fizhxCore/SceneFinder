import test from "node:test";
import assert from "node:assert/strict";
import { prettyTitle } from "../lib/browse.js";
import { extractHashtags } from "../lib/instagram.js";

test("prettyTitle mengubah huruf kapital semua jadi Title Case", () => {
  assert.equal(prettyTitle("KHEMJIRA FOREVER SCENEPACKS\nx"), "Khemjira Forever Scenepacks");
  assert.equal(prettyTitle("Already Fine"), "Already Fine");
});

test("extractHashtags mengabaikan # di dalam URL", () => {
  assert.deepEqual(extractHashtags("pack #kdrama https://mega.nz/folder/abc#qnppw7n75 end"), ["kdrama"]);
});
