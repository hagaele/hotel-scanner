import { StyleSheet, View } from 'react-native';

import { fonts, fontSize, radius, spacing, touchTarget } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import type { DateTimeFieldProps } from './DateTimeField';

/** Date -> "2026-11-13T14:00", no horário local, que é o formato do campo do navegador. */
function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Date -> "2026-11-13", no horário local, que é o formato do campo de data do navegador. */
function toDateValue(date: Date): string {
  return toInputValue(date).slice(0, 10);
}

/**
 * Versão do campo de data e hora para o navegador.
 * O seletor nativo (DateTimePicker) só existe em Android e iPhone, então na web
 * usamos o campo de data e hora do próprio navegador.
 */
export function DateTimeField({ label, value, onChange, maximumDate, minimumDate, mode = 'datetime', error, disabled }: DateTimeFieldProps) {
  const toValue = mode === 'date' ? toDateValue : toInputValue;
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <input
        type={mode === 'date' ? 'date' : 'datetime-local'}
        aria-label={label}
        value={toValue(value)}
        max={maximumDate ? toValue(maximumDate) : undefined}
        min={minimumDate ? toValue(minimumDate) : undefined}
        disabled={disabled}
        onChange={(event) => {
          // Só a data: meio-dia, para o dia não mudar por causa do fuso.
          const picked = new Date(mode === 'date' ? `${event.target.value}T12:00:00` : event.target.value);
          if (!Number.isNaN(picked.getTime())) onChange(picked);
        }}
        style={{
          minHeight: touchTarget,
          padding: spacing.md,
          borderRadius: radius.sm,
          border: `1px solid ${error ? colors.error : colors.border}`,
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: fontSize.body,
          colorScheme: isDark ? 'dark' : 'light',
          boxSizing: 'border-box',
          width: '100%',
        }}
      />
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
});
