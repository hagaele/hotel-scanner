import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { highlightPct } from '@/lib/alerts';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { HotelList } from '@/components/HotelList';
import { KpiTile } from '@/components/KpiTile';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { TextField } from '@/components/TextField';
import { useHotelsData } from '@/context/HotelsContext';
import { dateRange, formatKey, formatKeyShort, WEEKDAY_LONG, weekdayOf } from '@/lib/dates';
import { formatBRLShort, formatPct, plural } from '@/lib/format';
import {
  ALIGNED_PCT,
  cityOf,
  citiesOf,
  dateInfo,
  marketFromLatest,
  nextSpecialDate,
  suggestionLabel,
  suggestPrice,
} from '@/lib/market';
import { countSummary, nextUpdateLabel, sortForDashboard, summarizeHotel, type HotelSummary } from '@/lib/pricing';
import { breakpoints, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Filter = 'all' | 'highlighted';
const ALL = '__todas__';
/** Janela usada para procurar o próximo feriado ou evento. */
const LOOKAHEAD_DAYS = 30;
const SIDEBAR_WIDTH = 260;

const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Visão geral da rede, no layout do mockup: indicadores, cartão do próximo feriado ou evento,
 * filtro por localização e um cartão por unidade. Em telas largas, a lista "Suas unidades" fica na lateral.
 */
export default function VisaoGeralScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { client, hotels, now, today, loading, error, rateIndex, holidays, events } = useHotelsData();
  const [filter, setFilter] = useState<Filter>('all');
  const [city, setCity] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const wide = width >= breakpoints.wide;

  const summaries = useMemo(
    () => sortForDashboard(hotels.map((h) => summarizeHotel(h, highlightPct(client), now))),
    [hotels, client, now],
  );
  const special = useMemo(
    () => nextSpecialDate(hotels, dateRange(today, LOOKAHEAD_DAYS), rateIndex, holidays, events),
    [hotels, today, rateIndex, holidays, events],
  );

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;
  if (hotels.length === 0) {
    return (
      <View style={styles.empty}>
        <StateView
          kind="empty"
          message="Nenhum hotel cadastrado ainda. Cadastre o primeiro ou carregue os dados de exemplo na aba Conta."
        />
        <Button title="Cadastrar hotel" onPress={() => router.push('/hotel/novo')} />
      </View>
    );
  }

  const text = normalize(search);
  const byCity = summaries.filter(
    (s) => (city === ALL || cityOf(s.hotel) === city) && (!text || normalize(`${s.hotel.own.name} ${cityOf(s.hotel)}`).includes(text)),
  );
  const visible = filter === 'all' ? byCity : byCity.filter((s) => s.highlighted);
  const counts = countSummary(byCity);
  const kpis = networkKpis(byCity);

  const suggestionFor = (s: HotelSummary) => {
    const info = dateInfo(today, s.hotel.city, holidays, events);
    const suggestion = suggestPrice(marketFromLatest(s.hotel, now, today), info, s.hotel.floorPrice);
    return suggestion.action === 'sem_dados' ? undefined : suggestionLabel(suggestion);
  };

  const header = (
    <View style={styles.header}>
      <PageHeader
        title="Visão geral da rede"
        subtitle={`${client.name} · diária de hoje, 1 quarto, 2 adultos · ${nextUpdateLabel(now)}`}
      />

      {special && (
        <Card tone="warning" accessibilityLabel="Destaque do período">
          {/* Celular: ícone e texto numa linha, botão embaixo em largura total. */}
          <View style={[styles.highlight, !wide && styles.highlightStacked]}>
            <View style={styles.highlightMain}>
            <View style={[styles.highlightIcon, { backgroundColor: colors.warningBg }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.pricier} />
            </View>
            <View style={styles.highlightText}>
              <AppText variant="strong">
                {special.info.kind === 'feriado' ? 'Feriado' : 'Evento'} em {formatKey(special.date)} ({WEEKDAY_LONG[weekdayOf(special.date)]})
                {special.info.name ? ` — ${special.info.name}` : ''}
              </AppText>
              <AppText variant="body" color={colors.textMuted}>
                {[
                  special.risePct !== null ? `Mediana do mercado ${formatPct(special.risePct)} em relação a um dia comum.` : null,
                  special.soldOut > 0 ? `${special.soldOut} de ${special.competitorCount} concorrentes já esgotaram.` : null,
                  special.unitsToRaise.length
                    ? special.unitsToRaise.length === 1
                      ? '1 unidade sua segue com preço de dia comum.'
                      : `${special.unitsToRaise.length} unidades suas seguem com preço de dia comum.`
                    : special.risePct === null && special.soldOut === 0
                      ? 'Ainda não há preços de concorrentes para essa data. Registre leituras para ver a sugestão.'
                      : 'Suas unidades estão dentro da faixa sugerida.',
                ]
                  .filter(Boolean)
                  .join(' ')}
              </AppText>
            </View>
            </View>
            {special.unitsToRaise.length > 0 && (
              <Button
                title={`Ver sugestões para ${formatKeyShort(special.date)}`}
                variant="ink"
                onPress={() =>
                  router.push({ pathname: '/comparativo/[id]', params: { id: special.unitsToRaise[0].id, data: special.date } })
                }
              />
            )}
          </View>
        </Card>
      )}

      <View style={styles.kpis}>
        <KpiTile label="Diária média da rede" value={kpis.avgOwn !== null ? formatBRLShort(kpis.avgOwn) : '—'} hint="média das unidades com preço hoje" />
        <KpiTile label="Média do mercado" value={kpis.avgMarket !== null ? formatBRLShort(kpis.avgMarket) : '—'} hint="concorrentes selecionados" />
        <KpiTile
          label="Posição da rede"
          value={kpis.position !== null ? formatPct(kpis.position) : '—'}
          hint="frente à média do mercado"
          color={kpis.position === null ? undefined : kpis.position > 0 ? colors.pricier : colors.cheaper}
        />
        <KpiTile label="Unidades abaixo do mercado" value={`${counts.below} de ${byCity.length}`} hint={`${counts.above} acima · ${counts.highlighted} em destaque`} />
        <KpiTile
          label="Próxima data de pico"
          value={special ? formatKeyShort(special.date) : '—'}
          hint={special ? (special.info.name ?? special.info.label) : `nada nos próximos ${LOOKAHEAD_DAYS} dias`}
        />
      </View>

      {/* No celular, as localizações ficam numa linha própria abaixo do título (lado a lado, o título espremia as pílulas). */}
      <View style={[styles.sectionHead, !wide && styles.sectionHeadStacked]}>
        <AppText variant="title">Unidades frente ao mercado</AppText>
        <Chips
          label="Filtrar por localização"
          scroll={!wide}
          value={city}
          onChange={setCity}
          options={[{ value: ALL, label: 'Todas' }, ...citiesOf(hotels).map((c) => ({ value: c, label: c }))]}
        />
      </View>
      <View style={styles.toolbar}>
        <SegmentedFilter
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'highlighted', label: 'Só em destaque' },
          ]}
        />
        <Button title="+ Novo cadastro" variant="secondary" onPress={() => router.push('/hotel/novo')} />
      </View>
    </View>
  );

  const footer = (
    <AppText variant="caption" muted style={styles.footer}>
      Preços das leituras registradas no app. A comparação vale para ofertas equivalentes: mesmo tipo de quarto, café e política de
      cancelamento.
    </AppText>
  );

  const list = (
    <HotelList
      summaries={visible}
      header={header}
      footer={footer}
      availableWidth={wide ? width - SIDEBAR_WIDTH - spacing.xl : undefined}
      suggestionFor={suggestionFor}
      emptyMessage={filter === 'highlighted' ? 'Nenhuma unidade em destaque agora' : 'Nenhuma unidade com esse filtro'}
    />
  );

  if (!wide) return list;

  return (
    <View style={styles.split}>
      <ScrollView style={[styles.sidebar, { borderRightColor: colors.border }]} contentContainerStyle={styles.sidebarContent}>
        <Card>
          <View>
            <AppText variant="title">Suas unidades</AppText>
            <AppText variant="caption" muted>
              {plural(hotels.length, 'hotel', 'hotéis')} · {plural(citiesOf(hotels).length, 'localização', 'localizações')}
            </AppText>
          </View>
          <TextField label="Buscar unidade" value={search} onChangeText={setSearch} placeholder="Nome ou cidade" />
          <View style={styles.unitList}>
            {byCity.map((s) => (
              <UnitRow key={s.hotel.id} summary={s} />
            ))}
          </View>
          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            <LegendDot color={colors.cheaper} label="Abaixo do mercado" />
            <LegendDot color={colors.aligned} label={`Alinhado (±${ALIGNED_PCT}%)`} />
            <LegendDot color={colors.pricier} label="Acima do mercado" />
          </View>
        </Card>
      </ScrollView>
      <View style={styles.flex}>{list}</View>
    </View>
  );
}

