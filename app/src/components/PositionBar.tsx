import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = { position: number; total: number };

const ordinal = (position: number, total: number) => {
  if (position === 1) return 'Mais barato';
  if (position === total) return 'Mais caro';
  return `${position}º mais barato`;
};

/** Mini-barra: onde o hotel está entre os preços comparados, do mais barato (esquerda) ao mais caro. */
export function PositionBar({ position, total }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`${ordinal(position, total)} entre ${total}`}>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i + 1 === position ? colors.primary : colors.border }]}
          />
        ))}
      </View>
      <AppText variant="caption" muted>
        {ordinal(position, total)} entre {total}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { width: 18, height: 6, borderRadius: radius.sm },
});
