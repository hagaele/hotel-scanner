import { StyleSheet, View } from 'react-native';

import { formatBRLShort, formatPct, formatTime } from '@/lib/format';
import { ALIGNED_PCT } from '@/lib/market';
import type { HotelSummary } from '@/lib/pricing';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

type Props = {
  summary: HotelSummary;
  /** Abre o detalhe do hotel. */
  onPress: () => void;
  /** Abre o comparativo por data. */
  onCompare?: () => void;
  /** Sugestão de preço para hoje (ex.: "Subir para R$ 305 a R$ 320"). */
  suggestion?: string;
};

/**
 * Cartão de unidade no estilo do mockup: selo de posição no mercado, nome e localização,
 * quadro com sua diária, média do mercado e diferença, sugestão e ações.
 */
export function HotelCard({ summary, onPress, onCompare, suggestion }: Props) {
  const { colors, isDark } = useTheme();
  const { hotel, state, competitorAvg, diffPct, highlighted } = summary;
  const { price, checkedAt } = hotel.own.latest;

  const position =
    diffPct === null
      ? null
      : Math.abs(diffPct) <= ALIGNED_PCT
        ? { label: 'Alinhado', color: colors.aligned }
        : diffPct < 0
          ? { label: 'Abaixo do mercado', color: colors.cheaper }
          : { label: 'Acima do mercado', color: colors.pricier };
  const diffColor = position?.color ?? colors.textMuted;

  const ownLabel =
    state === 'sold_out' ? 'Esgotado' : price === null ? '—' : formatBRLShort(price);
  const footnote =
    state === 'failed' || state === 'none'
      ? 'Sem leitura hoje'
      : state === 'stale' && checkedAt
        ? `Última leitura às ${formatTime(checkedAt)}`
        : checkedAt
          ? `Verificado às ${formatTime(checkedAt)}`
          : '';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: state === 'failed' ? colors.error : colors.border,
          borderStyle: state === 'failed' ? 'dashed' : 'solid',
        },
        !isDark && styles.shadow,
      ]}>
      <View style={styles.badges}>
        {position && state === 'ok' && (
          <View style={[styles.pill, { backgroundColor: position.color }]}>
            <AppText variant="caption" color="#FFFFFF" style={styles.pillText}>
              {position.label}
            </AppText>
          </View>
        )}
        {state !== 'ok' && <StatusBadge kind={state} />}
        {highlighted && <StatusBadge kind="highlight" />}
      </View>

      <View>
        <AppText variant="strong" numberOfLines={1}>
          {hotel.own.name}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {[hotel.city, footnote].filter(Boolean).join(' · ')}
        </AppText>
      </View>

      <View style={[styles.metrics, { backgroundColor: colors.surfaceMuted }]}>
        <Metric label="Sua diária" value={ownLabel} color={state === 'sold_out' ? colors.soldOut : state === 'stale' ? colors.stale : undefined} />
        <Metric label="Média mercado" value={competitorAvg !== null ? formatBRLShort(competitorAvg) : '—'} />
        <Metric label="Diferença" value={diffPct !== null ? formatPct(diffPct) : '—'} color={diffColor} />
      </View>

      {suggestion ? (
        <AppText variant="caption">
          <AppText variant="caption" style={styles.bold}>
            Sugestão:{' '}
          </AppText>
          {suggestion}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {onCompare && (
          <View style={styles.action}>
            <Button title="Comparar" variant="ink" onPress={onCompare} accessibilityHint={`Comparativo por data de ${hotel.own.name}`} />
          </View>
        )}
        <View style={styles.action}>
          <Button title="Detalhes" variant="secondary" onPress={onPress} accessibilityHint={`Detalhe de ${hotel.own.name}`} />
        </View>
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="strong" color={color} numberOfLines={1} style={styles.metricValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  shadow: {
    shadowColor: '#12161D',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.bold, fontSize: 11 },
  metrics: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md - 2 },
  metric: { flex: 1, minWidth: 0, gap: 2 },
  metricValue: { fontVariant: ['tabular-nums'] },
  bold: { fontFamily: fonts.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 'auto' },
  action: { flexGrow: 1, flexBasis: 110 },
});
