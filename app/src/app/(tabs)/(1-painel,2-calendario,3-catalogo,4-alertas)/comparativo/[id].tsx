import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { DateTypeTag } from '@/components/DateTypeTag';
import { DiffChip } from '@/components/DiffChip';
import { PageHeader } from '@/components/PageHeader';
import { RangeChart, type RangeColumn } from '@/components/RangeChart';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { useAuth } from '@/context/AuthContext';
import { useHotelsData } from '@/context/HotelsContext';
import { registerDecision, useDecisions } from '@/data/decisions';
import { dateRange, formatKey, formatKeyShort, formatKeyWithWeekday, WEEKDAY_SHORT, weekdayOf } from '@/lib/dates';
import { firestoreErrorMessage } from '@/lib/firestore';
import { formatBRL, formatBRLShort, formatDayMonth, formatFullDateTime, formatPct } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  dateInfo,
  isSpecial,
  marketFor,
  priceEvolution,
  rateFor,
  suggestionLabel,
  suggestPrice,
  type StayRate,
} from '@/lib/market';
import { diffPct } from '@/lib/pricing';
import { breakpoints, fonts, layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { DecisionChoice, Property } from '@/types';

type Period = '7' | '14' | '30';

/**
 * Comparativo por data de uma unidade: preços dos concorrentes noite a noite,
 * faixa do mercado, sugestão de preço explicada e registro da decisão.
 */
export default function ComparativoScreen() {
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.wide;
  const { user } = useAuth();
  const { hotels, today, loading, error, rateIndex, checksByHotel, ratesLoading, holidays, events } = useHotelsData();
  const [period, setPeriod] = useState<Period>(() => {
    if (!data || data <= dateRange(today, 7)[6]) return '7';
    return data <= dateRange(today, 14)[13] ? '14' : '30';
  });
  const [selectedState, setSelected] = useState<string | null>(data ?? null);
  const [saving, setSaving] = useState<DecisionChoice | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const decisions = useDecisions(id, today);

  const hotel = hotels.find((h) => h.id === id);
  const dates = useMemo(() => dateRange(today, Number(period)), [today, period]);

  const rows = useMemo(() => {
    if (!hotel) return [];
    return dates.map((date) => {
      const market = marketFor(hotel, date, rateIndex);
      const info = dateInfo(date, hotel.city, holidays, events);
      return { date, market, info, suggestion: suggestPrice(market, info, hotel.floorPrice) };
    });
  }, [hotel, dates, rateIndex, holidays, events]);

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;
  if (!hotel) return <StateView kind="error" message="Hotel não encontrado. Ele pode ter sido removido." />;

  // Data escolhida: a do parâmetro, senão o primeiro feriado/evento do período, senão hoje.
  const selected =
    selectedState && dates.includes(selectedState)
      ? selectedState
      : (rows.find((r) => isSpecial(r.info))?.date ?? dates[0]);
  const current = rows.find((r) => r.date === selected) ?? rows[0];
  const { market, info, suggestion } = current;
  const decision = decisions.latestFor(selected);
  const checks = checksByHotel[hotel.id] ?? [];

  const columns: RangeColumn[] = rows.map((r) => ({
    date: r.date,
    day: r.date.slice(8),
    weekday: WEEKDAY_SHORT[weekdayOf(r.date)],
    min: r.market.min,
    median: r.market.median,
    max: r.market.max,
    own: r.market.ownPrice,
    special: isSpecial(r.info),
  }));
  const hasRates = rows.some((r) => r.market.median !== null || r.market.ownPrice !== null);

  async function decide(choice: DecisionChoice) {
    setFeedback(null);
    setSaving(choice);
    try {
      await registerDecision(
        hotel!.id,
        { stayDate: selected, choice, low: suggestion.low, high: suggestion.high, ownPrice: market.ownPrice },
        user?.email ?? undefined,
      );
      hapticSuccess();
      setFeedback({
        kind: 'success',
        message:
          choice === 'aplicar'
            ? 'Decisão registrada. O app não altera preços nos canais de venda: aplique no Booking e no site.'
            : 'Sugestão ignorada para esta data. A escolha fica registrada no histórico.',
      });
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSaving(null);
    }
  }

  const selectDate = (date: string) => {
    setSelected(date);
    setFeedback(null);
  };

  const today0 = rows[0];
  const gapLabel =
    suggestion.gapPct !== null
      ? `${formatBRL(market.ownPrice ?? 0)} (${formatPct(Math.abs(suggestion.gapPct)).replace('+', '')} ${suggestion.gapPct < 0 ? 'abaixo' : 'acima'} da mediana)`
      : market.own?.status === 'sold_out'
        ? 'esgotada'
        : market.ownPrice !== null
          ? formatBRL(market.ownPrice) // há diária, mas não há mediana (ex.: concorrentes esgotados)
          : 'sem preço registrado';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Comparativo' }} />

      <PageHeader
        // No celular a barra do topo já diz "Comparativo": o título fica só com o nome do hotel.
        title={wide ? `Comparativo — ${hotel.own.name}` : hotel.own.name}
        subtitle={[hotel.city, `${hotel.competitors.length} concorrentes`, '1 quarto, 2 adultos'].filter(Boolean).join(' · ')}
        right={
          <SegmentedFilter
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7', label: '7 dias' },
              { value: '14', label: '14 dias' },
              { value: '30', label: '30 dias' },
            ]}
          />
        }
      />

      <Chips
        label="Unidade"
        scroll
        value={hotel.id}
        onChange={(value) => {
          setFeedback(null);
          router.setParams({ id: value, data: selected });
        }}
        options={hotels.map((h) => ({ value: h.id, label: h.own.name }))}
      />

      {ratesLoading && <StateView kind="loading" message="Carregando tarifas..." />}
      {!ratesLoading && !hasRates && (
        <Card title="Sem tarifas para as próximas noites">
          <AppText variant="body">
            Registre o preço da unidade e dos concorrentes para datas futuras, ou carregue os dados de exemplo na aba Conta.
          </AppText>
          <Button title="Registrar tarifa" onPress={() => router.push({ pathname: '/leitura/[id]', params: { id: hotel.id, data: selected } })} />
        </Card>
      )}

      {hasRates && (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="title">
                Preços para {formatKey(selected)} ({WEEKDAY_SHORT[weekdayOf(selected)]}
                {info.kind !== 'util' ? `, ${info.label.toLowerCase()}` : ''})
              </AppText>
              <Button
                title="Registrar tarifa desta data"
                variant="secondary"
                onPress={() => router.push({ pathname: '/leitura/[id]', params: { id: hotel.id, data: selected } })}
              />
            </View>
            <View style={styles.priceCards}>
              <PriceCard property={hotel.own} rate={rateFor(rateIndex, hotel.own.id, selected)} own ownPrice={market.ownPrice} />
              {hotel.competitors.map((c) => (
                <PriceCard key={c.id} property={c} rate={rateFor(rateIndex, c.id, selected)} ownPrice={market.ownPrice} />
              ))}
            </View>
          </View>

          <Card title="Sua diária × faixa do mercado" subtitle="Toque numa coluna para escolher a data.">
            <RangeChart
              columns={columns}
              selected={selected}
              onSelect={selectDate}
              accessibilityLabel={`Gráfico de ${period} dias com a faixa de preço dos concorrentes, a mediana e a diária de ${hotel.own.name}.`}
            />
          </Card>

          <View style={[styles.bottom, !wide && styles.stacked]}>
            <Card title="Detalhe por data" style={[styles.tableCard, !wide && styles.stackedItem]}>
              {wide && (
                <View style={[styles.tr, styles.thead, { borderBottomColor: colors.border }]}>
                  {['Data', 'Tipo de data', 'Sua diária', 'Mín.', 'Mediana', 'Máx.', 'Esgotados', 'Faixa sugerida'].map((h, i) => (
                    <AppText key={h} variant="caption" muted style={[styles.td, COLS[i], i >= 2 && i <= 5 ? styles.num : i === 6 ? styles.center : null]}>
                      {h}
                    </AppText>
                  ))}
                </View>
              )}
              {rows.map((r) => {
                const isSelected = r.date === selected;
                const own = r.market.ownPrice !== null ? formatBRLShort(r.market.ownPrice) : r.market.own?.status === 'sold_out' ? 'esgotada' : '—';
                const sug = r.suggestion.action === 'manter' ? 'manter' : r.suggestion.low !== null && r.suggestion.high !== null ? `${formatBRLShort(r.suggestion.low)} a ${formatBRLShort(r.suggestion.high)}` : '—';
                return (
                  <Pressable
                    key={r.date}
                    onPress={() => selectDate(r.date)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${formatKey(r.date)}: ${suggestionLabel(r.suggestion)}`}
                    style={({ pressed }) => [
                      wide ? styles.tr : styles.mobileRow,
                      { borderBottomColor: colors.border, backgroundColor: isSelected ? colors.infoBg : pressed ? colors.surfaceMuted : 'transparent' },
                    ]}>
                    {wide ? (
                      <>
                        <AppText variant="label" style={[styles.td, COLS[0], styles.semibold]}>
                          {formatKeyShort(r.date)} <AppText variant="label" muted>{WEEKDAY_SHORT[weekdayOf(r.date)]}</AppText>
                        </AppText>
                        <View style={[styles.td, COLS[1]]}>
                          <DateTypeTag info={r.info} />
                        </View>
                        <AppText variant="label" color={colors.primary} style={[styles.td, COLS[2], styles.num, styles.semibold]}>
                          {own}
                        </AppText>
                        <AppText variant="label" style={[styles.td, COLS[3], styles.num]}>{r.market.min !== null ? formatBRLShort(r.market.min) : '—'}</AppText>
                        <AppText variant="label" style={[styles.td, COLS[4], styles.num, styles.semibold]}>{r.market.median !== null ? formatBRLShort(r.market.median) : '—'}</AppText>
                        <AppText variant="label" style={[styles.td, COLS[5], styles.num]}>{r.market.max !== null ? formatBRLShort(r.market.max) : '—'}</AppText>
                        <AppText variant="label" style={[styles.td, COLS[6], styles.center]}>
                          {r.market.soldOut} de {r.market.competitorCount}
                        </AppText>
                        <AppText
                          variant="label"
                          color={r.suggestion.action === 'subir' ? colors.pricier : r.suggestion.action === 'baixar' ? colors.cheaper : colors.text}
                          style={[styles.td, COLS[7]]}>
                          {sug}
                        </AppText>
                      </>
                    ) : (
                      <>
                        <View style={styles.rowTop}>
                          <AppText variant="label" style={styles.semibold}>
                            {formatKeyShort(r.date)} {WEEKDAY_SHORT[weekdayOf(r.date)]}
                          </AppText>
                          <DateTypeTag info={r.info} />
                        </View>
                        <AppText variant="caption">
                          Sua: {own} · Mediana: {r.market.median !== null ? formatBRLShort(r.market.median) : '—'} · Faixa:{' '}
                          {r.market.min !== null && r.market.max !== null ? `${formatBRLShort(r.market.min)} a ${formatBRLShort(r.market.max)}` : '—'} · Esgotados:{' '}
                          {r.market.soldOut} de {r.market.competitorCount}
                        </AppText>
                        <AppText
                          variant="label"
                          color={r.suggestion.action === 'subir' ? colors.pricier : r.suggestion.action === 'baixar' ? colors.cheaper : colors.text}
                          style={styles.semibold}>
                          {suggestionLabel(r.suggestion)}
                        </AppText>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </Card>

            <Card emphasis eyebrow={`Sugestão de preço · ${formatKey(selected)}`} style={[styles.aside, !wide && styles.stackedItem]}>
              <View>
                <AppText variant="priceMd" style={styles.bigPrice}>
                  {suggestion.low !== null && suggestion.high !== null
                    ? `${formatBRLShort(suggestion.low)} a ${formatBRLShort(suggestion.high)}`
                    : '—'}
                </AppText>
                <AppText variant="body" muted>
                  {selected === today0.date ? 'Hoje' : 'Sua diária'}: {gapLabel}
                </AppText>
              </View>
              <View style={styles.reasons}>
                <AppText variant="strong">Por que essa faixa</AppText>
                {suggestion.reasons.map((reason) => (
                  <View key={reason} style={styles.bulletRow}>
                    <AppText variant="body" muted style={styles.bullet}>
                      •
                    </AppText>
                    <AppText variant="body" color={colors.textMuted} style={styles.flex}>
                      {reason}
                    </AppText>
                  </View>
                ))}
              </View>

              <Evolution hotelCompetitors={hotel.competitors} checks={checks} date={selected} />

              {decision && (
                <View style={[styles.decision, { backgroundColor: colors.infoBg }]} accessibilityRole="text">
                  <AppText variant="label" color={colors.infoText} style={styles.semibold}>
                    {decision.choice === 'aplicar' ? 'Decisão registrada' : 'Sugestão ignorada'} em {formatFullDateTime(decision.decidedAt)}.
                    {decision.choice === 'aplicar' ? ' O app não altera preços nos canais: aplique no Booking e no site.' : ''}
                  </AppText>
                </View>
              )}
              {decisions.error && <Banner kind="error" message={decisions.error} />}
              {feedback && <Banner kind={feedback.kind} message={feedback.message} />}

              {suggestion.action !== 'sem_dados' && suggestion.action !== 'esgotado' && (
                <View style={styles.actions}>
                  <View style={styles.action}>
                    <Button title="Registrar decisão" onPress={() => decide('aplicar')} loading={saving === 'aplicar'} disabled={!!saving} />
                  </View>
                  <View style={styles.action}>
                    <Button title="Ignorar" variant="secondary" onPress={() => decide('ignorar')} loading={saving === 'ignorar'} disabled={!!saving} />
                  </View>
                </View>
              )}
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

/** Larguras das colunas da tabela (telas largas). */
const COLS = [{ flex: 1.1 }, { flex: 1.6 }, { flex: 1 }, { flex: 0.8 }, { flex: 0.9 }, { flex: 0.8 }, { flex: 0.9 }, { flex: 1.4 }];

/** Cartão de preço de uma propriedade para a data escolhida, como os cartões de hotel do mockup. */
function PriceCard({ property, rate, own, ownPrice }: { property: Property; rate: StayRate | null; own?: boolean; ownPrice: number | null }) {
  const { colors } = useTheme();
  const price = rate?.status === 'ok' ? rate.price : null;
  const soldOut = rate?.status === 'sold_out';
  const tag = own ? 'Seu hotel' : soldOut ? 'Esgotado' : 'Concorrente';
  const tagColor = own ? colors.primary : soldOut ? colors.pricier : colors.aligned;
  return (
    <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: own ? colors.primary : colors.border, borderWidth: own ? 2 : 1 }]}>
      <View style={[styles.tag, { backgroundColor: tagColor }]}>
        <AppText variant="caption" color="#FFFFFF" style={styles.tagText}>
          {tag}
        </AppText>
      </View>
      <AppText variant="strong" numberOfLines={2}>
        {property.name}
      </AppText>
      <View style={styles.priceLine}>
        <AppText variant="priceSm" color={soldOut ? colors.pricier : own ? colors.primary : price === null ? colors.textMuted : colors.text}>
          {soldOut ? 'Esgotado' : price !== null ? formatBRLShort(price) : 'Sem leitura'}
        </AppText>
        {!own && price !== null && ownPrice !== null && (
          <View style={styles.vsRow}>
            <DiffChip pct={diffPct(price, ownPrice)} size="sm" />
          </View>
        )}
      </View>
      {!own && price !== null && ownPrice !== null && (
        <AppText variant="caption" muted>
          vs. seu hotel
        </AppText>
      )}
    </View>
  );
}

/** Como cada concorrente mexeu no preço para a data, coleta a coleta. */
function Evolution({ hotelCompetitors, checks, date }: { hotelCompetitors: Property[]; checks: Parameters<typeof priceEvolution>[0]; date: string }) {
  const { colors } = useTheme();
  const series = hotelCompetitors
    .map((c) => ({ c, points: priceEvolution(checks, c.id, date) }))
    .filter((s) => s.points.length > 1);
  if (!series.length) return null;
  return (
    <View style={[styles.evolution, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="label" style={styles.semibold}>
        Como os concorrentes mexeram no preço para {formatKeyShort(date)}
      </AppText>
      {series.map(({ c, points }) => (
        <View key={c.id} style={styles.evoRow}>
          <AppText variant="caption" muted>
            {c.name}
          </AppText>
          <View style={styles.evoPoints}>
            {points.map((p) => (
              <View key={`${p.checkedAt}-${p.price}`} style={styles.evoPoint}>
                <AppText variant="caption" muted>
                  {formatDayMonth(p.checkedAt)}
                </AppText>
                <AppText variant="label" style={styles.semibold}>
                  {p.status === 'sold_out' ? 'esgot.' : formatBRLShort(p.price ?? 0)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg + 4, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  num: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  center: { textAlign: 'center' },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  priceCards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  priceCard: { flexGrow: 1, flexBasis: 200, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tagText: { fontFamily: fonts.bold, fontSize: 11 },
  priceLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // Celular/tela estreita: colunas uma embaixo da outra, em largura total (no iPhone o flexWrap espremia lado a lado).
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  stackedItem: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, width: '100%' },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.lg + 4 },
  tableCard: { flexGrow: 999, flexShrink: 1, flexBasis: 640, minWidth: 0 },
  aside: { flexGrow: 1, flexShrink: 1, flexBasis: 340, minWidth: 0 },
  thead: { borderBottomWidth: 1, paddingBottom: spacing.sm },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, minHeight: 44, borderRadius: 0 },
  td: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  mobileRow: { borderBottomWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: spacing.xs },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  bigPrice: { fontSize: 30 },
  reasons: { gap: spacing.xs + 2 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { width: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, flexBasis: 140 },
  decision: { borderRadius: radius.md, padding: spacing.md },
  evolution: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  evoRow: { gap: spacing.xs },
  evoPoints: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  evoPoint: { alignItems: 'center' },
});

