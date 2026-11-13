import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';

import { formatDateTime } from '@/lib/format';
import { hapticSelection } from '@/lib/haptics';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

export type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  /** Data mais recente permitida (ex.: agora, para não registrar leitura no futuro). */
  maximumDate?: Date;
  error?: string;
  disabled?: boolean;
};

/**
 * Campo de data e hora com o seletor nativo do aparelho (recurso nativo).
 * - Android: abre os diálogos do sistema, um para a data e outro para a hora.
 * - iPhone: mostra o seletor compacto do iOS na própria tela.
 * No navegador o arquivo usado é o DateTimeField.web.tsx.
 */
export function DateTimeField({ label, value, onChange, maximumDate, error, disabled }: DateTimeFieldProps) {
  const { colors, isDark } = useTheme();

  function handlePicked(picked: Date | undefined) {
    if (!picked) return;
    hapticSelection();
    onChange(picked);
  }

  function openAndroid(mode: 'date' | 'time') {
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      maximumDate: mode === 'date' ? maximumDate : undefined,
      onValueChange: (_event, picked) => handlePicked(picked),
    });
  }

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="datetime"
          display="compact"
          locale="pt-BR"
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={colors.primary}
          maximumDate={maximumDate}
          disabled={disabled}
          onValueChange={(_event, picked) => handlePicked(picked)}
          style={styles.iosPicker}
        />
      ) : (
        <>
          <AppText variant="title" accessibilityLabel={`Leitura em ${formatDateTime(value)}`}>
            {formatDateTime(value)}
          </AppText>
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button title="Alterar data" variant="secondary" onPress={() => openAndroid('date')} disabled={disabled} />
            </View>
            <View style={styles.button}>
              <Button title="Alterar hora" variant="secondary" onPress={() => openAndroid('time')} disabled={disabled} />
            </View>
          </View>
        </>
      )}

      {error && (
        <AppText variant="caption" color={colors.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
  iosPicker: { alignSelf: 'flex-start' },
});