/** Linha da lista lateral: bolinha da posição no mercado, nome, localização e diferença. */
function UnitRow({ summary }: { summary: HotelSummary }) {
  const { colors } = useTheme();
  const d = summary.diffPct;
  const competitors = summary.hotel.competitors;
  const allSoldOut = competitors.length > 0 && competitors.every((c) => c.latest.status === 'sold_out');
  const noCompare = allSoldOut ? 'concorrentes esgotados' : 'sem comparação';
  const dot = d === null ? colors.border : Math.abs(d) <= ALIGNED_PCT ? colors.aligned : d < 0 ? colors.cheaper : colors.pricier;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/comparativo/[id]', params: { id: summary.hotel.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${summary.hotel.own.name}, ${d !== null ? formatPct(d) : noCompare}`}
      style={({ pressed }) => [styles.unitRow, { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.flex}>
        <AppText variant="label" numberOfLines={1} style={styles.semibold}>
          {summary.hotel.own.name}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {cityOf(summary.hotel)}
        </AppText>
      </View>
      <AppText variant="caption" style={styles.semibold}>
        {d !== null ? formatPct(d) : allSoldOut ? 'Esgot.' : '—'}
      </AppText>
    </Pressable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

/** Indicadores da rede a partir dos resumos de hoje. */
function networkKpis(summaries: HotelSummary[]) {
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  // Diária média: todas as unidades com preço válido hoje, tenham ou não concorrentes com preço.
  const priced = summaries.filter((s) => s.state === 'ok' && s.hotel.own.latest.price !== null);
  const avgOwn = avg(priced.map((s) => s.hotel.own.latest.price as number));
  // Posição frente ao mercado: só as unidades comparáveis (com preço próprio e dos concorrentes).
  const compared = priced.filter((s) => s.diffPct !== null && s.competitorAvg !== null);
  const avgComparedOwn = avg(compared.map((s) => s.hotel.own.latest.price as number));
  const avgMarket = avg(compared.map((s) => s.competitorAvg as number));
  return {
    compared: compared.length,
    avgOwn,
    avgMarket,
    position: avgComparedOwn !== null && avgMarket !== null ? ((avgComparedOwn - avgMarket) / avgMarket) * 100 : null,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontFamily: 'Inter_600SemiBold' },
  header: { gap: spacing.lg + 4, marginBottom: spacing.xs },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  highlightStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md },
  highlightMain: { flexGrow: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  highlightIcon: { width: 40, height: 40, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  highlightText: { flex: 1, gap: 2 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionHeadStacked: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: spacing.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  footer: { marginTop: spacing.sm },
  empty: { flex: 1, padding: spacing.xl, gap: spacing.lg, justifyContent: 'center' },
  split: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, flexGrow: 0 },
  sidebarContent: { padding: spacing.xl, paddingRight: 0 },
  unitList: { gap: 2 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legend: { gap: spacing.xs + 2, borderTopWidth: 1, paddingTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
