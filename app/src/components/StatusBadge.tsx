import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export type BadgeKind = 'highlight' | 'sold_out' | 'stale' | 'failed';

const labels: Record<BadgeKind, string> = {
  highlight: 'Em destaque',
  sold_out: 'Esgotado',
  stale: 'Desatualizado',
  failed: 'Falha na leitura',
};

const icons: Record<BadgeKind, keyof typeof Ionicons.glyphMap> = {
  highlight: 'flag',
  sold_out: 'bed-outline',
  stale: 'time-outline',
  failed: 'warning-outline',
};

/** Selo de status. Nunca depende só da cor: sempre traz ícone e texto. */
export function StatusBadge({ kind }: { kind: BadgeKind }) {
  const { colors } = useTheme();
  const solid = kind === 'highlight';
  const tone = { highlight: colors.highlightBg, sold_out: colors.soldOut, stale: colors.stale, failed: colors.error }[kind];
  const foreground = solid ? colors.highlightText : tone;

  return (
    <View style={[styles.badge, solid ? { backgroundColor: tone } : { borderColor: tone, borderWidth: 1 }]}>
      <Ionicons name={icons[kind]} size={14} color={foreground} />
      <AppText variant="caption" color={foreground} style={styles.text}>
        {labels[kind]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: 'IBMPlexSans_600SemiBold' },
});
