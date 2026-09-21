import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../../constants/theme';
import { BottomSheet, AppButton, IconBadge } from '../ui';
import { useAds, REWARDS_PER_DAY } from '../../contexts/AdsContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useToast } from '../../contexts/ToastContext';
import { useAppError } from '../../hooks/useAppError';

/**
 * Ücretsiz kullanıcının günlük AI hakkı dolunca açılan sheet.
 * "Reklam izle" butonu YALNIZCA ödüllü reklam gerçekten yüklüyse ve günlük ödül
 * cap'i dolmadıysa görünür (no-fill'de çalışmayan buton = App Review 2.1 riski).
 * Premium CTA her zaman vardır.
 *
 * @param {'photo'|'food'} kind
 * @param {number} limit  ücretsiz planın günlük taban hakkı (bonus hariç)
 * @param {() => void} [onRewarded]  ödül verildikten sonra (ör. analizi yeniden başlat)
 */
export default function LimitReachedSheet({ visible, onClose, kind, limit, onRewarded, onGoPremium }) {
  const { adsEnabled, rewardedReady, getRewardedAvailability, watchRewardedFor } = useAds();
  const { openPaywall } = useSubscription();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const [canWatch, setCanWatch] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    getRewardedAvailability(kind).then((ok) => { if (!cancelled) setCanWatch(ok); });
    return () => { cancelled = true; };
  }, [visible, kind, rewardedReady, getRewardedAvailability]);

  const label = kind === 'photo' ? 'fotoğraftan kalori analizi' : 'AI ile tam besin analizi';

  const watch = async () => {
    setWatching(true);
    try {
      const earned = await watchRewardedFor(kind);
      if (earned) {
        showToast('Teşekkürler! Bugün için +1 analiz hakkı kazandınız.', 'success');
        onClose();
        onRewarded?.();
      } else {
        showToast('Reklam tamamlanmadı; ek hak verilmedi.', 'info');
      }
    } catch (e) {
      handleError(e, { context: 'ads.rewarded' });
    } finally {
      setWatching(false);
    }
  };

  const goPremium = () => {
    onClose();
    // Sheet bir RN Modal içinde açıldıysa (FoodSearchModal) çağıran taraf önce
    // kendi modalını kapatmalı; aksi hâlde Paywall ekranı altta kalır.
    if (onGoPremium) onGoPremium();
    else openPaywall();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Günlük hakkınız doldu"
      keyboard={false}
      footer={
        <View style={styles.footer}>
          {adsEnabled && canWatch && (
            <AppButton
              title="Reklam izle, +1 analiz kazan"
              icon="play-circle-outline"
              variant="secondary"
              fullWidth
              onPress={watch}
              loading={watching}
              disabled={watching}
            />
          )}
          <AppButton title="Premium'a geç — reklamsız, sınırsız" icon="star" fullWidth onPress={goPremium} />
        </View>
      }
    >
      <IconBadge name="hourglass-outline" size={56} style={styles.icon} />
      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Bugünkü {label} hakkınızı kullandınız (ücretsiz planda günde {limit}). Hakkınız yarın yenilenir.
      </Text>
      {adsEnabled && canWatch ? (
        <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Kısa bir reklam izleyerek bugün için ek hak kazanabilirsiniz (günde en fazla {REWARDS_PER_DAY} kez).
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', marginBottom: SIZES.md },
  body: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SIZES.sm },
  hint: { fontSize: SIZES.small, color: COLORS.textLight, lineHeight: 18, marginBottom: SIZES.sm },
  footer: { gap: SIZES.xs },
});
