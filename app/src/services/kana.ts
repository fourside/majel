import { type IpadicFeatures, TokenizerBuilder } from "@patdx/kuromoji";

const KANJI_RE = /[\u4E00-\u9FFF]/;

type Tokenizer = { tokenize(text: string): IpadicFeatures[] };

let tokenizer: Tokenizer | null = null;

/** gzip圧縮されたデータを解凍する */
export async function _decompressGzip(
  compressed: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const chunks: Uint8Array[] = [];
  for await (const chunk of ds.readable) {
    chunks.push(new Uint8Array(chunk));
  }
  const totalLength = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

/** 辞書をロードして Tokenizer を初期化（起動時に1回だけ呼ぶ） */
export async function initTokenizer(): Promise<void> {
  if (tokenizer) return;
  const dicDir = new URL(
    "../../node_modules/@patdx/kuromoji/dict/",
    import.meta.url,
  );
  tokenizer = await new TokenizerBuilder({
    loader: {
      async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
        const filePath = new URL(url, dicDir);
        const compressed = await Deno.readFile(filePath);
        return _decompressGzip(compressed);
      },
    },
  }).build();
  console.log("Kuromoji tokenizer ready");
}

function katakanaToHiragana(str: string): string {
  return str.replace(
    /[\u30A1-\u30F6]/g,
    (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

/**
 * 漢字を含むトークンを読み（ひらがな）に置換する。
 * カタカナ・ひらがな・英数字・記号はそのまま。
 */
export function _replaceKanjiWithReading(
  tokens: IpadicFeatures[],
): string {
  return tokens
    .map((t) => {
      if (KANJI_RE.test(t.surface_form) && t.reading) {
        return katakanaToHiragana(t.reading);
      }
      return t.surface_form;
    })
    .join("");
}

/** tokenizer を使って漢字をカタカナ読みに変換する */
export function removeKanji(text: string): string {
  if (!tokenizer) {
    console.warn("Tokenizer not initialized, returning original text");
    return text;
  }
  return _replaceKanjiWithReading(tokenizer.tokenize(text));
}
