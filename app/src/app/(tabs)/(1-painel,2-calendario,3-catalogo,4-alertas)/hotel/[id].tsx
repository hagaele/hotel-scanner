import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { highlightPct } from '@/lib/alerts';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { DiffChip } from '@/components/DiffChip';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { PageHeader } from '@/components/PageHeader';
import { PriceRow } from '@/components/PriceRow';
import { StateView } from '@/components/StateView';
import { deleteHotel, hotelsLinkedTo, competitorKeyOf, removeCompetitorLink } from '@/data/hotelsRepository';
import { useHotelHistory } from '@/data/useHotelHistory';
import { useHotels } from '@/data/useHotels';
import { confirmAction } from '@/lib/confirm';
import { firestoreErrorMessage } from '@/lib/firestore';
import { formatBRL } from '@/lib/format';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { MAX_COMPETITORS } from '@/lib/hotelForm';
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const { colors } = useTheme();
  const history = useHotelHistory(id);

  // Recurso nativo: ao abrir um hotel em destaque, o aparelho dá um aviso tátil.
  const current = hotels.find((h) => h.id === id);
  const isHighlighted = current ? summarizeHotel(current, highlightPct(client), now).highlighted : false;
  useEffect(() => {
    if (isHighlighted) hapticWarning();
  }, [isHighlighted, id]);

  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;

  const hotel = hotels.find((h) => h.id === id);
  if (!hotel) {
    return deleting ? (
      <StateView kind="loading" message="Removendo hotel..." />
    ) : (
      <StateView kind="error" message="Hotel não encontrado. Ele pode ter sido removido." />
    );
  }

  const summary = summarizeHotel(hotel, highlightPct(client), now);
  const ownState = priceState(hotel.own, now);
  const ownPrice = ownState === 'ok' ? hotel.own.latest.price : null;
  const chart = buildHistoryChart(history.checks, hotel.own, hotel.competitors, now);

  async function handleDelete() {
    const confirmed = await confirmAction(
      `Remover ${hotel!.own.name}?`,
      'O hotel sai do painel com os vínculos dos concorrentes dele. Concorrentes vinculados a outros hotéis da rede continuam lá. O histórico de leituras é preservado no banco.',
      'Remover',
    );
    if (!confirmed) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteHotel(hotel!.id);
      hapticSuccess();
      // Volta à base da pilha desta aba (painel, calendário, catálogo ou alertas).
      if (router.canDismiss()) router.dismissAll();
      else router.replace('/');
    } catch (e) {
      setDeleteError(firestoreErrorMessage(e));
      setDeleting(false);
    }
  }

  async function handleRemoveLink(competitorId: string, name: string, others: number) {
    const confirmed = await confirmAction(
      `Remover ${name} deste hotel?`,
      others > 0
        ? `Só o vínculo com ${hotel!.own.name} é desfeito. ${name} continua como concorrente de ${others} ${others === 1 ? 'outro hotel' : 'outros hotéis'} da rede. O histórico é preservado.`
        : `${name} deixa de ser comparado com ${hotel!.own.name}. O histórico de leituras é preservado no banco.`,
      'Remover',
    );
    if (!confirmed) return;
    setLinkMessage(null);
    setRemovingId(competitorId);
    try {
      await removeCompetitorLink(hotel!.id, competitorId);
      hapticSuccess();
      setLinkMessage({ kind: 'success', message: `${name} removido deste hotel.` });
    } catch (e) {
      setLinkMessage({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setRemovingId(null);
    }
  }

  const editItem = (propertyId: string) =>
    router.push({ pathname: '/hotel/editar/[id]', params: { id: hotel.id, propriedade: propertyId } });
  const busy = deleting || removingId !== null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: hotel.own.name }} />
      <PageHeader
        title={hotel.own.name}
        subtitle={[hotel.city, hotel.floorPrice ? `preço-piso ${formatBRL(hotel.floorPrice)}` : null, 'diária de hoje'].filter(Boolean).join(' · ')}
      />

      {summary.competitorAvg !== null && (
        <View style={styles.avgRow}>
          <AppText variant="label" muted>
            Média dos concorrentes: {formatBRL(summary.competitorAvg)}
          </AppText>
          {summary.diffPct !== null && <DiffChip pct={summary.diffPct} solid={summary.highlighted} />}
        </View>
      )}

      <PriceRow property={hotel.own} state={ownState} own />

      {hotel.competitors.length === 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText variant="title">Sem concorrentes ainda</AppText>
          <AppText variant="caption" muted>
            Vincule até {MAX_COMPETITORS} concorrentes para comparar o preço deste hotel e receber sugestões.
          </AppText>
        </View>
      )}

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

      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="title">Cadastro</AppText>
        <AppText variant="caption" muted>
          Edite ou remova um item por vez. {hotel.competitors.length} de {MAX_COMPETITORS} concorrentes.
        </AppText>
        <View style={[styles.itemRow, { borderTopColor: colors.border }]}>
          <View style={styles.itemName}>
            <AppText variant="eyebrow" color={colors.primary}>
              Seu hotel
            </AppText>
            <AppText variant="label" numberOfLines={1}>
              {hotel.own.name}
            </AppText>
          </View>
          <View style={styles.itemActions}>
            <Button title="Editar" variant="secondary" onPress={() => editItem(hotel.own.id)} disabled={busy} />
          </View>
        </View>
        {hotel.competitors.map((competitor) => {
          const others = hotelsLinkedTo(hotels, competitorKeyOf(competitor)).filter((h) => h.id !== hotel.id);
          return (
            <View key={competitor.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
              <View style={styles.itemName}>
                <AppText variant="eyebrow" muted numberOfLines={1}>
                  {others.length > 0 ? `Concorrente · também de ${others.map((h) => h.own.name).join(', ')}` : 'Concorrente'}
                </AppText>
                <AppText variant="label" numberOfLines={1}>
                  {competitor.name}
                </AppText>
              </View>
              <View style={styles.itemActions}>
                <Button title="Editar" variant="secondary" onPress={() => editItem(competitor.id)} disabled={busy} />
                <Button
                  title="Remover"
                  variant="danger"
                  onPress={() => handleRemoveLink(competitor.id, competitor.name, others.length)}
                  loading={removingId === competitor.id}
                  disabled={busy && removingId !== competitor.id}
                />
              </View>
            </View>
          );
        })}
        {hotel.competitors.length < MAX_COMPETITORS && (
          <Button
            title={`+ Adicionar concorrente (${hotel.competitors.length} de ${MAX_COMPETITORS})`}
            variant="link"
            onPress={() => router.push({ pathname: '/hotel/novo', params: { tipo: 'concorrente', hotel: hotel.id } })}
            disabled={busy}
          />
        )}
        {linkMessage && <Banner kind={linkMessage.kind} message={linkMessage.message} />}
      </View>

      <View style={styles.actions}>
        <Button
          title="Comparativo por data e sugestão de preço"
          onPress={() => router.push({ pathname: '/comparativo/[id]', params: { id: hotel.id } })}
          disabled={deleting}
        />
        <Button
          title="Registrar leitura de preço"
          variant="secondary"
          onPress={() => router.push({ pathname: '/leitura/[id]', params: { id: hotel.id } })}
          disabled={deleting}
        />
        <Button title="Remover hotel" variant="danger" onPress={handleDelete} loading={deleting} />
        {deleteError && <Banner kind="error" message={deleteError} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 960, width: '100%', alignSelf: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  chartCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg + 4, gap: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  itemName: { flex: 1, minWidth: 160, gap: 2 },
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  avgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});

