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

/**
 * Versão do campo de data e hora para o navegador.
 * O seletor nativo (DateTimePicker) só existe em Android e iPhone, então na web
 * usamos o campo de data e hora do próprio navegador.
 */
export function DateTimeField({ label, value, onChange, maximumDate, error, disabled }: DateTimeFieldProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <input
        type="datetime-local"
        aria-label={label}
        value={toInputValue(value)}
        max={maximumDate ? toInputValue(maximumDate) : undefined}
        disabled={disabled}
        onChange={(event) => {
          const picked = new Date(event.target.value);
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
