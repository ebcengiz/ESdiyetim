import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase yapılandırması
// NOT: Bu bilgileri kendi Supabase proje bilgilerinizle değiştirin
const SUPABASE_URL = "https://tjffmvmwncdabgzjtyeb.supabase.co"; // Örnek: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZmZtdm13bmNkYWJnemp0eWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzUwMjMsImV4cCI6MjA3NDc1MTAyM30.6jQBKlLodGK1LMh2EzKBrZHL2VqlkhC4JYTy0CfdXys";

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
  // Tüm diyet planlarını getir
  async getAll() {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Belirli bir tarihe göre diyet planını getir
  async getByDate(date) {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("date", date)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data;
  },

  // Yeni diyet planı ekle
  async create(dietPlan) {
    const { data, error } = await supabase
      .from("diet_plans")
      .insert([dietPlan])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Diyet planını güncelle
  async update(id, dietPlan) {
    const { data, error } = await supabase
      .from("diet_plans")
      .update(dietPlan)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Diyet planını sil
  async delete(id) {
    const { error } = await supabase.from("diet_plans").delete().eq("id", id);

    if (error) throw error;
  },
};

// Kilo takip işlemleri
export const weightService = {
  // Tüm kilo kayıtlarını getir
  async getAll() {
    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Son 30 günün kilo kayıtlarını getir
  async getLastMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) throw error;
    return data;
  },

  // Yeni kilo kaydı ekle
  async create(weightRecord) {
    const { data, error } = await supabase
      .from("weight_records")
      .insert([weightRecord])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Kilo kaydını güncelle
  async update(id, weightRecord) {
    const { data, error } = await supabase
      .from("weight_records")
      .update(weightRecord)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Kilo kaydını sil
  async delete(id) {
    const { error } = await supabase
      .from("weight_records")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // En son kilo kaydını getir
  async getLatest() {
    const { data, error } = await supabase
      .from("weight_records")
      .select("*")
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
