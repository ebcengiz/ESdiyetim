import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase yapılandırması
// NOT: Bu bilgileri kendi Supabase proje bilgilerinizle değiştirin
export const SUPABASE_URL = "https://qyfagnhmhovhlpbllioq.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZmFnbmhtaG92aGxwYmxsaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTA5NzksImV4cCI6MjA4OTE4Njk3OX0.pa7V7a3aHN11fXeHQZBFLokuJUo_0n4fuCBvP7QF-0A";

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

// Diyet programı işlemleri
export const dietPlanService = {
  // Tüm diyet planlarını getir (sadece kullanıcının kendi kayıtları)
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) throw error;
    return data;
  },

  // Yeni kilo kaydı ekle
  async create(weightRecord) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    if (error && String(error.message || "").toLowerCase().includes("no unique")) {
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
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
        const err = new Error('Bu tarih için zaten bir kilo kaydı bulunuyor. Lütfen farklı bir tarih seçin veya mevcut kaydı düzenleyin.');
        err.code = 'DUPLICATE_DATE';
        throw err;
      }
      throw error;
    }
    return data;
  },

  // Kilo kaydını güncelle
  async update(id, weightRecord) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

    const { error } = await supabase
      .from("weight_records")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },

  // En son kilo kaydını getir
  async getLatest() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },
};
