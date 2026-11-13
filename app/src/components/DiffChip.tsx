import { StyleSheet, View } from 'react-native';

import { formatPct } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = {
  pct: number;
  /** Chip sólido quando a diferença passa do limite do cliente. */
  solid?: boolean;
  size?: 'sm' | 'md';
};

/** Diferença % com seta (▲ mais caro, ▼ mais barato) e cor da direção. */
export function DiffChip({ pct, solid, size = 'md' }: Props) {
  const { colors } = useTheme();
  const rounded = Math.round(pct * 10) / 10;
  const tone = rounded > 0 ? colors.pricier : rounded < 0 ? colors.cheaper : colors.textMuted;
  const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '=';
  const foreground = solid ? colors.card : tone;

  return (
    <View
      style={[styles.chip, solid ? { backgroundColor: tone } : { borderColor: tone, borderWidth: 1 }]}
      accessibilityLabel={`${formatPct(pct)} ${rounded > 0 ? 'acima' : rounded < 0 ? 'abaixo' : 'igual'}`}>
      <AppText variant={size === 'md' ? 'label' : 'caption'} color={foreground} style={styles.text}>
        {arrow} {formatPct(pct)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: 'IBMPlexSans_600SemiBold', fontVariant: ['tabular-nums'] },
});
