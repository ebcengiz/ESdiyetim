import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppError, ERROR_CODES, isUniqueViolation, isMissingConflictTarget, isMissingRpc } from "./errors";
import { toDateString } from "../utils/date";

// Supabase yapılandırması
// Değerler .env dosyasından okunur (bkz. EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase yapılandırması eksik: .env dosyasında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı olmalı."
  );
}

// Supabase client oluştur
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Veritabanı işlemleri için yardımcı fonksiyonlar

/**
 * RLS için zorunlu oturum kontrolü — her servis metodunun başında çağrılır.
 * Oturum yoksa kullanıcı dostu AppError (AUTH_SESSION_REQUIRED) fırlatır.
 */
async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AppError(ERROR_CODES.AUTH_SESSION_REQUIRED, { detail: "supabase.auth.getUser() → null" });
  return user;
}

// Diyet programı işlemleri
export const dietPlanService = {
  // Tüm diyet planlarını getir (sadece kullanıcının kendi kayıtları)
  async getAll() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Belirli bir tarihe göre diyet planını getir
  async getByDate(date) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const countFilledMeals = (plan) =>
      [
        plan?.breakfast,
        plan?.lunch,
        plan?.dinner,
        plan?.morning_snack,
        plan?.afternoon_snack,
        plan?.evening_snack,
      ].filter((m) => typeof m === "string" && m.trim().length > 0).length;

    // Aynı gün birden fazla kayıt varsa en dolu planı tercih et.
    const sorted = [...data].sort((a, b) => countFilledMeals(b) - countFilledMeals(a));
    return sorted[0] || null;
  },

  // Yeni diyet planı ekle
  async create(dietPlan) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("diet_plans")
      .upsert([{ ...dietPlan, user_id: user.id }], {
        onConflict: "user_id,date",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Diyet planını güncelle
  async update(id, dietPlan) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("diet_plans")
      .update(dietPlan)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Diyet planını sil
  async delete(id) {
    const user = await requireUser();

    const { error } = await supabase
      .from("diet_plans")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },
};

// Kilo takip işlemleri
export const weightService = {
  // Tüm kilo kayıtlarını getir (sadece kullanıcının kendi kayıtları)
  async getAll() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Son 30 günün kilo kayıtlarını getir
  async getLastMonth() {
    const user = await requireUser();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", toDateString(thirtyDaysAgo))
      .order("date", { ascending: true });

    if (error) throw error;
    return data;
  },

  // Yeni kilo kaydı ekle
  async create(weightRecord) {
    const user = await requireUser();

    let data = null;
    let error = null;

    // Öncelik: aynı gün için create yerine update (upsert)
    const upsertRes = await supabase
      .from("weight_records")
      .upsert([{ ...weightRecord, user_id: user.id }], {
        onConflict: "user_id,date",
      })
      .select()
      .single();

    data = upsertRes.data;
    error = upsertRes.error;

    // Eski şemalarda onConflict (user_id,date) yoksa insert fallback
    if (error && isMissingConflictTarget(error)) {
      const insertRes = await supabase
        .from("weight_records")
        .insert([{ ...weightRecord, user_id: user.id }])
        .select()
        .single();
      data = insertRes.data;
      error = insertRes.error;
    }

    if (error) {
      // Duplicate key hatası için özel mesaj
      if (isUniqueViolation(error)) {
        throw new AppError(ERROR_CODES.DB_DUPLICATE_DATE, {
          userMessage: 'Bu tarih için zaten bir kilo kaydı bulunuyor. Farklı bir tarih seçin veya mevcut kaydı düzenleyin.',
          detail: `weight_records upsert: ${error.code} ${error.message}`,
          cause: error,
        });
      }
      throw error;
    }
    return data;
  },

  // Kilo kaydını güncelle
  async update(id, weightRecord) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("weight_records")
      .update(weightRecord)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Kilo kaydını sil
  async delete(id) {
    const user = await requireUser();

    const { error } = await supabase
      .from("weight_records")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },

  // En son kilo kaydını getir
  async getLatest() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },
};

// Sağlık tavsiyeleri işlemleri
export const tipsService = {
  // Tüm tavsiyeleri getir
  async getAll() {
    const { data, error } = await supabase
      .from("health_tips")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Rastgele bir tavsiye getir
  async getRandom() {
    const { data, error } = await supabase.from("health_tips").select("*");

    if (error) throw error;
    if (data && data.length > 0) {
      return data[Math.floor(Math.random() * data.length)];
    }
    return null;
  },
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Ana sayfa özet işlemleri
export const homeSummaryService = {
  // Bugünkü özet KPI verilerini getir
  async getDailySummary(date = getLocalDateString(new Date())) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        latest_weight: null,
        meals_planned_count: 0,
        active_goals_count: 0,
        completed_goals_count: 0,
      };
    }

    // Öncelik: RPC ile tek round-trip.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_home_daily_summary",
      { p_date: date }
    );

    if (!rpcError && rpcData) {
      return Array.isArray(rpcData) ? rpcData[0] || null : rpcData;
    }

    // Fallback: RPC yoksa uygulama çalışmaya devam etsin.
    const [{ data: latestWeight }, { data: dietPlan }, { data: goals }] =
      await Promise.all([
        supabase
          .from("weight_records")
          .select("weight")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("diet_plans")
          .select("breakfast,lunch,dinner")
          .eq("user_id", user.id)
          .eq("date", date)
          .single(),
        supabase
          .from("goals")
          .select("status")
          .eq("user_id", user.id),
      ]);

    const mealsPlannedCount = [dietPlan?.breakfast, dietPlan?.lunch, dietPlan?.dinner]
      .filter((meal) => typeof meal === "string" && meal.trim().length > 0).length;

    const activeGoalsCount = (goals || []).filter((g) => g.status === "active").length;
    const completedGoalsCount = (goals || []).filter((g) => g.status === "completed").length;

    return {
      latest_weight: latestWeight?.weight ?? null,
      meals_planned_count: mealsPlannedCount,
      active_goals_count: activeGoalsCount,
      completed_goals_count: completedGoalsCount,
    };
  },
};

