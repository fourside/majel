import { encodeBase64 } from "jsr:@std/encoding/base64";

const RADIKO_AUTHKEY_VALUE =
  "bcd151073c03b352e1ef2fd66c32209da9ca0afa";

export type AuthResult = {
  authToken: string;
  areaId: string;
};

export async function authorize(): Promise<AuthResult> {
  // Authorize 1
  const auth1Response = await fetch("https://radiko.jp/v2/api/auth1", {
    headers: {
      "X-Radiko-App": "pc_html5",
      "X-Radiko-App-Version": "0.0.1",
      "X-Radiko-Device": "pc",
      "X-Radiko-User": "dummy_user",
    },
  });

  const authToken = auth1Response.headers.get("x-radiko-authtoken");
  const keyOffsetStr = auth1Response.headers.get("x-radiko-keyoffset");
  const keyLengthStr = auth1Response.headers.get("x-radiko-keylength");
  if (authToken === null || keyOffsetStr === null || keyLengthStr === null) {
    throw new Error("auth1 response is invalid");
  }
  const keyOffset = parseInt(keyOffsetStr, 10);
  const keyLength = parseInt(keyLengthStr, 10);
  if (Number.isNaN(keyOffset) || Number.isNaN(keyLength)) {
    throw new Error("keyOffset or keyLength is not a number");
  }

  const partialKey = encodeBase64(
    new TextEncoder().encode(
      RADIKO_AUTHKEY_VALUE.substring(keyOffset, keyOffset + keyLength),
    ),
  );

  // Authorize 2
  const auth2Response = await fetch("https://radiko.jp/v2/api/auth2", {
    headers: {
      "X-Radiko-Device": "pc",
      "X-Radiko-User": "dummy_user",
      "X-Radiko-AuthToken": authToken,
      "X-Radiko-PartialKey": partialKey,
    },
  });
  if (!auth2Response.ok) {
    throw new Error(`auth2 response is not ok: ${auth2Response.status}`);
  }

  const auth2Body = await auth2Response.text();
  const areaId = auth2Body.split(",")[0]?.trim();
  if (!areaId) {
    throw new Error("auth2 response does not contain area_id");
  }

  return { authToken, areaId };
}
