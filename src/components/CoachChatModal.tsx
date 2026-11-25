import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { showRewardedUnlockAd } from '../lib/ads';
import { SUPPORT_EMAIL } from '../lib/legalContent';
import { todayKey } from '../lib/calculations';
import { CoachQuickId, coachIntro, coachReply, coachReplyAsync } from '../lib/coachChat';
import { adBlockedText, hasProAccess } from '../lib/proAccess';
import { fontSizes, radius, spacing } from '../theme';

type Msg = { id: string; role: 'user' | 'coach'; text: string };

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FREE_LIMIT = 5;

export function CoachChatModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { data, incrementCoachUsage, grantAdProUnlock } = useApp();
  const { t, locale } = useI18n();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unlocking, setUnlocking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const initChat = () => {
    const disclaimer = locale === 'en'
      ? 'Note: I am an AI, not a doctor. I do not provide medical advice, diagnosis, or treatment. Messages and anonymous progress numbers may be processed by an AI provider to generate a reply. Never share personal identifying information here. For health decisions, consult a qualified professional.'
      : 'Not: Ben bir yapay zekayim, doktor degilim. Tibbi tavsiye, teshis veya tedavi sunmam. Yanit uretmek icin mesajlarin ve anonim ilerleme sayilarin bir AI saglayicisi tarafindan islenebilir. Buraya kisisel tanimlayici bilgi yazma. Saglik kararlarin icin mutlaka bir uzmana danisan.';
    setMessages([{ id: 'intro', role: 'coach', text: coachIntro(locale) + '\n\n' + disclaimer }]);
    setInput('');
  };

  const today = todayKey();
  const usedToday =
    data.coachUsage && data.coachUsage.date === today ? data.coachUsage.count : 0;
  const unlimited = hasProAccess(data);
  const remaining = Math.max(0, FREE_LIMIT - usedToday);
  const canSend = unlimited || usedToday < FREE_LIMIT;

  const push = (role: 'user' | 'coach', text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // Google Play Generated Content policy: users can report objectionable AI output in-app.
  const reportReply = (text: string) => {
    const subject = encodeURIComponent('Bırak Gitsin - AI coach content report');
    const body = encodeURIComponent(
      `Reported coach message:\n\n${text.slice(0, 500)}\n\nReason (optional):\n`,
    );
    Alert.alert(
      locale === 'en' ? 'Report this reply' : 'Bu yanıtı bildir',
      locale === 'en'
        ? 'Your report will be sent to the developer by email. Do not include personal health details.'
        : 'Bildirimin geliştiriciye e-posta ile gönderilecek. Kişisel sağlık bilgisi eklemeyin.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: locale === 'en' ? 'Send report' : 'Bildirimi gönder',
          onPress: () => {
            Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
          },
        },
      ],
    );
  };

  const tryConsume = (): boolean => {
    if (unlimited) return true;
    if (usedToday >= FREE_LIMIT) return false;
    incrementCoachUsage();
    return true;
  };

  const showLimit = () => {
    Alert.alert(t('coach.limitTitle'), t('coach.limitMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('coach.watchAd'),
        onPress: unlockByAd,
      },
      { text: t('coach.goPro'), onPress: () => {} },
    ]);
  };

  const unlockByAd = async () => {
    const blocked = adBlockedText(data, t as any);
    if (blocked) {
      Alert.alert(t('coach.unlimited'), blocked);
      return;
    }
    if (unlocking) return;
    setUnlocking(true);
    try {
      const res = await showRewardedUnlockAd();
      if (res.rewarded) {
        const granted = grantAdProUnlock();
        Alert.alert(t('coach.unlimited'), granted.ok ? t('coach.unlocked24h') : t('pro.adNone'));
      } else if (res.message) {
        Alert.alert(t('alerts.error', undefined as any) || 'Bilgi', res.message || t('coach.adNotReady'));
      } else {
        Alert.alert(t('common.appName'), t('coach.adNotReady'));
      }
    } finally {
      setUnlocking(false);
    }
  };

  const send = (text: string, quickId: CoachQuickId | null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!canSend) {
      showLimit();
      return;
    }
    if (!tryConsume()) {
      showLimit();
      return;
    }
    push('user', trimmed);
    setInput('');
    coachReplyAsync(trimmed, quickId, data, locale)
      .then((reply) => {
        setTimeout(() => push('coach', reply), 250);
      })
      .catch(() => {
        setTimeout(() => push('coach', coachReply(trimmed, quickId, data, locale)), 250);
      });
  };

  const quicks: { id: CoachQuickId; label: string }[] = [
    { id: 'urge', label: t('coach.quick.urge') },
    { id: 'stress', label: t('coach.quick.stress') },
    { id: 'trigger', label: t('coach.quick.trigger') },
    { id: 'slip', label: t('coach.quick.slip') },
    { id: 'motivate', label: t('coach.quick.motivate') },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={initChat}>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('coach.title')}</Text>
            <Text style={{fontSize:11,color:'#64748B',marginTop:2}}>{locale==='en'?'AI-Powered Coach (AI-assisted, not medical advice)':'AI Destekli Koc (Yapay zeka destekli, tibbi tavsiye degildir)'}</Text>
            <Text style={styles.sub}>
              {unlimited ? t('coach.unlimited') : t('coach.remaining', { count: remaining })}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>

        {!unlimited && !canSend ? (
          <View style={styles.limitBanner}>
            <Text style={styles.limitText}>{t('coach.limitMsg')}</Text>
            <View style={styles.limitActions}>
              <Pressable
                style={[styles.limitBtn, styles.limitBtnPrimary, unlocking && { opacity: 0.6 }]}
                onPress={unlockByAd}
                disabled={unlocking}
              >
                <Text style={styles.limitBtnPrimaryText}>{t('coach.watchAd')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubbleRow, m.role === 'user' ? styles.rowUser : styles.rowCoach]}
            >
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleCoach,
                ]}
              >
                <Text style={styles.bubbleLabel}>
                  {m.role === 'user' ? t('coach.you') : t('coach.coachName')}
                </Text>
                <Text
                  style={[
                    styles.bubbleText,
                    m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextCoach,
                  ]}
                >
                  {m.text}
                </Text>
                {m.role === 'coach' && (
                  <>
                    <Text style={styles.aiLabel}>
                      {locale === 'en'
                        ? 'AI-generated · may be inaccurate · not medical advice'
                        : 'Yapay zeka üretti · hatalı olabilir · tıbbi tavsiye değildir'}
                    </Text>
                    <Pressable onPress={() => reportReply(m.text)} hitSlop={6}>
                      <Text style={styles.reportLink}>
                        {locale === 'en' ? '⚠ Report this reply' : '⚠ Bu yanıtı bildir'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ))}

          <Text style={styles.quickTitle}>{t('coach.quickTitle')}</Text>
          <View style={styles.quickWrap}>
            {quicks.map((q) => (
              <Pressable
                key={q.id}
                style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
                onPress={() => send(q.label, q.id)}
              >
                <Text style={styles.quickChipText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
            onPress={() => send(input, null)}
            disabled={!input.trim()}
          >
            <Text style={styles.sendText}>{t('coach.send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    sub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    closeBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.round,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    limitBanner: {
      margin: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft || colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    limitText: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 20 },
    limitActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    limitBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    limitBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    limitBtnPrimaryText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
    messages: { flex: 1 },
    messagesContent: { padding: spacing.md, paddingBottom: spacing.lg },
    bubbleRow: { marginBottom: spacing.sm, flexDirection: 'row' },
    rowUser: { justifyContent: 'flex-end' },
    rowCoach: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '88%',
      padding: spacing.md,
      borderRadius: radius.md,
    },
    bubbleUser: { backgroundColor: colors.primary },
    bubbleCoach: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textMuted, marginBottom: 4 },
    bubbleText: { fontSize: fontSizes.sm, lineHeight: 20 },
    bubbleTextUser: { color: colors.white },
    bubbleTextCoach: { color: colors.text },
    quickTitle: {
      fontSize: fontSizes.sm,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    quickChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.round,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    quickChipText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primaryDark },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: fontSizes.sm,
    },
    sendBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignSelf: 'flex-end',
      marginBottom: 2,
    },
    sendText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
    aiLabel: { fontSize: 10, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
    reportLink: { fontSize: 10, color: colors.danger, marginTop: 4, textDecorationLine: 'underline' },
  });
