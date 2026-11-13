import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { formatBRL } from '@/lib/format';
import { priceRange, type HistoryChartData, type HistorySeries } from '@/lib/history';
import { fonts, fontSize, layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = { data: HistoryChartData };

// Margens internas do desenho: espaço para os rótulos de preço (esquerda) e de dia (embaixo).
const MARGIN = { top: spacing.md, right: spacing.xl, bottom: spacing.xl, left: spacing.xxl * 2 };
/** Largura mínima, em pixels, para um rótulo de dia ("13/11") caber sem encostar no vizinho. */
const MIN_DAY_LABEL_WIDTH = 48;
const GRID_LINES = 3;

/** "R$ 720": preço sem centavos, para os rótulos do eixo. */
function axisLabel(value: number): string {
  return formatBRL(Math.round(value)).replace(/,\d{2}$/, '');
}

/** Caminho SVG da linha. Dias sem preço quebram a linha em vez de ligar pontos distantes. */
function linePath(points: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let path = '';
  let drawing = false;
  points.forEach((value, i) => {
    if (value === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)} ${y(value).toFixed(1)} `;
    drawing = true;
  });
  return path.trim();
}

/**
 * Gráfico de linhas dos últimos 7 dias: o hotel próprio (linha grossa) e os concorrentes.
 * Desenhado com react-native-svg, que funciona igual em Android, iPhone e web.
 */
export function PriceHistoryChart({ data }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const competitorColors = [colors.series1, colors.series2, colors.series3];
  let competitorIndex = 0;
  const colored = data.series.map((s) => ({
    ...s,
    color: s.own ? colors.primary : competitorColors[competitorIndex++ % competitorColors.length],
  }));

  const height = layout.chartHeight;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const { min, max } = priceRange(data.series);
  const lastIndex = Math.max(data.days.length - 1, 1);

  const x = (i: number) => MARGIN.left + (plotWidth * i) / lastIndex;
  const y = (value: number) => MARGIN.top + plotHeight * (1 - (value - min) / (max - min));
  const skipLabels = plotWidth / lastIndex < MIN_DAY_LABEL_WIDTH;
  const gridValues = Array.from({ length: GRID_LINES }, (_, i) => min + ((max - min) * i) / (GRID_LINES - 1));

  return (
    <View style={styles.container}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={describe(data)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {gridValues.map((value) => (
              <Line
                key={`grid-${value}`}
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(value)}
                y2={y(value)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {gridValues.map((value) => (
              <SvgText
                key={`price-${value}`}
                x={MARGIN.left - spacing.sm}
                y={y(value) + fontSize.min / 3}
                fill={colors.textMuted}
                fontSize={fontSize.min}
                fontFamily={fonts.regular}
                textAnchor="end">
                {axisLabel(value)}
              </SvgText>
            ))}
            {data.days.map((day, i) =>
              // Em telas estreitas os rótulos se sobrepõem: mostra dia sim, dia não, sempre com o de hoje.
              skipLabels && (data.days.length - 1 - i) % 2 === 1 ? null : (
                <SvgText
                  key={day}
                  x={x(i)}
                  y={height - spacing.xs}
                  fill={colors.textMuted}
                  fontSize={fontSize.min}
                  fontFamily={fonts.regular}
                  textAnchor="middle">
                  {day}
                </SvgText>
              ),
            )}

            {/* Concorrentes primeiro, para a linha do hotel próprio ficar por cima. */}
            {[...colored].reverse().map((s) => (
              <Path
                key={`line-${s.propertyId}`}
                d={linePath(s.points, x, y)}
                stroke={s.color}
                strokeWidth={s.own ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ))}
            {[...colored].reverse().map((s) =>
              s.points.map((value, i) =>
                value === null ? null : (
                  <Circle
                    key={`dot-${s.propertyId}-${i}`}
                    cx={x(i)}
                    cy={y(value)}
                    r={s.own ? 4 : 3}
                    fill={s.color}
                    stroke={colors.card}
                    strokeWidth={1}
                  />
                ),
              ),
            )}
          </Svg>
        )}
      </View>

      <View style={styles.legend}>
        {colored.map((s) => (
          <View key={s.propertyId} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }, s.own && styles.swatchOwn]} />
            <AppText variant="caption" style={styles.legendName} numberOfLines={1}>
              {s.own ? `${s.name} (seu hotel)` : s.name}
            </AppText>
            <AppText variant="caption" muted>
              {lastPriceLabel(s)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Último preço da série no período, mostrado na legenda. */
function lastPriceLabel(series: HistorySeries): string {
  const last = [...series.points].reverse().find((p) => p !== null);
  return last === undefined || last === null ? 'sem preço' : formatBRL(last);
}

/** Resumo em texto para leitores de tela. */
function describe(data: HistoryChartData): string {
  const parts = data.series.map((s) => `${s.name}: ${lastPriceLabel(s)}`);
  return `Gráfico de preços dos últimos 7 dias. Último preço de cada hotel: ${parts.join('; ')}.`;
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  legend: { gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendName: { flex: 1 },
  swatch: { width: spacing.lg, height: spacing.xs, borderRadius: radius.pill },
  swatchOwn: { height: spacing.sm },
});
