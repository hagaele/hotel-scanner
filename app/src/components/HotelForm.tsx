import { useCallback, useReducer, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { firestoreErrorMessage } from '@/lib/firestore';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  hasFormErrors,
  hotelFormReducer,
  initialHotelFormState,
  isHotelFull,
  MAX_COMPETITORS,
  MAX_NAME_LENGTH,
  MAX_URL_LENGTH,
  validateHotelForm,
  type HotelFormContext,
  type HotelFormValues,
  type PropertyKind,
} from '@/lib/hotelForm';
import { UF_NAMES, UFS } from '@/lib/ufs';
import { layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Banner } from './Banner';
import { Button } from './Button';
import { Chips } from './Chips';
import { CityField } from './CityField';
import { SearchSelect } from './SearchSelect';
import { SegmentedFilter } from './SegmentedFilter';
import { TextField } from './TextField';

type Props = {
  initialValues: HotelFormValues;
  context: HotelFormContext;
  /** No cadastro o usuário escolhe se é hotel dele ou concorrente; na edição o tipo fica fixo. */
  canChangeKind: boolean;
  submitLabel: (kind: PropertyKind) => string;
  successMessage: (kind: PropertyKind) => string;
  /** Grava no Firestore. Se lançar erro, a mensagem aparece no formulário. */
  onSubmit: (values: HotelFormValues) => Promise<void>;
  /** Botões exibidos depois de salvar (ex.: "Ver hotel"). */
  successActions?: (values: HotelFormValues) => ReactNode;
};

const UF_OPTIONS = UFS.map((uf) => ({ value: uf as string, label: `${UF_NAMES[uf]} (${uf})`, keywords: [uf, UF_NAMES[uf]] }));

const KIND_OPTIONS: { value: PropertyKind; label: string }[] = [
  { value: 'own', label: 'Hotel da minha rede' },
  { value: 'competitor', label: 'Concorrente' },
];

/**
 * Formulário de cadastro e edição, um hotel por vez.
 * - Hotel da rede: nome, link, localização e preço-piso usado nas sugestões de preço.
 * - Concorrente: nome, link e os hotéis da rede com que ele concorre (um ou vários, até 5 concorrentes por hotel).
 * Todo o estado (valores, erros, salvando, sucesso, erro do servidor) fica num único useReducer.
 */
