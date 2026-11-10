import { Pressable, StyleSheet, View } from 'react-native';

import { formatBRL, formatTime } from '@/lib/format';
import type { HotelSummary } from '@/lib/pricing';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DiffChip } from './DiffChip';
import { PositionBar } from './PositionBar';
import { StatusBadge, type BadgeKind } from './StatusBadge';

type Props = { summary: HotelSummary; onPress: () => void };

/** Cartão do painel: um por hotel próprio. */
export function HotelCard({ summary, onPress }: Props) {
  const { colors, isDark } = useTheme();
  const { hotel, state, competitorAvg, diffPct, direction, highlighted, rank } = summary;
  const { price, checkedAt } = hotel.own.latest;

  const badge: BadgeKind | null = state !== 'ok' ? state : highlighted ? 'highlight' : null;
  const borderColor =
    state === 'failed'
      ? colors.error
      : highlighted
        ? direction === 'above'
          ? colors.pricier
          : colors.cheaper
        : colors.border;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir detalhe de ${hotel.own.name}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor,
          borderWidth: highlighted || state === 'failed' ? 2 : 1,
          borderStyle: state === 'failed' ? 'dashed' : 'solid',
          opacity: pressed ? 0.85 : 1,
        },
        !isDark && styles.shadow,
      ]}>
      <View style={styles.header}>
        <AppText variant="title" numberOfLines={1} style={styles.name}>
          {hotel.own.name}
        </AppText>
        {badge && <StatusBadge kind={badge} />}
      </View>

      <View style={styles.priceRow}>
        {state === 'sold_out' ? (
          <AppText variant="priceMd" color={colors.soldOut}>
            Esgotado
          </AppText>
        ) : price === null ? (
          <AppText variant="priceMd" muted>
            —
          </AppText>
        ) : (
          <AppText variant="priceMd" color={state === 'stale' ? colors.stale : colors.text}>
            {formatBRL(price)}
          </AppText>
        )}
        {diffPct !== null && <DiffChip pct={diffPct} solid={highlighted} />}
      </View>

      {competitorAvg !== null && (
        <AppText variant="label" muted>
          Média dos concorrentes: {formatBRL(competitorAvg)}
        </AppText>
      )}

      <View style={styles.footer}>
        {rank ? <PositionBar position={rank.position} total={rank.total} /> : <View />}
        <AppText variant="caption" muted>
          {state === 'failed'
            ? 'Sem leitura hoje'
            : state === 'stale' && checkedAt
              ? `Última leitura às ${formatTime(checkedAt)}`
              : checkedAt
                ? `Verificado às ${formatTime(checkedAt)}`
                : ''}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  shadow: {
    shadowColor: '#0E1A18',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