// Vücut bilgileri işlemleri
export const bodyInfoService = {
  // En son vücut bilgisini getir (sadece kullanıcının kendi kaydı)
  async getLatest() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("body_info")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Tüm vücut bilgilerini getir (sadece kullanıcının kendi kayıtları)
  async getAll() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("body_info")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Yeni vücut bilgisi ekle
  async create(bodyInfo) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("body_info")
      .insert([{ ...bodyInfo, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Vücut bilgisini güncelle
  async update(id, bodyInfo) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("body_info")
      .update(bodyInfo)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Sadece kilo alanını güncelle (kilo takibinden otomatik senkronizasyon)
  async syncWeight(weight) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: latest } = await supabase
        .from('body_info')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        await supabase
          .from('body_info')
          .update({ weight })
          .eq('id', latest.id)
          .eq('user_id', user.id);
      }
    } catch (_) {
      // Sessiz hata — kilo takibi bloklamamalı
    }
  },

  // Vücut bilgisini sil
  async delete(id) {
    const user = await requireUser();

    const { error } = await supabase
      .from("body_info")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },
};

// Hedefler işlemleri
export const goalsService = {
  // Tüm hedefleri getir (sadece kullanıcının kendi hedefleri)
  async getAll() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Aktif hedefleri getir (sadece kullanıcının kendi aktif hedefleri)
  async getActive() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("target_date", { ascending: true });

    if (error) throw error;
    return data;
  },

  // Yeni hedef ekle
  async create(goal) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("goals")
      .insert([{ ...goal, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Hedefi güncelle
  async update(id, goal) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("goals")
      .update(goal)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Hedefi sil
  async delete(id) {
    const user = await requireUser();

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },
};

// ─── Besin Günlüğü (food_logs) ───────────────────────────────────────────────
export const foodLogService = {
  async getByDate(date) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(entry) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from('food_logs')
      .insert([{ ...entry, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const user = await requireUser();

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async getDailySummary(date) {
    const logs = await foodLogService.getByDate(date);
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein:  acc.protein  + (log.protein  || 0),
        carbs:    acc.carbs    + (log.carbs     || 0),
        fat:      acc.fat      + (log.fat       || 0),
        fiber:    acc.fiber    + (log.fiber     || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  },
};

// ─── Günlük Fotoğraf Analiz Kredisi ─────────────────────────────────────────
export const userCreditsService = {
  // Kredileri getir (gün değiştiyse sayaç 0 kabul edilir)
  async getOrInit() {
    const user = await requireUser();
    const today = toDateString(new Date()); // YEREL gün (TR) — sunucu tr_today() ile aynı

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // İlk kez → oluştur
    if (!data) {
      const { data: created, error: createErr } = await supabase
        .from('user_credits')
        .insert([{ user_id: user.id, daily_photo_used: 0, last_reset_date: today }])
        .select()
        .single();
      if (createErr) throw createErr;
      return created;
    }

    // Yeni gün → sayaç fiilen 0. Sıfırlamayı buradan YAZMIYORUZ: sunucu tetikleyicisi
    // (user_credits_guard) gelecek tarihe yazmayı reddeder; cihaz saati/saat dilimi TR'den
    // ileri olan kullanıcıda bu okuma hataya dönerdi. Sıfırlama increment_photo_credit() içinde.
    if (data.last_reset_date < today) {
      return { ...data, daily_photo_used: 0 };
    }

    return data;
  },

  // Sayacı +1 artır — atomik RPC (sunucu Türkiye gününü kullanır, gün değiştiyse sıfırlar).
  // RPC henüz yoksa (20260925120000 migration uygulanmadıysa) eski UPDATE yoluna düşer.
  async increment() {
    const user = await requireUser();
    const { data, error } = await supabase.rpc('increment_photo_credit');
    if (!error) return Number(data) || 0;
    if (!isMissingRpc(error)) throw error;

    const credits = await userCreditsService.getOrInit();
    const newCount = Math.min((credits.daily_photo_used || 0) + 1, 99);
    const { error: updErr } = await supabase
      .from('user_credits')
      .update({ daily_photo_used: newCount, last_reset_date: toDateString(new Date()) })
      .eq('user_id', user.id);

    if (updErr) throw updErr;
    return newCount;
  },
};