export function HotelForm({ initialValues, context, canChangeKind, submitLabel, successMessage, onSubmit, successActions }: Props) {
  const { colors } = useTheme();
  const [state, dispatch] = useReducer(hotelFormReducer, { values: initialValues, context }, initialHotelFormState);
  const { values, errors, saving, saveError, saved } = state;
  const isOwn = values.kind === 'own';
  const noNetwork = !isOwn && context.ownHotels.length === 0;

  async function handleSubmit() {
    dispatch({ type: 'submit' });
    if (hasFormErrors(validateHotelForm(values, state.context))) {
      hapticError();
      return;
    }
    dispatch({ type: 'saving' });
    try {
      await onSubmit(values);
      dispatch({ type: 'saved' });
      hapticSuccess();
    } catch (e) {
      dispatch({ type: 'saveFailed', message: firestoreErrorMessage(e) });
      hapticError();
    }
  }

  // Estável entre renderizações: o CityField usa num efeito (seleção automática quando a UF tem uma cidade só).
  const changeUf = useCallback((value: string) => dispatch({ type: 'change', field: 'uf', value }), []);
  const changeCity = useCallback((value: string) => dispatch({ type: 'change', field: 'city', value }), []);

  const blockStyle = [styles.block, { backgroundColor: colors.card, borderColor: colors.border }];
  // O contador inclui este concorrente quando o hotel está marcado (na edição, a lista vem sem ele).
  const hotelOptions = context.ownHotels.map((h) => ({
    value: h.id,
    label: `${h.name} (${h.competitorNames.length + (values.hotelIds.includes(h.id) ? 1 : 0)}/${MAX_COMPETITORS})`,
  }));
  const fullIds = context.ownHotels.filter((h) => isHotelFull(h, context)).map((h) => h.id);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {canChangeKind && (
          <View style={blockStyle}>
            <AppText variant="title">O que você vai cadastrar?</AppText>
            <SegmentedFilter
              options={KIND_OPTIONS}
              value={values.kind}
              onChange={(kind) => dispatch({ type: 'setKind', kind })}
            />
            <AppText variant="caption" muted>
              {isOwn
                ? 'Um hotel da sua rede. Depois você vincula os concorrentes dele, um por um.'
                : 'Um hotel concorrente. Escolha com quais hotéis da sua rede ele concorre.'}
            </AppText>
          </View>
        )}

        <View style={blockStyle}>
          <AppText variant="title">{isOwn ? 'Hotel da rede' : 'Concorrente'}</AppText>
          <TextField
            label="Nome"
            value={values.name}
            onChangeText={(value) => dispatch({ type: 'change', field: 'name', value })}
            error={errors.name}
            placeholder={isOwn ? 'Ex.: Hotel Cerrado Esplanada' : 'Ex.: Hotel Eixo Monumental'}
            autoCapitalize="words"
            maxLength={MAX_NAME_LENGTH}
            editable={!saving}
          />
          <TextField
            label="Link no Booking.com (opcional)"
            value={values.url}
            onChangeText={(value) => dispatch({ type: 'change', field: 'url', value })}
            error={errors.url}
            placeholder="https://www.booking.com/hotel/br/..."
            keyboardType="url"
            maxLength={MAX_URL_LENGTH}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />
        </View>

        {isOwn ? (
          <View style={blockStyle}>
            <AppText variant="title">Localização e preço-piso</AppText>
            <SearchSelect
              label="UF"
              options={UF_OPTIONS}
              value={values.uf}
              onChange={changeUf}
              placeholder="Digite a sigla ou o nome, ex.: GO ou Goiás"
              error={errors.uf}
              editable={!saving}
              emptyText="Nenhuma UF com esse nome."
            />
            <CityField
              uf={values.uf}
              value={values.city}
              onChange={changeCity}
              error={errors.city}
              editable={!saving}
            />
            <TextField
              label="Preço-piso da diária (R$, opcional)"
              value={values.floorPrice}
              onChangeText={(value) => dispatch({ type: 'change', field: 'floorPrice', value })}
              error={errors.floorPrice}
              placeholder="Ex.: 250"
              keyboardType="decimal-pad"
              editable={!saving}
            />
            <AppText variant="caption" muted>
              Nenhuma sugestão de preço fica abaixo do preço-piso.
            </AppText>
          </View>
        ) : (
          <View style={blockStyle}>
            <AppText variant="title">Concorre com</AppText>
            {noNetwork ? (
              <AppText variant="label" muted>
                Cadastre primeiro um hotel da sua rede. O concorrente precisa estar vinculado a pelo menos um deles.
              </AppText>
            ) : (
              <>
                <Chips
                  label="Hotéis da rede com que ele concorre"
                  options={hotelOptions}
                  values={values.hotelIds}
                  disabledValues={fullIds}
                  onChange={(hotelId) => dispatch({ type: 'toggleHotel', hotelId })}
                />
                {errors.hotelIds && (
                  <AppText variant="caption" color={colors.error}>
                    {errors.hotelIds}
                  </AppText>
                )}
                <AppText variant="caption" muted>
                  Até {MAX_COMPETITORS} concorrentes por hotel. Marcando mais de um hotel, a mesma leitura de preço vale para
                  todos eles.
                </AppText>
              </>
            )}
          </View>
        )}

        {hasFormErrors(errors) && <Banner kind="error" message="Corrija os campos destacados para salvar." />}
        {saveError && <Banner kind="error" message={saveError} />}
        {saved && <Banner kind="success" message={successMessage(values.kind)} />}

        {saved && successActions ? (
          successActions(values)
        ) : (
          <Button title={submitLabel(values.kind)} onPress={handleSubmit} loading={saving} disabled={noNetwork} />
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
