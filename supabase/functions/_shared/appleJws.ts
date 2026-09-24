// StoreKit 2 imzalı işlem (JWS) doğrulayıcı — yalnızca WebCrypto, bağımlılıksız.
//
// Apple'ın App Store Server Library'sindeki SignedDataVerifier'ın (çevrimdışı mod) karşılığı:
//   1. JWS başlığı ES256 + x5c [yaprak, ara, kök]
//   2. Kök sertifika = Apple Root CA - G3 (SHA-256 parmak iziyle sabitlenmiş)
//   3. Ara sertifika kök tarafından, yaprak ara sertifika tarafından imzalı (ECDSA)
//   4. Apple'a özgü uzantı OID'leri: yaprak 1.2.840.113635.100.6.11.1, ara 1.2.840.113635.100.6.2.1
//   5. Sertifikalar işlemin signedDate anında geçerli
//   6. JWS imzası yaprak anahtarıyla doğru
// Deno (Edge Function) ve Node 20+ (test) aynı kodla çalışır.

// Apple Root CA - G3 — https://www.apple.com/certificateauthority/AppleRootCA-G3.cer (2039'a kadar geçerli)
export const APPLE_ROOT_CA_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";

export class JwsVerificationError extends Error {}

// ─── base64 ─────────────────────────────────────────────────────────────────
function b64ToBytes(b64: string): Uint8Array {
  const std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Minimal DER ────────────────────────────────────────────────────────────
type Tlv = { tag: number; start: number; valueStart: number; end: number };

function readTlv(buf: Uint8Array, offset: number): Tlv {
  const tag = buf[offset];
  let len = buf[offset + 1];
  let valueStart = offset + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new JwsVerificationError("DER: desteklenmeyen uzunluk");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[offset + 2 + i];
    valueStart += n;
  }
  const end = valueStart + len;
  if (end > buf.length) throw new JwsVerificationError("DER: taşma");
  return { tag, start: offset, valueStart, end };
}

function children(buf: Uint8Array, parent: Tlv): Tlv[] {
  const out: Tlv[] = [];
  let pos = parent.valueStart;
  while (pos < parent.end) {
    const t = readTlv(buf, pos);
    out.push(t);
    pos = t.end;
  }
  return out;
}

/** Nokta gösterimli OID → DER değer baytları (etiket/uzunluk hariç) */
export function encodeOid(oid: string): Uint8Array {
  const parts = oid.split(".").map(Number);
  const out = [parts[0] * 40 + parts[1]];
  for (const p of parts.slice(2)) {
    const stack = [p & 0x7f];
    let v = Math.floor(p / 128);
    while (v > 0) {
      stack.unshift((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    out.push(...stack);
  }
  return new Uint8Array(out);
}

function bytesEqual(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function containsOid(der: Uint8Array, oid: string) {
  const needle = encodeOid(oid);
  const full = new Uint8Array([0x06, needle.length, ...needle]);
  outer: for (let i = 0; i <= der.length - full.length; i++) {
    for (let j = 0; j < full.length; j++) if (der[i + j] !== full[j]) continue outer;
    return true;
  }
  return false;
}

const OID = {
  P256: encodeOid("1.2.840.10045.3.1.7"),
  P384: encodeOid("1.3.132.0.34"),
  ECDSA_SHA256: encodeOid("1.2.840.10045.4.3.2"),
  ECDSA_SHA384: encodeOid("1.2.840.10045.4.3.3"),
};
const APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1";
const APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

type ParsedCert = {
  der: Uint8Array;
  tbs: Uint8Array;
  sigHash: "SHA-256" | "SHA-384";
  sigDer: Uint8Array;
  spki: Uint8Array;
  curve: "P-256" | "P-384";
  notBefore: number;
  notAfter: number;
};

function parseTime(buf: Uint8Array, t: Tlv) {
  const s = new TextDecoder().decode(buf.slice(t.valueStart, t.end));
  const m = t.tag === 0x17
    ? s.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/)
    : s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) throw new JwsVerificationError("DER: geçersiz zaman");
  let year = Number(m[1]);
  if (t.tag === 0x17) year += year < 50 ? 2000 : 1900;
  return Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
}

function parseCert(der: Uint8Array): ParsedCert {
  const root = readTlv(der, 0);
  const [tbsT, algT, sigT] = children(der, root);
  const tbsParts = children(der, tbsT);
  let i = tbsParts[0].tag === 0xa0 ? 1 : 0; // [0] version
  i += 1; // serialNumber
  i += 1; // signature AlgorithmIdentifier
  i += 1; // issuer
  const validity = children(der, tbsParts[i++]);
  i += 1; // subject
  const spkiT = tbsParts[i];

  const algOid = children(der, algT)[0];
  const algBytes = der.slice(algOid.valueStart, algOid.end);
  const sigHash = bytesEqual(algBytes, OID.ECDSA_SHA256) ? "SHA-256"
    : bytesEqual(algBytes, OID.ECDSA_SHA384) ? "SHA-384" : null;
  if (!sigHash) throw new JwsVerificationError("sertifika: desteklenmeyen imza algoritması");

  const spkiAlg = children(der, children(der, spkiT)[0]);
  const curveBytes = der.slice(spkiAlg[1].valueStart, spkiAlg[1].end);
  const curve = bytesEqual(curveBytes, OID.P256) ? "P-256" : bytesEqual(curveBytes, OID.P384) ? "P-384" : null;
  if (!curve) throw new JwsVerificationError("sertifika: desteklenmeyen eğri");

  return {
    der,
    tbs: der.slice(tbsT.start, tbsT.end),
    sigHash,
    sigDer: der.slice(sigT.valueStart + 1, sigT.end), // BIT STRING: ilk bayt = kullanılmayan bit sayısı
    spki: der.slice(spkiT.start, spkiT.end),
    curve,
    notBefore: parseTime(der, validity[0]),
    notAfter: parseTime(der, validity[1]),
  };
}

/** DER ECDSA-Sig-Value → WebCrypto'nun beklediği ham r||s */
function derSigToRaw(sig: Uint8Array, size: number) {
  const seq = readTlv(sig, 0);
  const [r, s] = children(sig, seq);
  const fix = (t: Tlv) => {
    let v = sig.slice(t.valueStart, t.end);
    while (v.length > size && v[0] === 0) v = v.slice(1);
    if (v.length > size) throw new JwsVerificationError("imza: geçersiz tamsayı");
    const out = new Uint8Array(size);
    out.set(v, size - v.length);
    return out;
  };
  const raw = new Uint8Array(size * 2);
  raw.set(fix(r), 0);
  raw.set(fix(s), size);
  return raw;
}

async function importKey(cert: ParsedCert) {
  return crypto.subtle.importKey("spki", cert.spki, { name: "ECDSA", namedCurve: cert.curve }, false, ["verify"]);
}

async function verifySignedBy(child: ParsedCert, issuer: ParsedCert) {
  const key = await importKey(issuer);
  const raw = derSigToRaw(child.sigDer, issuer.curve === "P-256" ? 32 : 48);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: child.sigHash }, key, raw, child.tbs);
  if (!ok) throw new JwsVerificationError("sertifika zinciri: imza geçersiz");
}

