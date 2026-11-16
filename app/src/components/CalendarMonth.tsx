import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { daysInMonth, formatMonth, monthStart, shiftMonth, weekdayOf, WEEKDAY_SHORT } from '@/lib/dates';
import { DEMAND_LABELS, type DateInfo, type DemandLevel } from '@/lib/market';
import { radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export type CalendarCell = {
  date: string;
  /** Mediana do mercado arredondada, sem "R$" (cabe na célula). */
  price: string | null;
  level: DemandLevel | null;
  info: DateInfo;
  past: boolean;
  /** Data com cara de evento (alta de preços sem feriado cadastrado). */
  suspected?: boolean;
};

type Props = {
  month: string;
  cells: Record<string, CalendarCell>;
  selected: string;
  onSelect: (date: string) => void;
  onChangeMonth: (month: string) => void;
  /** Primeiro e último mês navegáveis (AAAA-MM). Fora disso não há dados. */
  minMonth?: string;
  maxMonth?: string;
};

const SHORT_TAG: Partial<Record<DateInfo['kind'], string>> = { feriado: 'Feriado', evento: 'Evento', vespera: 'Véspera', fim_de_semana: 'Fim de semana' };
/** Largura de célula a partir da qual o tipo de data aparece escrito (senão, só uma marca colorida). */
const TAG_TEXT_MIN_CELL = 84;

/**
 * Mês em grade de 7 colunas (Flexbox com quebra de linha, sem CSS Grid).
 * A cor de cada dia mostra o nível de preço do mercado, sempre com o texto do preço e do tipo de data junto.
 */
export function CalendarMonth({ month, cells, selected, onSelect, onChangeMonth, minMonth, maxMonth }: Props) {
  const { colors } = useTheme();
  const [gridWidth, setGridWidth] = useState(0);
  const showTagText = gridWidth / 7 >= TAG_TEXT_MIN_CELL;
  const levelBg = [colors.level0, colors.level1, colors.level2, colors.level3];
  const levelInk = [colors.levelInk0, colors.levelInk1, colors.levelInk2, colors.levelInk3];
  const first = monthStart(month);
  const leading = weekdayOf(first);
  const total = daysInMonth(month);
  const days = Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const trailing = (7 - ((leading + total) % 7)) % 7;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          label="Mês anterior"
          disabled={!!minMonth && month <= minMonth}
          onPress={() => onChangeMonth(shiftMonth(month, -1))}
        />
        <AppText variant="title">{formatMonth(month)}</AppText>
        <IconButton
          icon="chevron-forward"
          label="Próximo mês"
          disabled={!!maxMonth && month >= maxMonth}
          onPress={() => onChangeMonth(shiftMonth(month, 1))}
        />
      </View>

      <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {WEEKDAY_SHORT.map((w) => (
          <View key={w} style={styles.cellBox}>
            <AppText variant="caption" muted style={styles.center}>
              {w}
            </AppText>
          </View>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <View key={`lead-${i}`} style={styles.cellBox} />
        ))}
        {days.map((date) => {
          const cell = cells[date];
          const isSelected = date === selected;
          const bg = cell?.level !== null && cell?.level !== undefined ? levelBg[cell.level] : colors.surfaceMuted;
          const tag = cell?.suspected ? 'Evento?' : cell ? SHORT_TAG[cell.info.kind] : undefined;
          const eventLike = cell?.suspected || cell?.info.kind === 'evento';
          return (
            <View key={date} style={styles.cellBox}>
              <Pressable
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={describeCell(date, cell)}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: bg,
                    borderColor: isSelected ? colors.ink : 'rgba(18,22,29,0.08)',
                    borderWidth: isSelected ? 3 : 1,
                    // A borda grossa da seleção desconta do espaçamento interno: o conteúdo não perde largura
                    // (antes o preço virava "5…" no dia selecionado, no celular).
                    padding: isSelected ? 4 : 6,
                    opacity: cell?.past ? 0.55 : pressed ? 0.8 : 1,
                  },
                ]}>
                <View style={[styles.cellTop, !showTagText && styles.cellTopStacked]}>
                  <AppText variant="strong" color={colors.levelText}>
                    {Number(date.slice(8))}
                  </AppText>
                  {cell?.price ? (
                    <AppText
                      variant="caption"
                      color={cell.past || cell.level === null ? colors.textMuted : levelInk[cell.level]}
                      numberOfLines={1}
                      style={styles.price}>
                      {/* Dia que já passou: mostra o preço registrado, em cinza (antes vinha "histórico", que cortava no celular). */}
                      {cell.price}
                    </AppText>
                  ) : null}
                </View>
                {tag && showTagText ? (
                  <View
                    style={[
                      styles.tagPill,
                      {
                        backgroundColor: eventLike ? colors.eventBg : cell?.info.kind === 'fim_de_semana' ? colors.card : colors.warningBg,
                      },
                    ]}>
                    <AppText
                      variant="caption"
                      numberOfLines={1}
                      color={eventLike ? colors.event : cell?.info.kind === 'fim_de_semana' ? colors.infoText : colors.warningText}
                      style={styles.tagText}>
                      {cell?.info.kind === 'evento' && !cell.suspected ? (cell.info.name ?? tag) : tag}
                    </AppText>
                  </View>
                ) : tag && cell?.info.kind !== 'fim_de_semana' ? (
                  <View style={[styles.tagMark, { backgroundColor: eventLike ? colors.event : colors.pricier }]} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
        {Array.from({ length: trailing }, (_, i) => (
          <View key={`trail-${i}`} style={styles.cellBox} />
        ))}
      </View>

      <View style={styles.legend}>
        <AppText variant="caption" style={styles.price}>
          Preço do mercado (mediana, R$):
        </AppText>
        {([0, 1, 2, 3] as DemandLevel[]).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: levelBg[level], borderColor: colors.border }]} />
            <AppText variant="caption">{DEMAND_LABELS[level].toLowerCase()}</AppText>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.tagSwatch, { backgroundColor: colors.pricier }]} />
          <AppText variant="caption">feriado ou véspera</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tagSwatch, { backgroundColor: colors.event }]} />
          <AppText variant="caption">evento</AppText>
        </View>
      </View>
    </View>
  );
}

