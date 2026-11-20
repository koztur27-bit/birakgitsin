import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { fontSizes, radius, shadows, spacing } from '../theme';

type ScreenMapItem = {
  code: string;
  name: string;
  desc: string;
  indent?: boolean;
};

type ScreenMapModalProps = {
  visible: boolean;
  onClose: () => void;
  showNumbers?: boolean;
  onToggleNumbers?: (value: boolean) => void;
};

export function ScreenMapModal({
  visible,
  onClose,
  showNumbers,
  onToggleNumbers,
}: ScreenMapModalProps) {
  const { colors } = useTheme();
  const { t, ta } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const items = ta<ScreenMapItem[]>('screenMap.items') || [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('screenMap.title')}</Text>
          <Text style={styles.sub}>{t('screenMap.sub')}</Text>

          {onToggleNumbers ? (
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>{t('screenMap.showNumbers')}</Text>
                <Text style={styles.toggleSub}>{t('screenMap.showNumbersSub')}</Text>
              </View>
              <Switch value={!!showNumbers} onValueChange={onToggleNumbers} />
            </View>
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View key={item.code} style={[styles.row, item.indent && styles.rowIndent]}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.md,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      maxHeight: '85%',
      ...shadows.card,
    },
    title: {
      fontSize: fontSizes.xl,
      fontWeight: '800',
      color: colors.text,
    },
    sub: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    toggleText: { flex: 1 },
    toggleTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    toggleSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    list: { marginBottom: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: 8,
    },
    rowIndent: { paddingLeft: spacing.md },
    codeBadge: {
      minWidth: 34,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.round,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
    },
    codeText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.primary },
    textCol: { flex: 1 },
    name: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    desc: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
    closeBtn: {
      alignSelf: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.round,
    },
    closeText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.md },
  });
