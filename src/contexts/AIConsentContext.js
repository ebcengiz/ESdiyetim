import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getAIConsent,
  setAIConsent as persistAIConsent,
  AI_PROVIDER_NAMES,
} from '../services/aiConsentService';
import AIConsentModal from '../components/AIConsentModal';

const AIConsentContext = createContext(null);

export function AIConsentProvider({ children }) {
  const { user } = useAuth();
  const [consent, setConsent] = useState({ granted: false, decided: false, date: null });
  const [loading, setLoading] = useState(true);
  const [promptVisible, setPromptVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getAIConsent();
      if (cancelled) return;
      setConsent(c);
      setLoading(false);
      // İlk kez: kullanıcı giriş yapmış ve henüz bir karar vermemişse onay iste.
      if (user && !c.decided) setPromptVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const grantConsent = useCallback(async () => {
    const c = await persistAIConsent(true);
    setConsent(c);
    setPromptVisible(false);
  }, []);

  const revokeConsent = useCallback(async () => {
    const c = await persistAIConsent(false);
    setConsent(c);
    setPromptVisible(false);
  }, []);

  /** Bir ekran AI çağrısı sırasında AI_CONSENT_REQUIRED yakaladığında yeniden onay istemek için çağırır. */
  const requestConsentPrompt = useCallback(() => setPromptVisible(true), []);
  const dismissConsentPrompt = useCallback(() => setPromptVisible(false), []);

  return (
    <AIConsentContext.Provider
      value={{
        consent,
        loading,
        providers: AI_PROVIDER_NAMES,
        grantConsent,
        revokeConsent,
        requestConsentPrompt,
        dismissConsentPrompt,
      }}
    >
      {children}
      <AIConsentModal
        visible={promptVisible}
        providers={AI_PROVIDER_NAMES}
        onAccept={grantConsent}
        onDecline={revokeConsent}
      />
    </AIConsentContext.Provider>
  );
}

export function useAIConsent() {
  const ctx = useContext(AIConsentContext);
  if (!ctx) throw new Error('useAIConsent must be inside AIConsentProvider');
  return ctx;
}