function describeCell(date: string, cell: CalendarCell | undefined): string {
  const day = Number(date.slice(8));
  if (!cell) return `Dia ${day}, sem dados`;
  const parts = [`Dia ${day}`];
  if (cell.level !== null) parts.push(`demanda ${DEMAND_LABELS[cell.level].toLowerCase()}`);
  if (cell.price) parts.push(`mediana R$ ${cell.price}`);
  if (cell.info.kind !== 'util') parts.push(cell.info.name ? `${cell.info.label}: ${cell.info.name}` : cell.info.label);
  if (cell.suspected) parts.push('possível evento');
  if (cell.past) parts.push('dia passado');
  return parts.join(', ');
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: colors.inputBorder, backgroundColor: colors.card, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // 7 colunas: cada caixa ocupa 1/7 da largura.
  cellBox: { width: '14.2857%', padding: 3 },
  cell: { minHeight: 64, borderRadius: radius.md, padding: 6, gap: 4, justifyContent: 'space-between' },
  cellTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 },
  cellTopStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  price: { fontFamily: 'Inter_700Bold' },
  tagPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1, maxWidth: '100%' },
  tagText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  center: { textAlign: 'center' },
  tagMark: { height: 4, borderRadius: 2, marginTop: 'auto' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 16, height: 12, borderRadius: 3, borderWidth: 1 },
  tagSwatch: { width: 14, height: 4, borderRadius: 2 },
  iconButton: { width: touchTarget, height: touchTarget, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

});
