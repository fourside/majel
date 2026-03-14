import { type IpadicFeatures, TokenizerBuilder } from "@patdx/kuromoji";

const KANJI_RE = /[\u4E00-\u9FFF]/;

let tokenizer: { tokenize(text: string): IpadicFeatures[] } | null = null;

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
        const data = await Deno.readFile(filePath);
        return data.buffer;
      },
    },
  }).build();
  console.log("Kuromoji tokenizer ready");
}

/** 漢字を含むトークンを読み（カタカナ）に置換する。カタカナ・ひらがな・英数字・記号はそのまま。 */
export function removeKanji(text: string): string {
  if (!tokenizer) {
    console.warn("Tokenizer not initialized, returning original text");
    return text;
  }
  const tokens = tokenizer.tokenize(text);
  return tokens
    .map((t) => {
      if (KANJI_RE.test(t.surface_form) && t.reading) {
        return t.reading;
      }
      return t.surface_form;
    })
    .join("");
}
