import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { HotelList } from '@/components/HotelList';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { useHotels } from '@/data/useHotels';
import { formatTime } from '@/lib/format';
import { countSummary, nextUpdateLabel, sortForDashboard, summarizeHotel } from '@/lib/pricing';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Filter = 'all' | 'highlighted';

/** Painel: um cartão por hotel próprio, com resumo e filtro. */
export default function PainelScreen() {
  const { colors } = useTheme();
  const { client, hotels, now, loading, error } = useHotels();
  const [filter, setFilter] = useState<Filter>('all');

  const summaries = useMemo(
    () => sortForDashboard(hotels.map((h) => summarizeHotel(h, client.alertThresholdPct, now))),
    [hotels, client.alertThresholdPct, now],
  );
  const counts = useMemo(() => countSummary(summaries), [summaries]);
  const visible = filter === 'all' ? summaries : summaries.filter((s) => s.highlighted);

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

  const lastCheck = hotels
    .map((h) => h.own.latest.checkedAt)
    .filter((c): c is string => c !== null)
    .sort()
    .at(-1);

  const header = (
    <View style={styles.header}>
      <View>
        <AppText variant="titleLg">{client.name}</AppText>
        <AppText variant="label" muted>
          {lastCheck ? `Atualizado às ${formatTime(lastCheck)} · ` : ''}
          {nextUpdateLabel(now)}
        </AppText>
      </View>

      <View style={styles.summary}>
        <SummaryTile label="Acima da média" value={counts.above} color={colors.pricier} symbol="▲" />
        <SummaryTile label="Abaixo da média" value={counts.below} color={colors.cheaper} symbol="▼" />
        <SummaryTile label="Em destaque" value={counts.highlighted} color={colors.text} />
      </View>

      <View style={styles.toolbar}>
        <SegmentedFilter
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'highlighted', label: 'Só em destaque' },
          ]}
        />
        <Button title="+ Novo hotel" variant="secondary" onPress={() => router.push('/hotel/novo')} />
      </View>
    </View>
  );

  return <HotelList summaries={visible} header={header} emptyMessage="Nenhum hotel em destaque agora" />;
}

function SummaryTile(props: { label: string; value: number; color: string; symbol?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppText variant="priceSm" color={props.color}>
        {props.symbol ? `${props.symbol} ` : ''}
        {props.value}
      </AppText>
      <AppText variant="caption" muted>
        {props.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg, marginBottom: spacing.xs },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  empty: { flex: 1, padding: spacing.xl, gap: spacing.lg, justifyContent: 'center' },
  summary: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
});
