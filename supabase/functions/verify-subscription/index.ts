// Supabase Edge Function — StoreKit 2 aboneliğini sunucuda doğrular
//
// İstek:  POST { transactions: string[] }  (her biri Purchase.purchaseToken = işlem JWS'i)
//         Authorization: Bearer <kullanıcı JWT'si> (zorunlu)
// Yanıt:  200 { premium: boolean, expiresAt: string | null, verified: number }
//
// Dağıtım: supabase functions deploy verify-subscription --no-verify-jwt
// Önkoşul: supabase/migrations/20260925130000_subscriptions.sql

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyAppleTransactionJws } from "../_shared/appleJws.ts";

const BUNDLE_ID = "com.esdiyet.app";
// src/services/subscriptionService.js → PRODUCT_IDS ile aynı
const PRODUCT_IDS = new Set([
  "com.esdiyet.app.premium.monthly",
  "com.esdiyet.app.premium.quarterly",
  "com.esdiyet.app.premium.yearly",
]);
const MAX_TRANSACTIONS = 10;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "BAD_REQUEST" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "AUTH_SESSION_REQUIRED" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const list: string[] = Array.isArray(body?.transactions)
    ? body.transactions.filter((t: unknown) => typeof t === "string").slice(0, MAX_TRANSACTIONS)
    : [];

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let verified = 0;
  for (const jws of list) {
    try {
      const tx = await verifyAppleTransactionJws(jws);
      if (tx.bundleId !== BUNDLE_ID || !PRODUCT_IDS.has(tx.productId) || !tx.expiresDate) {
        console.warn("verify-subscription: uygun olmayan işlem", tx.bundleId, tx.productId);
        continue;
      }
      // appAccountToken (1.4.2+ satın almalar) başka bir hesabı gösteriyorsa kabul etme
      if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== user.id.toLowerCase()) {
        console.warn("verify-subscription: appAccountToken başka hesaba ait");
        continue;
      }
      const { error } = await admin.from("subscriptions").upsert({
        original_transaction_id: String(tx.originalTransactionId),
        user_id: user.id,
        product_id: tx.productId,
        expires_at: new Date(Number(tx.expiresDate)).toISOString(),
        revoked_at: tx.revocationDate ? new Date(Number(tx.revocationDate)).toISOString() : null,
        environment: String(tx.environment),
        updated_at: new Date().toISOString(),
      }, { onConflict: "original_transaction_id" });
      if (error) console.error("verify-subscription: upsert", error.message);
      else verified += 1;
    } catch (e) {
      console.warn("verify-subscription: JWS reddedildi", String((e as Error)?.message ?? e));
    }
  }

  const { data: rows } = await admin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);

  const expiresAt = rows?.[0]?.expires_at ?? null;
  return json({ premium: !!expiresAt, expiresAt, verified });
});
