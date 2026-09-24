// Supabase Edge Function — kullanıcı hesabını tamamen siler (Apple 5.1.1(v))
// Dağıtım: supabase functions deploy delete-account --no-verify-jwt
// (JWT doğrulaması kod içinde yapılıyor)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Kullanıcı verisi tutan tablolar (supabase/sql/delete_own_account.sql ile aynı liste)
const USER_TABLES = ["diet_plans", "weight_records", "body_info", "goals", "food_logs", "user_credits"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Önce kullanıcıya bağlı satırlar: bazı FK'lar (ör. dashboard'dan açılan food_logs)
    // CASCADE olmayabilir → deleteUser "violates foreign key" ile düşerdi.
    // Tablo bu projede yoksa (42P01) atla.
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", user.id);
      if (error && error.code !== "42P01") {
        console.error(`delete-account: ${table} temizlenemedi`, error.message);
      }
    }
    await admin.from("ai_usage").delete().eq("subject", `user:${user.id}`);

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
