import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { LEGAL_DOCS, legalUrl, type LegalDocId } from '../lib/legalContent';
import { fontSizes, radius, shadows, spacing } from '../theme';

type Props = {
  visible: boolean;
  doc: LegalDocId;
  onClose: () => void;
};

/**
 * Uygulama içi, okunabilir yasal metin penceresi.
 * Canlı web sayfası açılamadığında (internet yoksa) belge buradan okunmaya devam edilebilir.
 */
export function LegalModal({ visible, doc, onClose }: Props) {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const content = LEGAL_DOCS[doc][locale];

  const openOnline = async () => {
    try {
      await Linking.openURL(legalUrl(doc));
    } catch {
      // Internet yoksa uygulama içi metin zaten görünür durumda; sessizce devam et.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{content.title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.updated}>{content.updated}</Text>
          <Text style={styles.offlineNote}>{t('legal.offlineNote')}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {content.intro ? <Text style={styles.intro}>{content.intro}</Text> : null}
            {content.sections.map((section, i) => (
              <View key={i} style={styles.section}>
                {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
                {section.body?.map((paragraph, j) => (
                  <Text key={`b${j}`} style={styles.paragraph}>
                    {paragraph}
                  </Text>
                ))}
                {section.bullets?.map((bullet, j) => (
                  <View key={`l${j}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.onlineBtn} onPress={openOnline}>
              <Text style={styles.onlineBtnText}>{t('legal.openOnline')} ↗</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      width: '100%',
      maxHeight: '90%',
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadows.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: '800',
      color: colors.text,
    },
    closeIcon: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textMuted,
      padding: 4,
    },
    updated: {
      marginTop: 2,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
    },
    offlineNote: {
      marginTop: spacing.xs,
      fontSize: fontSizes.xs,
      color: colors.primaryDark,
      lineHeight: 17,
    },
    scroll: {
      marginTop: spacing.md,
    },
    scrollContent: {
      paddingBottom: spacing.md,
    },
    intro: {
      fontSize: fontSizes.sm,
      lineHeight: 22,
      color: colors.text,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.md,
    },
    heading: {
      fontSize: fontSizes.md,
      fontWeight: '800',
      color: colors.primaryDark,
      marginBottom: spacing.xs,
      lineHeight: 21,
    },
    paragraph: {
      fontSize: fontSizes.sm,
      lineHeight: 21,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 6,
    },
    bulletDot: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      lineHeight: 21,
    },
    bulletText: {
      flex: 1,
      fontSize: fontSizes.sm,
      lineHeight: 21,
      color: colors.text,
    },
    footer: {
      flexDirection: 'row',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    onlineBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    onlineBtnText: {
      color: colors.white,
      fontWeight: '800',
      fontSize: fontSizes.sm,
      textAlign: 'center',
    },
    closeBtn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    closeBtnText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: fontSizes.sm,
    },
  });
