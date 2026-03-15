import { assertEquals } from "@std/assert";
import { type IpadicFeatures } from "@patdx/kuromoji";
import {
  _decompressGzip,
  _replaceKanjiWithReading,
  initTokenizer,
  removeKanji,
} from "./kana.ts";

// ── _decompressGzip ──

Deno.test("_decompressGzip > roundtrip compress/decompress", async () => {
  const original = new TextEncoder().encode("hello world");
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(original);
  writer.close();
  const chunks: Uint8Array[] = [];
  for await (const chunk of cs.readable) {
    chunks.push(new Uint8Array(chunk));
  }
  const compressed = new Uint8Array(
    chunks.reduce((s, c) => s + c.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  const result = await _decompressGzip(compressed);
  assertEquals(new Uint8Array(result), original);
});

Deno.test("_decompressGzip > kuromoji dict file is loadable", async () => {
  const dictPath = new URL(
    "../../node_modules/@patdx/kuromoji/dict/base.dat.gz",
    import.meta.url,
  );
  const compressed = await Deno.readFile(dictPath);
  const buf = await _decompressGzip(compressed);
  // Uint32Array requires byte length to be a multiple of 4
  assertEquals(buf.byteLength % 4, 0);
});

// ── _replaceKanjiWithReading ──

function token(
  surface_form: string,
  reading?: string,
): IpadicFeatures {
  return { surface_form, reading } as IpadicFeatures;
}

Deno.test("_replaceKanjiWithReading > kanji with reading → hiragana", () => {
  const tokens = [token("東京", "トウキョウ")];
  assertEquals(_replaceKanjiWithReading(tokens), "とうきょう");
});

Deno.test("_replaceKanjiWithReading > hiragana unchanged", () => {
  const tokens = [token("です")];
  assertEquals(_replaceKanjiWithReading(tokens), "です");
});

Deno.test("_replaceKanjiWithReading > katakana unchanged", () => {
  const tokens = [token("カタカナ")];
  assertEquals(_replaceKanjiWithReading(tokens), "カタカナ");
});

Deno.test("_replaceKanjiWithReading > mixed sentence", () => {
  const tokens = [
    token("東京", "トウキョウ"),
    token("は"),
    token("晴れ", "ハレ"),
    token("です"),
  ];
  assertEquals(_replaceKanjiWithReading(tokens), "とうきょうははれです");
});

Deno.test("_replaceKanjiWithReading > kanji without reading → surface_form", () => {
  const tokens = [token("亜", undefined)];
  assertEquals(_replaceKanjiWithReading(tokens), "亜");
});

Deno.test("_replaceKanjiWithReading > ascii unchanged", () => {
  const tokens = [token("hello")];
  assertEquals(_replaceKanjiWithReading(tokens), "hello");
});

Deno.test("_replaceKanjiWithReading > empty tokens", () => {
  assertEquals(_replaceKanjiWithReading([]), "");
});

// ── initTokenizer + removeKanji (integration) ──

Deno.test("removeKanji > integration with real tokenizer", async () => {
  await initTokenizer();
  const result = removeKanji("東京は晴れです");
  assertEquals(result, "とうきょうははれです");
});
