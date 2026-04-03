import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_MODE_KEY = "ESDIYET_GUEST_MODE_V1";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          setIsGuest(false);
          await AsyncStorage.removeItem(GUEST_MODE_KEY);
        } else {
          const g = await AsyncStorage.getItem(GUEST_MODE_KEY);
          setIsGuest(g === "1");
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth event:", event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (event === "SIGNED_IN") {
          setIsGuest(false);
          await AsyncStorage.removeItem(GUEST_MODE_KEY);
          await AsyncStorage.setItem("userSession", JSON.stringify(newSession));
        } else if (event === "SIGNED_OUT") {
          await AsyncStorage.removeItem("userSession");
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const continueAsGuest = async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, "1");
    setIsGuest(true);
  };

  /** Misafir modundan çık → giriş ekranı */
  const leaveGuestMode = async () => {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
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
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      await AsyncStorage.removeItem("userSession");
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      setIsGuest(false);

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const clearLocalSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* oturum zaten geçersiz olabilir */
    }
    await AsyncStorage.removeItem("userSession");
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
  };

  /**
   * Apple 5.1.1(v): önce Edge Function delete-account, yoksa RPC delete_own_account.
   * RPC için: supabase/sql/delete_own_account.sql dosyasını SQL Editor'de çalıştırın.
   */
  const deleteAccount = async () => {
    try {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!s?.access_token) throw new Error("Oturum bulunamadı");

      const { error: invokeErr } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });

      if (!invokeErr) {
        await clearLocalSession();
        return { error: null };
      }

      // Edge Function deploy edilmediyse (NOT_FOUND) veya başka hata: veritabanı RPC dene
      const { error: rpcErr } = await supabase.rpc("delete_own_account");
      if (!rpcErr) {
        await clearLocalSession();
        return { error: null };
      }

      throw new Error(
        rpcErr.message ||
          "Hesap silinemedi. Supabase SQL Editor’de supabase/sql/delete_own_account.sql dosyasını çalıştırın veya: supabase functions deploy delete-account"
      );
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
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    isGuest,
    continueAsGuest,
    leaveGuestMode,
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
