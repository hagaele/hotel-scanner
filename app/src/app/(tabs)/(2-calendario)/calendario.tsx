import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CalendarMonth, type CalendarCell } from '@/components/CalendarMonth';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { DateTypeTag } from '@/components/DateTypeTag';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useHotelsData } from '@/context/HotelsContext';
import { addCalendarEvent, deleteCalendarEvent, dismissSuspectedDate } from '@/data/calendarRepository';
import { MAX_EVENT_NAME, validateEventForm, type EventFormValues } from '@/lib/calendarForm';
import { confirmAction } from '@/lib/confirm';
import { addDays, dateRange, daysInMonth, formatKey, formatKeyShort, formatKeyWithWeekday, monthOf } from '@/lib/dates';
import { firestoreErrorMessage } from '@/lib/firestore';
import { formatBRL } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  baselineFor,
  cityDay,
  cityOf,
  citiesOf,
  dateInfo,
  DEMAND_LABELS,
  detectSuspectedEvents,
  EVENT_RISE_PCT,
} from '@/lib/market';
import { MAX_STAY_DAYS_AHEAD } from '@/lib/readings';
import { breakpoints, layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Feedback = { kind: 'success' | 'error'; message: string } | null;
type Scope = 'praca' | 'rede';

/**
 * Calendário de sazonalidade por localização: cada dia com o nível de preço do mercado, feriados nacionais,
 * eventos e feriados locais cadastrados, datas suspeitas de evento e o cadastro de novos eventos.
 */
export default function CalendarioScreen() {
  const params = useLocalSearchParams<{ data?: string; praca?: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { hotels, today, loading, error, rateIndex, holidays, events } = useHotelsData();
  const cities = useMemo(() => citiesOf(hotels), [hotels]);
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.wide;

  const [city, setCity] = useState<string>(params.praca ?? '');
  const [month, setMonth] = useState(monthOf(params.data ?? today));
  const [selected, setSelected] = useState(params.data ?? today);
  const [form, setForm] = useState<{ name: string; kind: EventFormValues['kind']; scope: Scope }>({
    name: '',
    kind: 'evento',
    scope: 'praca',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Vindo de um alerta ("Abrir"): posiciona na data e na localização do alerta.
  useEffect(() => {
    if (params.data) {
      setSelected(params.data);
      setMonth(monthOf(params.data));
    }
    if (params.praca) setCity(params.praca);
  }, [params.data, params.praca]);

  const activeCity = city && cities.includes(city) ? city : (cities[0] ?? '');
  const cityHotels = useMemo(() => hotels.filter((h) => cityOf(h) === activeCity), [hotels, activeCity]);
  const ahead = useMemo(() => dateRange(today, MAX_STAY_DAYS_AHEAD + 1), [today]);
  const baseline = useMemo(() => baselineFor(cityHotels, ahead, rateIndex), [cityHotels, ahead, rateIndex]);

  const suspected = useMemo(
    () => detectSuspectedEvents(cityHotels, ahead, rateIndex, holidays, events),
    [cityHotels, ahead, rateIndex, holidays, events],
  );
  const cells = useMemo(() => {
    const map: Record<string, CalendarCell> = {};
    for (let d = 1; d <= daysInMonth(month); d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const day = cityDay(cityHotels, date, rateIndex, baseline);
      map[date] = {
        date,
        price: day.median !== null ? formatBRL(Math.round(day.median)).replace(/^R\$ /, '').replace(/,\d{2}$/, '') : null,
        level: day.level,
        info: dateInfo(date, activeCity, holidays, events),
        past: date < today,
        suspected: suspected.some((x) => x.date === date),
      };
    }
    return map;
  }, [month, cityHotels, rateIndex, baseline, activeCity, holidays, events, today, suspected]);



  if (loading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" message={error} />;
  if (!hotels.length) {
    return <StateView kind="empty" message="Cadastre hotéis ou carregue os dados de exemplo na aba Conta para ver o calendário." />;
  }

  const sel = cityDay(cityHotels, selected, rateIndex, baseline);
  const selInfo = dateInfo(selected, activeCity, holidays, events);
  const comparable = selected >= today && selected <= addDays(today, 29);

  const monthHolidays = [...holidays.entries()]
    .filter(([date]) => monthOf(date) === month)
    .map(([date, name]) => ({ id: `nacional-${date}`, date, name, label: 'Feriado nacional', removable: false }));
  const monthEvents = events
    .filter((e) => e.kind !== 'descartado' && monthOf(e.date) === month && (e.city === '' || e.city === activeCity))
    .map((e) => ({
      id: e.id,
      date: e.date,
      name: e.name,
      label: `${e.kind === 'feriado' ? 'Feriado local' : 'Evento'}${e.city ? '' : ' · toda a rede'}`,
      removable: true,
    }));
  const monthList = [...monthHolidays, ...monthEvents].sort((a, b) => a.date.localeCompare(b.date));

  // Ao trocar de mês, o dia selecionado acompanha: hoje no mês atual, senão o dia 1.
  function changeMonth(next: string) {
    setMonth(next);
    selectDay(next === monthOf(today) ? today : `${next}-01`);
  }

  function selectDay(date: string) {
    setSelected(date);
    setFeedback(null);
    setFormError(null);
  }

  async function handleAddEvent() {
    setFeedback(null);
    const values: EventFormValues = {
      name: form.name,
      kind: form.kind,
      city: form.scope === 'rede' ? '' : activeCity,
      date: selected,
    };
    const validation = validateEventForm(values, events);
    setFormError(validation);
    if (validation) {
      hapticError();
      return;
    }
    setSaving(true);
    try {
      await addCalendarEvent(values, user?.email ?? undefined);
      hapticSuccess();
      setForm((f) => ({ ...f, name: '' }));
      setFeedback({ kind: 'success', message: `${values.kind === 'feriado' ? 'Feriado' : 'Evento'} cadastrado em ${formatKey(selected)}.` });
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(eventId: string, name: string) {
    const ok = await confirmAction(`Remover "${name}"?`, 'A data deixa de contar como evento nas sugestões de preço.', 'Remover');
    if (!ok) return;
    try {
      await deleteCalendarEvent(eventId);
      hapticSuccess();
      setFeedback({ kind: 'success', message: `"${name}" removido do calendário.` });
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    }
  }

  async function handleDismiss(date: string) {
    try {
      await dismissSuspectedDate(date, activeCity, user?.email ?? undefined);
      hapticSuccess();
      setFeedback({ kind: 'success', message: `${formatKey(date)} marcado como "não é evento".` });
    } catch (e) {
      hapticError();
      setFeedback({ kind: 'error', message: firestoreErrorMessage(e) });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PageHeader
        title="Calendário de sazonalidade"
        subtitle="Cores como nos calendários de passagens: verde quando o mercado está mais barato, vermelho quando está mais caro. Toque num dia."
        right={<Chips label="Localização" scroll={!wide} value={activeCity} onChange={setCity} options={cities.map((c) => ({ value: c, label: c }))} />}
      />

      <View style={[styles.columns, !wide && styles.stacked]}>
      <Card style={[styles.main, !wide && styles.stackedItem]}>
        <CalendarMonth
          month={month}
          cells={cells}
          selected={selected}
          onSelect={selectDay}
          onChangeMonth={changeMonth}
          minMonth={monthOf(today)}
          maxMonth={monthOf(addDays(today, MAX_STAY_DAYS_AHEAD))}
        />
        {month < monthOf(today) || month > monthOf(addDays(today, MAX_STAY_DAYS_AHEAD)) ? (
          <AppText variant="caption" muted>
            Preços disponíveis do início do mês atual até {formatKey(addDays(today, MAX_STAY_DAYS_AHEAD))}. Feriados e eventos aparecem em qualquer mês.
          </AppText>
        ) : null}
      </Card>

      <View style={[styles.aside, !wide && styles.stackedItem]}>
      <Card emphasis eyebrow="Dia selecionado" title={formatKeyWithWeekday(selected)}>
        <DateTypeTag info={selInfo} withName />
        <View style={styles.stats}>
          <Stat label="Mediana do mercado" value={sel.median !== null ? formatBRL(sel.median) : '—'} />
          <Stat label="Sua diária média" value={sel.ownAvg !== null ? formatBRL(sel.ownAvg) : '—'} color={colors.primary} />
          <Stat label="Concorrentes esgotados" value={`${sel.soldOut} de ${sel.competitorCount}`} />
          <Stat label="Nível de demanda" value={sel.level !== null ? DEMAND_LABELS[sel.level] : 'Sem dados'} />
        </View>
        {comparable && cityHotels.length > 0 && (
          <View style={styles.links}>
            <AppText variant="label">Abrir o comparativo desta data:</AppText>
            {cityHotels.map((h) => (
              <Button
                key={h.id}
                title={h.own.name}
                variant="secondary"
                onPress={() => router.push({ pathname: '/comparativo/[id]', params: { id: h.id, data: selected } })}
              />
            ))}
          </View>
        )}
      </Card>

      {feedback && <Banner kind={feedback.kind} message={feedback.message} />}

      {suspected.length > 0 && (
        <Card tone="event" title="Possível evento detectado" subtitle={`Datas comuns em que concorrentes da localização subiram mais de ${EVENT_RISE_PCT}% ou esgotaram.`}>
          {suspected.slice(0, 3).map((s) => (
            <View key={s.date} style={[styles.suspect, { borderColor: colors.event }]}>
              <AppText variant="label">{formatKeyWithWeekday(s.date)}</AppText>
              <AppText variant="body">
                {s.flagged} de {s.total} concorrentes subiram ou esgotaram ({s.soldOut} esgotados), sem feriado cadastrado.
              </AppText>
              <View style={styles.actions}>
                <View style={styles.action}>
                  <Button title="Cadastrar evento" onPress={() => selectDay(s.date)} />
                </View>
                <View style={styles.action}>
                  <Button title="Não é evento" variant="secondary" onPress={() => handleDismiss(s.date)} />
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}

      {selected < today ? (
        <Card title={`${formatKeyShort(selected)} já passou`} subtitle="Eventos e feriados locais só podem ser cadastrados para hoje ou datas futuras. Escolha outro dia no calendário." />
      ) : (
      <Card title={`Cadastrar evento ou feriado em ${formatKeyShort(selected)}`} subtitle="Congressos, shows, feiras e feriados estaduais ou municipais entram nas sugestões de preço.">
        <TextField
          label="Nome"
          value={form.name}
          maxLength={MAX_EVENT_NAME}
          onChangeText={(name) => {
            setForm((f) => ({ ...f, name }));
            if (formError) setFormError(null);
          }}
          error={formError ?? undefined}
          placeholder="Ex.: congresso, show, feira"
          autoCapitalize="sentences"
          editable={!saving}
          returnKeyType="done"
          onSubmitEditing={handleAddEvent}
        />
        <AppText variant="label">Tipo</AppText>
        <SegmentedFilter
          value={form.kind}
          onChange={(kind) => setForm((f) => ({ ...f, kind }))}
          options={[
            { value: 'evento', label: 'Evento' },
            { value: 'feriado', label: 'Feriado local' },
          ]}
        />
        <AppText variant="label">Vale para</AppText>
        <SegmentedFilter
          value={form.scope}
          onChange={(scope) => setForm((f) => ({ ...f, scope }))}
          options={[
            { value: 'praca', label: activeCity },
            { value: 'rede', label: 'Toda a rede' },
          ]}
        />
        <Button title="Cadastrar" onPress={handleAddEvent} loading={saving} />
      </Card>
      )}

      <Card title="Feriados e eventos do mês">
        {monthList.length === 0 ? (
          <AppText variant="body" muted>
            Nenhum feriado ou evento neste mês.
          </AppText>
        ) : (
          monthList.map((item) => (
            <View key={item.id} style={[styles.listRow, { borderColor: colors.border }]}>
              <View style={styles.flex}>
                <AppText variant="label">
                  {formatKeyShort(item.date)} · {item.name}
                </AppText>
                <AppText variant="caption" muted>
                  {item.label}
                </AppText>
              </View>
              {item.removable && <Button title="Remover" variant="link" onPress={() => handleRemove(item.id, item.name)} />}
            </View>
          ))
        )}
      </Card>
      </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="title" color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg + 4, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
  // Celular/tela estreita: colunas uma embaixo da outra, em largura total (no iPhone o flexWrap espremia lado a lado).
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  stackedItem: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, width: '100%' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.lg + 4 },
  main: { flexGrow: 999, flexShrink: 1, flexBasis: 640, minWidth: 0 },
  aside: { flexGrow: 1, flexShrink: 1, flexBasis: 340, minWidth: 0, gap: spacing.lg },
  block: { gap: spacing.xs },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, flexBasis: 130, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  links: { gap: spacing.sm, marginTop: spacing.sm },
  suspect: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  action: { flexGrow: 1, flexBasis: 140 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.sm },
});
