import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = { label: string; value: string; hint?: string; color?: string };

/** Indicador do topo do painel: rótulo, número grande e uma linha de contexto. */
export function KpiTile({ label, value, hint, color }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="priceMd" color={color} style={styles.value}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // flexBasis + flexGrow: 2 por linha no celular, mais por linha em telas largas.
  tile: { flexGrow: 1, flexBasis: 160, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
  value: { fontSize: 24, marginTop: spacing.xs },
});
