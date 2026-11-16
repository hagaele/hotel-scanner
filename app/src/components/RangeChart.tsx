import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatBRLShort } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export type RangeColumn = {
  date: string;
  /** Rótulos embaixo da coluna: dia ("20") e dia da semana ("sex"). */
  day: string;
  weekday: string;
  min: number | null;
  median: number | null;
  max: number | null;
  own: number | null;
  /** Feriado ou evento: marca embaixo do dia. */
  special: boolean;
};

type Props = {
  columns: RangeColumn[];
  selected: string;
  onSelect: (date: string) => void;
  /** Descrição do gráfico para leitores de tela. */
  accessibilityLabel: string;
};

const HEIGHT = 200;
/** Altura mínima da faixa, em px: concorrentes com preços quase iguais ainda mostram uma faixa visível. */
const MIN_BAND = 10;
const AXIS_WIDTH = 56;
const MIN_COLUMN = 32;

/**
 * Faixa dos concorrentes (mínimo a máximo), mediana e a diária da unidade em cada noite.
 * Feito só com View + Flexbox (posições em %), funciona igual no celular e na web.
 * Tocar numa coluna escolhe a data.
 */
export function RangeChart({ columns, selected, onSelect, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const values = columns.flatMap((c) => [c.min, c.max, c.own]).filter((v): v is number => v !== null);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const margin = Math.max((high - low) * 0.1, 10);
  const lo = Math.max(0, low - margin);
  const hi = high + margin;
  const pct = (v: number) => `${(((hi - v) / (hi - lo)) * 100).toFixed(2)}%` as const;
  // Faixa centrada entre o mínimo e o máximo, com altura mínima para não sumir quando os preços são iguais.
  const bandStyle = (min: number, max: number) => {
    const height = Math.max(((max - min) / (hi - lo)) * HEIGHT, MIN_BAND);
    return { top: pct((min + max) / 2), height, marginTop: -height / 2 };
  };

  const available = Math.max(width - AXIS_WIDTH, 0);
  const needsScroll = available > 0 && available / Math.max(columns.length, 1) < MIN_COLUMN;
  // Com um único preço no período, os três rótulos seriam iguais: mostra só um.
  const ticks = high - low < 1 ? [high] : [hi - margin, (hi + lo) / 2, lo + margin];

  const plot = (
    <View style={[styles.columns, needsScroll && { width: columns.length * MIN_COLUMN }]}>
      {columns.map((c) => {
        const isSelected = c.date === selected;
        return (
          <Pressable
            key={c.date}
            onPress={() => onSelect(c.date)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${c.day} ${c.weekday}: mediana ${c.median !== null ? formatBRLShort(c.median) : 'sem dados'}, sua diária ${c.own !== null ? formatBRLShort(c.own) : 'sem preço'}`}
            style={styles.column}>
            <View style={[styles.plotArea, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.background }]}>
              {c.min !== null && c.max !== null && (
                <View
                  style={[
                    styles.band,
                    bandStyle(c.min, c.max),
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
              {c.median !== null && <View style={[styles.median, { top: pct(c.median), backgroundColor: colors.pricier }]} />}
              {c.own !== null && (
                <View style={[styles.dot, { top: pct(c.own), backgroundColor: colors.primary, borderColor: colors.card }]} />
              )}
            </View>
            <AppText variant="caption" style={styles.center} color={isSelected ? colors.primary : colors.text}>
              {c.day}
            </AppText>
            <AppText variant="caption" muted style={styles.center}>
              {c.weekday}
            </AppText>
            <View style={[styles.specialMark, { backgroundColor: c.special ? colors.pricier : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <LegendItem label="Faixa dos concorrentes" swatch={<View style={[styles.swatchBand, { backgroundColor: colors.border }]} />} />
        <LegendItem label="Mediana" swatch={<View style={[styles.swatchLine, { backgroundColor: colors.pricier }]} />} />
        <LegendItem label="Sua diária" swatch={<View style={[styles.swatchDot, { backgroundColor: colors.primary }]} />} />
      </View>

      <View
        style={styles.chart}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible={false}
        accessibilityLabel={accessibilityLabel}>
        <View style={styles.axis}>
          {ticks.map((t, i) => (
            <AppText key={`tick-${i}`} variant="caption" muted style={[styles.tick, { top: pct(t) }]}>
              {formatBRLShort(t)}
            </AppText>
          ))}
        </View>
        {needsScroll ? (
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.flex}>
            {plot}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{plot}</View>
        )}
      </View>
    </View>
  );
}

function LegendItem({ label, swatch }: { label: string; swatch: ReactNode }) {
  return (
    <View style={styles.legendItem}>
      {swatch}
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  chart: { flexDirection: 'row' },
  flex: { flex: 1 },
  axis: { width: AXIS_WIDTH, height: HEIGHT },
  tick: { position: 'absolute', right: spacing.sm, marginTop: -8 },
  columns: { flexDirection: 'row', gap: 2 },
  column: { flex: 1, minWidth: MIN_COLUMN - 2, alignItems: 'stretch', gap: 2 },
  plotArea: { height: HEIGHT, borderBottomWidth: 1, borderRadius: radius.sm },
  band: { position: 'absolute', left: '22%', right: '22%', borderRadius: radius.sm },
  median: { position: 'absolute', left: '12%', right: '12%', height: 3, borderRadius: 2, marginTop: -1 },
  dot: { position: 'absolute', alignSelf: 'center', width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: -6 },
  center: { textAlign: 'center' },
  specialMark: { height: 4, borderRadius: 2, marginHorizontal: '20%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatchBand: { width: 16, height: 12, borderRadius: 3 },
  swatchLine: { width: 16, height: 3, borderRadius: 2 },
  swatchDot: { width: 12, height: 12, borderRadius: 6 },
});
