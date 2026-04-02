import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dietPlanService, weightService, bodyInfoService, goalsService } from "../services/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session'ı kontrol et
    checkSession();

    // Auth state değişikliklerini dinle
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN") {
          await AsyncStorage.setItem("userSession", JSON.stringify(session));
        } else if (event === "SIGNED_OUT") {
          await AsyncStorage.removeItem("userSession");
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      // Session kontrolü hatası
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: false,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      // Kayıt hatası
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      // Developer hata mesajını konsola yazdırma
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local storage
      await AsyncStorage.removeItem("userSession");

      return { error: null };
    } catch (error) {
      // Çıkış hatası
      return { error };
    }
  };

  const deleteAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

      // Tüm kullanıcı verilerini sil
      const tables = ['diet_plans', 'weight_records', 'body_info', 'goals'];
      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', user.id);
      }

      // Oturumu kapat ve yerel veriyi temizle
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('userSession');

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      // Profil güncelleme hatası
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
