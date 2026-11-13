import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { DiffChip } from '@/components/DiffChip';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { PriceRow } from '@/components/PriceRow';
import { StateView } from '@/components/StateView';
import { deleteHotel } from '@/data/hotelsRepository';
import { useHotelHistory } from '@/data/useHotelHistory';
import { useHotels } from '@/data/useHotels';
import { confirmAction } from '@/lib/confirm';
import { firestoreErrorMessage } from '@/lib/firestore';
import { formatBRL } from '@/lib/format';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { buildHistoryChart } from '@/lib/history';
import { diffPct, priceState, summarizeHotel } from '@/lib/pricing';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Detalhe: o hotel próprio comparado, linha a linha, com cada concorrente. */
export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client, hotels, now, loading, error } = useHotels();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { colors } = useTheme();
  const history = useHotelHistory(id);

  // Recurso nativo: ao abrir um hotel em destaque, o aparelho dá um aviso tátil.
  const current = hotels.find((h) => h.id === id);
  const isHighlighted = current ? summarizeHotel(current, client.alertThresholdPct, now).highlighted : false;
  useEffect(() => {
    if (isHighlighted) hapticWarning();
  }, [isHighlighted, id]);

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;

  const hotel = hotels.find((h) => h.id === id);
  if (!hotel) return <StateView kind="error" message="Hotel não encontrado." />;

  const summary = summarizeHotel(hotel, client.alertThresholdPct, now);
  const ownState = priceState(hotel.own, now);
  const ownPrice = ownState === 'ok' ? hotel.own.latest.price : null;
  const chart = buildHistoryChart(history.checks, hotel.own, hotel.competitors, now);

  async function handleDelete() {
    const confirmed = await confirmAction(
      `Remover ${hotel!.own.name}?`,
      'O hotel e os 3 concorrentes saem do painel. O histórico de leituras é preservado no banco.',
      'Remover',
    );
    if (!confirmed) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteHotel(hotel!.id);
      hapticSuccess();
      router.dismissTo('/');
    } catch (e) {
      setDeleteError(firestoreErrorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: hotel.own.name }} />

      {summary.competitorAvg !== null && (
        <View style={styles.avgRow}>
          <AppText variant="label" muted>
            Média dos concorrentes: {formatBRL(summary.competitorAvg)}
          </AppText>
          {summary.diffPct !== null && <DiffChip pct={summary.diffPct} solid={summary.highlighted} />}
        </View>
      )}

      <PriceRow property={hotel.own} state={ownState} own />

      {hotel.competitors.map((competitor) => {
        const state = priceState(competitor, now);
        const price = state === 'ok' ? competitor.latest.price : null;
        return (
          <PriceRow
            key={competitor.id}
            property={competitor}
            state={state}
            diffVsOwn={ownPrice !== null && price !== null ? diffPct(price, ownPrice) : null}
          />
        );
      })}

      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="title">Últimos 7 dias</AppText>
        <AppText variant="caption" muted>
          Último preço válido de cada dia.
        </AppText>
        {history.loading ? (
          <AppText variant="caption" muted>
            Carregando histórico...
          </AppText>
        ) : history.error ? (
          <Banner kind="error" message={history.error} />
        ) : chart.hasData ? (
          <PriceHistoryChart data={chart} />
        ) : (
          <AppText variant="caption" muted>
            Ainda não há leituras com preço nos últimos 7 dias. Registre uma leitura para começar o histórico.
          </AppText>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title="Registrar leitura de preço"
          onPress={() => router.push({ pathname: '/leitura/[id]', params: { id: hotel.id } })}
          disabled={deleting}
        />
        <Button
          title="Editar hotel"
          variant="secondary"
          onPress={() => router.push({ pathname: '/hotel/editar/[id]', params: { id: hotel.id } })}
          disabled={deleting}
        />
        <Button title="Remover hotel" variant="danger" onPress={handleDelete} loading={deleting} />
        {deleteError && <Banner kind="error" message={deleteError} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  chartCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  avgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
