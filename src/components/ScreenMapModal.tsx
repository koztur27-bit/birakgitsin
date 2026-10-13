import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontSizes, radius, shadows, spacing } from '../theme';
import { SCREEN_MAP } from '../lib/screenMap';

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Ekran Haritası</Text>
          <Text style={styles.sub}>
            Bir bölgeyi anlatmak için sadece numarasını yaz. Örnek: “3a’yı büyüt”.
          </Text>

          {onToggleNumbers ? (
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Numaraları ana sayfada göster</Text>
                <Text style={styles.toggleSub}>
                  Açıkken her bölümün yanında numara balonu görünür.
                </Text>
              </View>
              <Switch
                value={!!showNumbers}
                onValueChange={onToggleNumbers}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {SCREEN_MAP.map((item) => (
              <View key={item.code} style={[styles.row, item.indent && styles.rowIndent]}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.code}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '82%',
    ...shadows.card,
  },
  title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  sub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: fontSizes.md + 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  toggleSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  list: { marginTop: spacing.md },
  listContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  rowIndent: { marginLeft: spacing.md, backgroundColor: colors.primarySoft },
  badge: {
    minWidth: 34,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.white },
  rowText: { flex: 1 },
  rowName: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  rowDesc: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  closeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  closeText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
});
