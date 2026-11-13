import { useReducer, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { firestoreErrorMessage } from '@/lib/firestore';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  hasFormErrors,
  hotelFormReducer,
  initialHotelFormState,
  validateHotelForm,
  type HotelFormValues,
  type Slot,
} from '@/lib/hotelForm';
import { layout, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Banner } from './Banner';
import { Button } from './Button';
import { TextField } from './TextField';

type Props = {
  initialValues?: HotelFormValues;
  submitLabel: string;
  successMessage: string;
  /** Grava no Firestore. Se lançar erro, a mensagem aparece no formulário. */
  onSubmit: (values: HotelFormValues) => Promise<void>;
  /** Botões exibidos depois de salvar (ex.: "Ver hotel"). */
  successActions?: ReactNode;
};

/**
 * Formulário de hotel (cadastro e edição): seu hotel + 3 concorrentes, cada um com nome e link opcional.
 * Todo o estado (valores, erros, salvando, sucesso, erro do servidor) fica num único useReducer.
 */
export function HotelForm({ initialValues, submitLabel, successMessage, onSubmit, successActions }: Props) {
  const { colors } = useTheme();
  const [state, dispatch] = useReducer(hotelFormReducer, initialValues, initialHotelFormState);
  const { values, errors, saving, saveError, saved } = state;

  async function handleSubmit() {
    dispatch({ type: 'submit' });
    if (hasFormErrors(validateHotelForm(values))) {
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

  const block = (slot: Slot, title: string) => {
    const fields = slot === 'own' ? values.own : values.competitors[slot];
    return (
      <View key={String(slot)} style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="title">{title}</AppText>
        <TextField
          label="Nome"
          value={fields.name}
          onChangeText={(value) => dispatch({ type: 'change', slot, field: 'name', value })}
          error={errors[`${slot}.name`]}
          placeholder={slot === 'own' ? 'Ex.: Hotel Litoral Centro' : 'Ex.: Hotel Atlântico Plaza'}
          autoCapitalize="words"
          editable={!saving}
        />
        <TextField
          label="Link no Booking.com (opcional)"
          value={fields.url}
          onChangeText={(value) => dispatch({ type: 'change', slot, field: 'url', value })}
          error={errors[`${slot}.url`]}
          placeholder="https://www.booking.com/hotel/br/..."
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {block('own', 'Seu hotel')}
        {[0, 1, 2].map((i) => block(i as Slot, `Concorrente ${i + 1}`))}

        {hasFormErrors(errors) && <Banner kind="error" message="Corrija os campos destacados para salvar." />}
        {saveError && <Banner kind="error" message={saveError} />}
        {saved && <Banner kind="success" message={successMessage} />}

        {saved && successActions ? (
          successActions
        ) : (
          <Button title={submitLabel} onPress={handleSubmit} loading={saving} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: layout.formMaxWidth, width: '100%', alignSelf: 'center' },
  block: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
});
