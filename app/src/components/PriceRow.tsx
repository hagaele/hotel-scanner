import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { formatBRL, formatTime } from '@/lib/format';
import type { PriceState } from '@/lib/pricing';
import { radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Property } from '@/types';

import { AppText } from './AppText';
import { DiffChip } from './DiffChip';
import { StatusBadge } from './StatusBadge';

type Props = {
  property: Property;
  state: PriceState;
  /** Linha do hotel próprio: fica destacada e sem chip de diferença. */
  own?: boolean;
  /** Diferença % em relação ao hotel próprio (só concorrentes). */
  diffVsOwn?: number | null;
};

/** Linha da lista comparativa do detalhe: hotel próprio ou concorrente. */
export function PriceRow({ property, state, own, diffVsOwn }: Props) {
  const { colors } = useTheme();
  const { price, checkedAt, previousPrice, changedAt } = property.latest;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: own ? colors.primary : colors.border, borderWidth: own ? 2 : 1 },
      ]}>
      <View style={styles.top}>
        <View style={styles.nameBlock}>
          <AppText variant="label" muted>
            {own ? 'Seu hotel' : 'Concorrente'}
          </AppText>
          <AppText variant="title" numberOfLines={2}>
            {property.name}
          </AppText>
        </View>
        <View style={styles.priceBlock}>
          {state === 'sold_out' ? (
            <AppText variant="priceSm" color={colors.soldOut}>
              Esgotado
            </AppText>
          ) : price === null ? (
            <AppText variant="priceSm" muted>
              —
            </AppText>
          ) : (
            <AppText variant="priceSm" color={state === 'stale' ? colors.stale : colors.text}>
              {formatBRL(price)}
            </AppText>
          )}
          {diffVsOwn != null && <DiffChip pct={diffVsOwn} size="sm" />}
        </View>
      </View>

      {state !== 'ok' && <StatusBadge kind={state} />}

      {previousPrice !== undefined && changedAt && price !== null && (
        <AppText variant="caption" color={price > previousPrice ? colors.pricier : colors.cheaper}>
          {price > previousPrice ? '▲' : '▼'} era {formatBRL(previousPrice)} até as {formatTime(changedAt)}
        </AppText>
      )}

      <View style={styles.bottom}>
        <AppText variant="caption" muted>
          {checkedAt
            ? `${state === 'stale' ? 'Última leitura' : 'Verificado'} às ${formatTime(checkedAt)}`
            : 'Sem leitura hoje'}
        </AppText>
        {property.bookingUrl && (
          <Pressable
            onPress={() => Linking.openURL(property.bookingUrl!)}
            accessibilityRole="link"
            style={styles.link}>
            <AppText variant="label" color={colors.primary}>
              Ver no Booking.com
            </AppText>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  nameBlock: { flex: 1, gap: 2 },
  priceBlock: { alignItems: 'flex-end', gap: spacing.xs },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: touchTarget },
});