export type AppleTransaction = {
  bundleId: string;
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  appAccountToken?: string;
  expiresDate?: number;
  revocationDate?: number;
  signedDate: number;
  environment: "Production" | "Sandbox" | string;
  [k: string]: unknown;
};

/**
 * JWS'i doğrular ve işlem yükünü döner; geçersizse JwsVerificationError fırlatır.
 * `rootFingerprints` yalnızca testte değiştirilir.
 */
export async function verifyAppleTransactionJws(
  jws: string,
  { rootFingerprints = [APPLE_ROOT_CA_G3_SHA256] }: { rootFingerprints?: string[] } = {},
): Promise<AppleTransaction> {
  const parts = String(jws || "").split(".");
  if (parts.length !== 3) throw new JwsVerificationError("JWS biçimi geçersiz");
  const [h, p, s] = parts;

  let header: { alg?: string; x5c?: string[] };
  let payload: AppleTransaction;
  try {
    header = JSON.parse(new TextDecoder().decode(b64ToBytes(h)));
    payload = JSON.parse(new TextDecoder().decode(b64ToBytes(p)));
  } catch {
    throw new JwsVerificationError("JWS JSON değil");
  }
  if (header.alg !== "ES256") throw new JwsVerificationError("JWS alg ES256 değil");
  if (!Array.isArray(header.x5c) || header.x5c.length !== 3) throw new JwsVerificationError("x5c zinciri 3 sertifika olmalı");

  const [leaf, intermediate, root] = header.x5c.map((c) => parseCert(b64ToBytes(c)));

  const rootFp = toHex(await crypto.subtle.digest("SHA-256", root.der));
  if (!rootFingerprints.includes(rootFp)) throw new JwsVerificationError("kök sertifika Apple Root CA G3 değil");
  if (!containsOid(leaf.der, APPLE_LEAF_OID)) throw new JwsVerificationError("yaprak sertifikada Apple OID yok");
  if (!containsOid(intermediate.der, APPLE_INTERMEDIATE_OID)) throw new JwsVerificationError("ara sertifikada Apple OID yok");

  const at = Number(payload.signedDate) || Date.now();
  for (const c of [leaf, intermediate, root]) {
    if (at < c.notBefore || at > c.notAfter) throw new JwsVerificationError("sertifika signedDate anında geçerli değil");
  }

  await verifySignedBy(intermediate, root);
  await verifySignedBy(leaf, intermediate);

  const leafKey = await importKey(leaf);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    leafKey,
    b64ToBytes(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!ok) throw new JwsVerificationError("JWS imzası geçersiz");
  return payload;
}

// Yalnızca test: gerçek Apple sertifikalarıyla ayrıştırıcı/zincir doğrulaması
export const __test = { parseCert, verifySignedBy };
