import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ChoiceList } from '@/components/ChoiceList';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { StateView } from '@/components/StateView';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { competitorKeyOf, hotelsLinkedTo, registerReading } from '@/data/hotelsRepository';
import { useHotels } from '@/data/useHotels';
import { useHotelsData } from '@/context/HotelsContext';
import { rateFor, type RateIndex } from '@/lib/market';
import { addDays, formatKey, keyToDate, todayKey } from '@/lib/dates';
import { dayKeyBrt, formatBRL, formatDateTime, formatTime } from '@/lib/format';
import { firestoreErrorMessage } from '@/lib/firestore';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  MAX_STAY_DAYS_AHEAD,
  parsePriceInput,
  validateReadingDate,
  validateReadingPrice,
  validateStayDate,
  type ReadingStatus,
} from '@/lib/readings';
import { layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Property } from '@/types';

const STATUS_LABELS: Record<ReadingStatus, string> = { ok: 'Com preço', sold_out: 'Esgotado', failed: 'Falha' };

/**
 * Texto curto do último valor conhecido para a noite escolhida, ao lado de cada propriedade.
 * Hoje usa o "latest" do hotel; outras noites usam o índice de tarifas por data.
 */
function currentLabel(p: Property, stayDate: string, isToday: boolean, index: RateIndex): string {
  const rate = isToday ? p.latest : rateFor(index, p.id, stayDate);
  const when = (iso: string | null | undefined) =>
    iso ? (dayKeyBrt(new Date(iso)) === todayKey(new Date()) ? ` às ${formatTime(iso)}` : ` em ${formatDateTime(iso)}`) : '';
  if (!rate) return `Sem leitura para ${formatKey(stayDate)}`;
  if (rate.status === 'sold_out') return `Esgotado${when(rate.checkedAt)}`;
  if (rate.price === null) return `Sem leitura para ${formatKey(stayDate)}`;
  return `Último: ${formatBRL(rate.price)}${when(rate.checkedAt)}`;
}

/**
 * Registrar leitura de preço de uma propriedade do hotel (o próprio ou um concorrente).
 * Estados: propriedade escolhida, noite da estadia, status, preço digitado, data e hora da leitura,
 * erros de validação, salvando, sucesso e erro do servidor.
 * A noite de hoje atualiza o painel; noites futuras alimentam o comparativo por data e o calendário.
 * Recursos nativos: seletor de data e hora do aparelho e resposta tátil (vibração).
 */
