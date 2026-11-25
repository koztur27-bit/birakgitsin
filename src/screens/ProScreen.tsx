import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { LegalModal } from '../components/LegalModal';
import { useI18n } from '../i18n';
import type { LegalDocId } from '../lib/legalContent';
import {
  FALLBACK_PRODUCTS,
  ProductId,
  ProductInfo,
  fetchProProducts,
  initBilling,
  purchasePro,
  restorePurchases,
} from '../lib/billing';
import { adBlockedText, adUnlockAvailability, hasProAccess, formatUnlockRemaining, proUnlockRemainingMs } from '../lib/proAccess';
import { showRewardedUnlockAd } from '../lib/ads';
import { fontSizes, radius, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, ta, locale } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, setPremium, grantAdProUnlock } = useApp();
  const [products, setProducts] = useState<ProductInfo[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<ProductId | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

  const isPro = hasProAccess(data);
  const unlockMs = proUnlockRemainingMs(data);
  const adAvailability = adUnlockAvailability(data);
  const blockedAdText = adBlockedText(data, t as any);
  const [adBusy, setAdBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await initBilling();
      const fetched = await fetchProProducts();
      if (!cancelled) setProducts(fetched);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const localizedProducts = useMemo(() => {
    return products.map((p) => {
      const tProd = (t(`pro.products.${p.id}.title`) !== `pro.products.${p.id}.title`) ? t(`pro.products.${p.id}.title`) : p.title;
      const tPrice = (t(`pro.products.${p.id}.priceLabel`) !== `pro.products.${p.id}.priceLabel`) ? t(`pro.products.${p.id}.priceLabel`) : p.priceLabel;
      const tDesc = (t(`pro.products.${p.id}.description`) !== `pro.products.${p.id}.description`) ? t(`pro.products.${p.id}.description`) : p.description;
      return { ...p, title: tProd, priceLabel: tPrice, description: tDesc };
    });
  }, [products, t]);

  const features = ta<string[]>('pro.features') || [];
  const freeFeatures = ta<string[]>('pro.freeFeatures') || [];

  const handleBuy = async (id: ProductId) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await purchasePro(id);
      if (res.started) {
        // Yetki yalnızca Google Play'den gelen onaylı satın alma olayıyla verilir.
        Alert.alert(
          locale === 'en' ? 'Payment in progress' : 'Ödeme devam ediyor',
          locale === 'en'
            ? 'PRO will activate automatically once Google Play confirms your payment.'
            : 'Google Play ödemeni onayladığında PRO otomatik olarak açılacak.',
        );
      } else if (res.message) {
        Alert.alert(t('alerts.error'), res.message);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const res = await restorePurchases();
      if (res.ok && res.hasPro) {
        setPremium(true);
        Alert.alert(t('alerts.success'), t('pro.restoreOk'));
      } else {
        Alert.alert(t('pro.restore'), res.message || t('pro.restoreNone'));
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleAdUnlock = async () => {
    if (adBusy) return;
    if (blockedAdText) {
      Alert.alert(t('home.adTitle'), blockedAdText);
      return;
    }
    setAdBusy(true);
    try {
      const res = await showRewardedUnlockAd();
      if (res.rewarded) {
        const granted = grantAdProUnlock();
        Alert.alert(t('home.unlockedTitle'), granted.ok ? t('pro.adUnlocked') : t('pro.adNone'));
      } else if (res.message) {
        Alert.alert(t('home.adTitle'), res.message);
      }
    } finally {
      setAdBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#5A3B00', '#2A1A00']} style={styles.hero}>
            <Text style={styles.heroBadge}>PRO</Text>
            <Text style={styles.heroTitle}>{t('pro.title')}</Text>
            <Text style={styles.heroSub}>{t('pro.subtitle')}</Text>
            {isPro ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>
                  {data.isPremium ? t('pro.active') : t('pro.unlockedFor', { time: formatUnlockRemaining(unlockMs) })}
                </Text>
              </View>
            ) : null}
          </LinearGradient>

          <View style={styles.cardMuted}>
            <Text style={styles.ruleTitle}>{t('pro.trialTitle')}</Text>
            <Text style={styles.ruleText}>{t('pro.trialRule')}</Text>
            <Text style={styles.ruleText}>{t('pro.adRule')}</Text>
            <Text style={styles.ruleStatus}>
              {adAvailability.available ? t('pro.adAvailable') : blockedAdText || t('pro.adNone')}
            </Text>
            <Pressable
              style={[styles.adBtn, (!adAvailability.available || adBusy) && styles.adBtnDisabled]}
              onPress={handleAdUnlock}
              disabled={!adAvailability.available || adBusy}
            >
              <Text style={styles.adBtnText}>
                {adBusy ? (locale === 'en' ? 'Loading ad…' : 'Reklam yükleniyor…') : t('pro.adBtn')}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>{t('pro.featuresTitle')}</Text>
          <View style={styles.card}>
            {features.map((f, i) => (
              <View key={`${f}-${i}`} style={styles.featureRow}>
                <Text style={styles.featureIcon}>✦</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('pro.freeTitle')}</Text>
          <View style={styles.cardMuted}>
            {freeFeatures.map((f, i) => (
              <View key={`${f}-${i}`} style={styles.featureRow}>
                <Text style={styles.featureIconMuted}>•</Text>
                <Text style={styles.featureTextMuted}>{f}</Text>
              </View>
            ))}
          </View>

          {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}

          <View style={styles.products}>
            {localizedProducts.map((p) => (
              <View key={p.id} style={[styles.productCard, p.popular && styles.productPopular]}>
                {p.popular ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>{t('pro.popular')}</Text>
                  </View>
                ) : null}
                <Text style={styles.productTitle}>{p.title}</Text>
                <Text style={styles.productPrice}>{p.priceLabel}</Text>
                <Text style={styles.productDesc}>{p.description}</Text>
                <Pressable
                  style={[styles.buyBtn, p.popular && styles.buyBtnPopular, busyId === p.id && { opacity: 0.7 }]}
                  onPress={() => handleBuy(p.id)}
                  disabled={!!busyId}
                >
                  {busyId === p.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buyText}>{t('pro.buy')}</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
            {restoring ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.restoreText}>{t('pro.restore')}</Text>}
          </Pressable>

          <View style={styles.legalBox}>
            <Text style={styles.legalText}>{t('pro.subscriptionLegal')}</Text>
            <Pressable onPress={() => Linking.openURL('https://support.google.com/googleplay/answer/2476088').catch(() => {})}>
              <Text style={styles.legalLink}>
                {locale === 'en' ? 'Google Play refund policy' : 'Google Play iade politikası'}
              </Text>
            </Pressable>
            <View style={styles.legalLinks}>
              <Pressable onPress={() => setLegalDoc('privacy')}>
                <Text style={styles.legalLink}>{t('pro.privacyPolicy')}</Text>
              </Pressable>
              <Text style={styles.legalSep}>•</Text>
              <Pressable onPress={() => setLegalDoc('terms')}>
                <Text style={styles.legalLink}>{t('pro.termsOfUse')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
        <LegalModal
          visible={legalDoc !== null}
          doc={legalDoc ?? 'privacy'}
          onClose={() => setLegalDoc(null)}
        />
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs, alignItems: 'flex-end' },
    closeBtn: { padding: 8 },
    closeText: { color: colors.primary, fontWeight: '700', fontSize: fontSizes.md },
    content: { padding: spacing.md, paddingBottom: 40 },
    hero: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
    heroBadge: { color: '#FFD700', fontWeight: '900', fontSize: fontSizes.sm, marginBottom: 4 },
    heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
    heroSub: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: fontSizes.md },
    activePill: { alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: 'rgba(255,215,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.round },
    activePillText: { color: '#FFD700', fontWeight: '700' },
    sectionTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    cardMuted: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, opacity: 0.9 },
    ruleTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: 4 },
    ruleText: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20, marginBottom: 4 },
    ruleStatus: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary, marginTop: 6, marginBottom: spacing.sm },
    adBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
    adBtnDisabled: { opacity: 0.45 },
    adBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.sm },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    featureIcon: { color: '#FFD700', fontSize: 16, marginTop: 1 },
    featureIconMuted: { color: colors.textMuted, fontSize: 16, marginTop: 1 },
    featureText: { flex: 1, color: colors.text, fontSize: fontSizes.md, lineHeight: 22 },
    featureTextMuted: { flex: 1, color: colors.textMuted, fontSize: fontSizes.md, lineHeight: 22 },
    products: { gap: spacing.sm, marginTop: spacing.sm },
    productCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
    productPopular: { borderColor: '#FFD700', borderWidth: 2 },
    popularBadge: { alignSelf: 'flex-start', backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.round, marginBottom: 8 },
    popularText: { color: '#3A2600', fontWeight: '800', fontSize: fontSizes.xs },
    productTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    productPrice: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.primary, marginTop: 4 },
    productDesc: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
    buyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
    buyBtnPopular: { backgroundColor: '#C99700' },
    buyText: { color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md },
    restoreBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
    restoreText: { color: colors.primary, fontWeight: '700' },
    legalBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    legalText: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18, textAlign: 'center' },
    legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: spacing.sm, flexWrap: 'wrap' },
    legalLink: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
    legalSep: { fontSize: fontSizes.xs, color: colors.textMuted },
  });