export default function RegistrarLeituraScreen() {
  const { id, propriedade, data } = useLocalSearchParams<{ id: string; propriedade?: string; data?: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { hotels, loading, error } = useHotels();
  const { rateIndex } = useHotelsData();

  const [propertyId, setPropertyId] = useState<string | null>(propriedade ?? null);
  const [status, setStatus] = useState<ReadingStatus>('ok');
  const [priceText, setPriceText] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [checkedAtDate, setCheckedAtDate] = useState(() => new Date());
  const [dateError, setDateError] = useState<string | null>(null);
  const [stayDate, setStayDate] = useState(() => {
    const today = todayKey(new Date());
    return data && data >= today ? data : today;
  });
  const [stayError, setStayError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (loading) return <StateView kind="loading" message="Carregando hotel..." />;
  if (error) return <StateView kind="error" message={error} />;

  const hotel = hotels.find((h) => h.id === id);
  if (!hotel) return <StateView kind="error" message="Hotel não encontrado. Ele pode ter sido removido." />;

  const properties = [hotel.own, ...hotel.competitors];
  const selectedId = propertyId ?? hotel.own.id;
  const selected = properties.find((p) => p.id === selectedId) ?? hotel.own;

  function resetFeedback() {
    setSuccess(null);
    setSaveError(null);
  }

  async function handleSave() {
    setSubmitted(true);
    resetFeedback();
    const validation = validateReadingPrice(status, priceText);
    const dateValidation = validateReadingDate(checkedAtDate, new Date());
    const today = todayKey(new Date());
    const stayValidation = validateStayDate(stayDate, today, addDays(today, MAX_STAY_DAYS_AHEAD));
    setPriceError(validation);
    setDateError(dateValidation);
    setStayError(stayValidation);
    if (validation || dateValidation || stayValidation) {
      hapticError();
      return;
    }

    // Data e hora escolhidas no seletor nativo (por padrão, o momento em que a tela abriu).
    const checkedAt = checkedAtDate.toISOString();
    const price = status === 'ok' ? parsePriceInput(priceText) : null;

    setSaving(true);
    try {
      // Concorrente vinculado a outros hotéis da rede: a mesma leitura vale para todos os vínculos.
      const linked =
        selected.id === hotel!.own.id ? [] : hotelsLinkedTo(hotels, competitorKeyOf(selected)).map((h) => h.id);
      await registerReading(hotel!.id, selected.id, { status, price, checkedAt, stayDate }, user?.uid, linked);
      setSuccess(
        `Leitura registrada: ${selected.name} — ${price !== null ? formatBRL(price) : STATUS_LABELS[status].toLowerCase()} para a noite de ${formatKey(stayDate)} (consultado em ${formatDateTime(checkedAt)}).`,
      );
      hapticSuccess();
      setPriceText('');
      setSubmitted(false);
    } catch (e) {
      setSaveError(firestoreErrorMessage(e));
      hapticError();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Registrar leitura' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title">{hotel.own.name}</AppText>

        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ChoiceList
            label="De qual hotel é o preço?"
            value={selected.id}
            onChange={(value) => {
              setPropertyId(value);
              resetFeedback();
            }}
            disabled={saving}
            options={properties.map((p, i) => ({
              value: p.id,
              label: i === 0 ? `${p.name} (seu hotel)` : p.name,
              detail: currentLabel(p, stayDate, stayDate === todayKey(new Date()), rateIndex),
            }))}
          />
        </View>

        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DateTimeField
            label="Noite da estadia"
            mode="date"
            value={keyToDate(stayDate)}
            minimumDate={new Date()}
            maximumDate={keyToDate(addDays(todayKey(new Date()), MAX_STAY_DAYS_AHEAD))}
            onChange={(value) => {
              const key = dayKeyBrt(value);
              const today = todayKey(new Date());
              setStayDate(key);
              resetFeedback();
              setStayError(validateStayDate(key, today, addDays(today, MAX_STAY_DAYS_AHEAD)));
            }}
            error={stayError ?? undefined}
            disabled={saving}
          />
          <AppText variant="caption" muted>
            {stayDate === todayKey(new Date())
              ? 'Noite de hoje: o preço aparece no painel e no gráfico de 7 dias.'
              : stayDate > todayKey(new Date())
                ? 'Noite futura: o preço entra no comparativo por data, no calendário e nos alertas.'
                : `Escolha hoje ou uma noite até ${MAX_STAY_DAYS_AHEAD} dias à frente.`}
          </AppText>
        </View>

        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText variant="label">Situação</AppText>
          <SegmentedFilter
            value={status}
            onChange={(value) => {
              setStatus(value);
              resetFeedback();
              if (submitted) setPriceError(validateReadingPrice(value, priceText));
            }}
            options={(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((value) => ({
              value,
              label: STATUS_LABELS[value],
            }))}
          />

          {status === 'ok' ? (
            <TextField
              label="Preço da diária (R$)"
              value={priceText}
              maxLength={15}
              onChangeText={(text) => {
                setPriceText(text);
                resetFeedback();
                if (submitted) setPriceError(validateReadingPrice(status, text));
              }}
              error={priceError ?? undefined}
              placeholder="Ex.: 389,90"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              editable={!saving}
            />
          ) : (
            <AppText variant="caption" muted>
              {status === 'sold_out'
                ? 'Sem quartos disponíveis para essa noite. A leitura fica registrada sem preço.'
                : 'Não foi possível ver o preço. O último preço válido é mantido e aparece como desatualizado.'}
            </AppText>
          )}
        </View>

        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DateTimeField
            label="Quando o preço foi consultado"
            value={checkedAtDate}
            maximumDate={new Date()}
            onChange={(value) => {
              setCheckedAtDate(value);
              resetFeedback();
              setDateError(validateReadingDate(value, new Date()));
            }}
            error={dateError ?? undefined}
            disabled={saving}
          />
          <Button
            title="Usar a hora de agora"
            variant="link"
            onPress={() => {
              setCheckedAtDate(new Date());
              setDateError(null);
              resetFeedback();
            }}
            disabled={saving}
          />
        </View>

        {saveError && <Banner kind="error" message={saveError} />}
        {success && <Banner kind="success" message={success} />}

        <Button title="Salvar leitura" onPress={handleSave} loading={saving} />
        {success && (
          <Button
            title="Voltar"
            variant="secondary"
            onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/hotel/[id]', params: { id: hotel.id } }))}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: layout.formMaxWidth, width: '100%', alignSelf: 'center' },
  block: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg + 4, gap: spacing.md },
});

